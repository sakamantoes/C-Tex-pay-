import crypto from "crypto";
import envConfig from "../config/constant.js";
import { Payment, WebhookEvent } from "../models/index.js";

/**
 * Xixapay Incoming Webhook
 *
 * Documented payload (from official docs):
 * {
 *   notification_status: "payment_successful",
 *   transaction_id: "...",
 *   amount_paid: 100,
 *   settlement_amount: 99.5,
 *   settlement_fee: 0.5,
 *   transaction_status: "success",
 *   sender: { name, account_number, bank },
 *   receiver: { name, account_number, bank },
 *   customer: { name, email, phone, customer_id },
 *   description: "...",
 *   timestamp: "2024-11-22T13:00:04.256092Z"
 * }
 *
 * Signature header: `xixapay`
 * Algorithm: HMAC-SHA256 of raw body with the shared secret.
 *
 * We NEVER trust the webhook as proof of payment. It only prompts a
 * reconciliation/status update using data we trust (see controller flow).
 */

const SUPPORTED_NOTIFICATION_STATUSES = new Set([
  "payment_successful",
  "payment_failed",
]);

const SUPPORTED_TRANSACTION_STATUSES = new Set([
  "success",
  "failed",
  "pending",
]);

/**
 * Verify the xixapay signature header against the raw request body.
 */
function verifySignature(rawBody, signature) {
  if (!signature) return { valid: false, reason: "MISSING_SIGNATURE" };
  if (!envConfig.XIXAPAY_WEBHOOK_SECRET) {
    return { valid: false, reason: "MISSING_SECRET" };
  }
  if (typeof rawBody !== "string" || rawBody.length === 0) {
    return { valid: false, reason: "MISSING_RAW_BODY" };
  }
  if (!/^[0-9a-fA-F]{64}$/.test(signature)) {
    return { valid: false, reason: "MALFORMED_SIGNATURE" };
  }

  const expected = crypto
    .createHmac("sha256", envConfig.XIXAPAY_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  if (expectedBuf.length !== receivedBuf.length) {
    return { valid: false, reason: "LENGTH_MISMATCH" };
  }
  if (!crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: false, reason: "SIGNATURE_MISMATCH" };
  }

  return { valid: true };
}

/**
 * Derive a stable deduplication key for the event.
 */
function deriveEventKey(body) {
  if (body?.transaction_id) return `xixapay:tx:${body.transaction_id}`;
  const canonical = `${body?.notification_status || ""}|${body?.timestamp || ""}`;
  return `xixapay:hash:${crypto
    .createHash("sha256")
    .update(canonical)
    .digest("hex")}`;
}

/**
 * POST /api/v1/webhooks/xixapay
 */
export const handleXixapayWebhook = async (req, res) => {
  try {
    if (!req.rawBody || typeof req.rawBody !== "string") {
      console.warn("Xixapay webhook: raw body not captured");
      return res
        .status(400)
        .json({ success: false, message: "Invalid request body" });
    }

    const signature = req.headers["xixapay"];
    const sigResult = verifySignature(req.rawBody, signature);
    if (!sigResult.valid) {
      console.warn("Xixapay webhook: signature rejected", {
        reason: sigResult.reason,
      });
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature" });
    }

    const body = req.body || {};
    const notificationStatus = String(body.notification_status || "");
    const transactionStatus = String(body.transaction_status || "");

    if (
      !notificationStatus ||
      !transactionStatus ||
      !body.transaction_id
    ) {
      console.warn("Xixapay webhook: malformed payload");
      return res
        .status(400)
        .json({ success: false, message: "Malformed payload" });
    }

    if (!SUPPORTED_NOTIFICATION_STATUSES.has(notificationStatus)) {
      console.log("Xixapay webhook: unsupported notification, acknowledged", {
        notificationStatus,
      });
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    if (!SUPPORTED_TRANSACTION_STATUSES.has(transactionStatus)) {
      console.log("Xixapay webhook: unsupported tx status, acknowledged", {
        transactionStatus,
      });
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    const eventKey = deriveEventKey(body);

    let record;
    try {
      record = await WebhookEvent.create({
        provider: "XIXAPAY",
        eventType: notificationStatus,
        eventKey,
        payload: body,
        processedAt: new Date(),
      });
    } catch (err) {
      const isDup =
        err.name === "SequelizeUniqueConstraintError" ||
        err.parent?.code === "ER_DUP_ENTRY";
      if (isDup) {
        console.log("Xixapay webhook: duplicate event", { eventKey });
        return res
          .status(200)
          .json({ success: true, message: "Acknowledged (duplicate)" });
      }
      console.error("Xixapay webhook: event persistence failed", {
        errorName: err.name,
        errorMessage: err.message,
      });
      return res
        .status(500)
        .json({ success: false, message: "Unable to persist event" });
    }

    /*
     * Match the incoming transaction to the correct C-TEX payment using
     * the customer_id or by matching the payment reference we sent as
     * externalReference. Xixapay echoes back customer.email and
     * customer.customer_id.
     *
     * Until a status query endpoint is provided by Xixapay, we record the
     * event as received and hand off to the reconciliation pipeline.
     * This avoids marking a payment SUCCESS based on unverified webhook
     * data alone.
     */
    console.log("Xixapay webhook: recorded", {
      eventId: record.id,
      transactionId: body.transaction_id,
      transactionStatus,
      amount: body.amount_paid,
    });

    return res.status(200).json({ success: true, message: "Acknowledged" });
  } catch (error) {
    console.error("Xixapay webhook: unhandled error", {
      errorName: error.name,
      errorMessage: error.message,
    });
    return res
      .status(500)
      .json({ success: false, message: "Internal error" });
  }
};