import crypto from "crypto";
import envConfig from "../config/constant.js";
import { Payment, WebhookEvent } from "../models/index.js";
import { verifyPayment as verifyPaymentService } from "../service/payment.service.js";

/*
|--------------------------------------------------------------------------
| Signature verification (HMAC-SHA512, timing-safe)
|--------------------------------------------------------------------------
*/

function verifyMonnifySignature(rawBody, signature) {
  if (!signature) return false;
  if (!envConfig.MONNIFY_SECRET_KEY) return false;

  const expected = crypto
    .createHmac("sha512", envConfig.MONNIFY_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/*
|--------------------------------------------------------------------------
| Event key derivation
|--------------------------------------------------------------------------
| We dedupe on a stable identifier per event:
|   - SUCCESSFUL_TRANSACTION: transactionReference (unique per payment)
|   - Everything else: SHA-256 of (eventType + JSON(eventData))
|
| The key is scoped by provider in the DB unique index.
*/

function deriveEventKey(eventType, eventData) {
  if (
    eventType === "SUCCESSFUL_TRANSACTION" &&
    eventData?.transactionReference
  ) {
    return String(eventData.transactionReference);
  }
  const canonical = `${eventType}|${JSON.stringify(eventData || {})}`;
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/*
|--------------------------------------------------------------------------
| POST /api/v1/webhooks/monnify
|--------------------------------------------------------------------------
*/

export const handleMonnifyWebhook = async (req, res) => {
  try {
    /*
    |----------------------------------------------------------------------
    | Step 1 — Signature verification (production only)
    |----------------------------------------------------------------------
    */
    const isProduction = envConfig.NODE_ENV === "production";
    const signature = req.headers["monnify-signature"];

    if (isProduction) {
      if (!req.rawBody) {
        console.error("Monnify webhook: raw body not captured");
        return res
          .status(400)
          .json({ success: false, message: "Invalid request" });
      }
      if (!verifyMonnifySignature(req.rawBody, signature)) {
        console.warn("Monnify webhook: invalid signature");
        return res
          .status(401)
          .json({ success: false, message: "Invalid signature" });
      }
    }

    /*
    |----------------------------------------------------------------------
    | Step 2 — Payload validation
    |----------------------------------------------------------------------
    */
    const { eventType, eventData } = req.body || {};

    if (!eventType || !eventData) {
      console.warn("Monnify webhook: malformed payload");
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    console.log("Monnify webhook received", { eventType });

    /*
    |----------------------------------------------------------------------
    | Step 3 — Only process SUCCESSFUL_TRANSACTION
    |----------------------------------------------------------------------
    | Other event types (settlements, refunds, etc.) are acknowledged
    | without processing.
    */
    if (eventType !== "SUCCESSFUL_TRANSACTION") {
      console.log("Monnify webhook: ignoring event", { eventType });
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    /*
    |----------------------------------------------------------------------
    | Step 4 — Deduplication
    |----------------------------------------------------------------------
    | Attempt to insert a webhook_events row. If it already exists,
    | this is a retry — acknowledge and return.
    */
    const eventKey = deriveEventKey(eventType, eventData);

    try {
      await WebhookEvent.create({
        provider: "MONNIFY",
        eventType,
        eventKey,
        payload: eventData,
        processedAt: new Date(),
      });
    } catch (err) {
      if (
        err.name === "SequelizeUniqueConstraintError" ||
        err.parent?.code === "ER_DUP_ENTRY"
      ) {
        console.log("Monnify webhook: duplicate event, skipping", {
          eventKey,
        });
        return res
          .status(200)
          .json({ success: true, message: "Acknowledged (duplicate)" });
      }
      throw err;
    }

    /*
    |----------------------------------------------------------------------
    | Step 5 — Identify C-TEX payment
    |----------------------------------------------------------------------
    */
    const paymentReference = eventData.paymentReference;
    if (!paymentReference) {
      console.warn("Monnify webhook: missing paymentReference");
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    const payment = await Payment.findOne({ where: { paymentReference } });
    if (!payment) {
      console.warn("Monnify webhook: payment not found", { paymentReference });
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    /*
    |----------------------------------------------------------------------
    | Step 6 — Verify with provider (never trust webhook alone)
    |----------------------------------------------------------------------
    */
    try {
      await verifyPaymentService({
        merchantId: payment.merchantId,
        paymentReference: payment.paymentReference,
      });
      console.log("Monnify webhook: payment verified", { paymentReference });
    } catch (verifyError) {
      /*
       * Non-fatal cases (amount mismatch, provider timeout, etc.):
       * log and ack. Payment stays in its current state; a future
       * reconciliation job or manual retry can re-verify.
       */
      console.error("Monnify webhook: verification failed", {
        paymentReference,
        errorCode: verifyError.code,
        message: verifyError.message,
      });
    }

    return res.status(200).json({ success: true, message: "Acknowledged" });
  } catch (error) {
    console.error("Monnify webhook: unhandled error", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(200).json({ success: true, message: "Acknowledged" });
  }
};