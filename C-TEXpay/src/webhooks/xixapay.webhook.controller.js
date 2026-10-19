import crypto from "crypto";
import envConfig from "../config/constant.js";
import {
  Payment,
  PaymentStatusHistory,
  WebhookEvent,
} from "../models/index.js";
import sequelize from "../config/database.js";
import { postPaymentSettlement } from "../service/ledger.service.js";
import {
  createMerchantWebhookEventForSuccessfulPayment,
  processMerchantWebhookDelivery,
} from "../service/merchantWebhook.service.js";
import { enqueueSuccessfulPaymentNotifications } from "../service/merchantNotification.service.js";

/* =========================================================
 * SIGNATURE VERIFICATION
 * ======================================================= */

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

/* =========================================================
 * DEDUPLICATION KEY
 * ======================================================= */

function deriveEventKey(body) {
  if (body?.transaction_id) return `xixapay:tx:${body.transaction_id}`;
  const canonical = `${body?.notification_status || ""}|${body?.timestamp || ""}`;
  return `xixapay:hash:${crypto
    .createHash("sha256")
    .update(canonical)
    .digest("hex")}`;
}

/* =========================================================
 * MATCH WEBHOOK TO PAYMENT
 * ======================================================= */

/**
 * Find the C-TEX payment this webhook refers to.
 *
 * Xixapay does not return a paymentReference in the webhook. We must
 * match using metadata that was sent at init time. The `externalReference`
 * we sent to Xixapay was the C-TEX paymentReference, and Xixapay echoes
 * it back through the transaction record — but the webhook payload
 * doesn't include it directly.
 *
 * Primary match: `receiver.account_number` against
 *   `payment.paymentInstructions.accountNumber`.
 *
 * Secondary match: `customer.email` against the customer record.
 *
 * Fallback: any PENDING Xixapay payment with matching amount, scoped to
 *   a narrow time window. This is a last resort.
 */
async function findPaymentForWebhook(body, transaction) {
  const accountNumber = body?.receiver?.account_number;
  const amountPaidNaira = Number(body?.amount_paid);

  if (!accountNumber) {
    return null;
  }

  // Postgres/MariaDB JSON query — paymentInstructions is JSON, but
  // Sequelize stores it as text on MariaDB. Use LIKE to find by
  // account number substring. Safer to fetch candidates and filter.
  const candidates = await Payment.findAll({
    where: {
      provider: "XIXAPAY",
      status: "PENDING",
    },
    transaction,
    limit: 500, // bounded — should be far fewer for a real merchant
    order: [["createdAt", "DESC"]],
  });

  for (const p of candidates) {
    let instr = p.paymentInstructions;
    if (typeof instr === "string") {
      try { instr = JSON.parse(instr); } catch { instr = null; }
    }
    if (!instr) continue;

    const matchesAccount =
      String(instr.accountNumber) === String(accountNumber);
    if (!matchesAccount) continue;

    const expectedAmount = Number(p.amount);
    const paidKobo = Math.round(amountPaidNaira * 100);
    if (paidKobo < expectedAmount) {
      // Underpayment — do not match
      continue;
    }

    return p;
  }

  return null;
}

/* =========================================================
 * TRANSITION PAYMENT TO SUCCESS
 * ======================================================= */

async function transitionToSuccess({
  paymentId,
  amountPaidKobo,
  providerStatus,
  webhookPayload,
}) {
  let merchantWebhookEvent = null;

  const result = await sequelize.transaction(async (t) => {
    const payment = await Payment.findOne({
      where: { id: paymentId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!payment) {
      return { payment: null, changed: false };
    }

    if (payment.status === "SUCCESS") {
      return { payment, changed: false, alreadySuccess: true };
    }

    if (payment.status === "EXPIRED" || payment.status === "CANCELLED") {
      return { payment, changed: false, invalidState: true };
    }

    const previousStatus = payment.status;

    await payment.update(
      {
        status: "SUCCESS",
        providerStatus: providerStatus || "SUCCESS",
        providerMetadata: {
          ...(payment.providerMetadata || {}),
          xixapayWebhook: {
            amountPaidKobo,
            transactionStatus: webhookPayload?.transaction_status,
            paidAt: webhookPayload?.timestamp,
          },
        },
      },
      { transaction: t }
    );

    await PaymentStatusHistory.create(
      {
        paymentId: payment.id,
        previousStatus,
        newStatus: "SUCCESS",
        reason: `Verified via Xixapay webhook`,
        source: "WEBHOOK",
      },
      { transaction: t }
    );

    // Merchant webhook + notification
    const hookResult = await createMerchantWebhookEventForSuccessfulPayment({
      payment,
      transaction: t,
    });
    if (hookResult.created) {
      merchantWebhookEvent = hookResult.event;
    }

    try {
      await enqueueSuccessfulPaymentNotifications({
        payment,
        transaction: t,
      });
    } catch (err) {
      console.error("Xixapay webhook: notification enqueue failed", {
        paymentReference: payment.paymentReference,
        errorName: err.name,
      });
    }

    return { payment, changed: true, merchantWebhookEvent };
  });

  // Ledger settlement outside the transaction (idempotent by reference)
  if (result.changed && result.payment) {
    try {
      await postPaymentSettlement({ paymentId: result.payment.id });
    } catch (err) {
      console.error("Xixapay webhook: ledger settlement failed", {
        paymentReference: result.payment.paymentReference,
        errorCode: err.code,
        errorName: err.name,
      });
    }
  }

  // Deliver merchant webhook after commit
  if (merchantWebhookEvent) {
    try {
      await processMerchantWebhookDelivery({
        eventId: merchantWebhookEvent.eventId,
      });
    } catch (err) {
      console.error("Xixapay webhook: merchant webhook delivery failed", {
        eventId: merchantWebhookEvent.eventId,
        error: err.message,
      });
    }
  }

  return result;
}

/* =========================================================
 * MAIN HANDLER
 * ======================================================= */

export const handleXixapayWebhook = async (req, res) => {
  try {
    /* Step 1 — raw body */
    if (!req.rawBody || typeof req.rawBody !== "string") {
      console.warn("Xixapay webhook: raw body not captured");
      return res
        .status(400)
        .json({ success: false, message: "Invalid request body" });
    }

    /* Step 2 — signature */
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

    /* Step 3 — payload shape */
    const body = req.body || {};
    const notificationStatus = String(body.notification_status || "");
    const transactionStatus = String(body.transaction_status || "");

    if (!notificationStatus || !transactionStatus || !body.transaction_id) {
      console.warn("Xixapay webhook: malformed payload");
      return res
        .status(400)
        .json({ success: false, message: "Malformed payload" });
    }

    if (notificationStatus !== "payment_successful") {
      console.log("Xixapay webhook: unsupported notification, acknowledged", {
        notificationStatus,
      });
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    if (transactionStatus !== "success") {
      console.log("Xixapay webhook: non-success tx status, acknowledged", {
        transactionStatus,
      });
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    /* Step 4 — dedupe */
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

    /* Step 5 — match payment */
    const amountPaidNaira = Number(body.amount_paid);
    const amountPaidKobo = Math.round(amountPaidNaira * 100);

    const payment = await findPaymentForWebhook(body, null);

    if (!payment) {
      console.warn("Xixapay webhook: no matching payment", {
        transactionId: body.transaction_id,
        accountNumber: body?.receiver?.account_number,
        amountPaid: body.amount_paid,
      });
      return res
        .status(200)
        .json({ success: true, message: "Acknowledged (no matching payment)" });
    }

    /* Step 6 — amount check */
    if (amountPaidKobo < Number(payment.amount)) {
      console.warn("Xixapay webhook: amount underpayment", {
        paymentReference: payment.paymentReference,
        expectedKobo: Number(payment.amount),
        paidKobo: amountPaidKobo,
      });
      return res
        .status(200)
        .json({ success: true, message: "Acknowledged (underpaid)" });
    }

    /* Step 7 — transition */
    const result = await transitionToSuccess({
      paymentId: payment.id,
      amountPaidKobo,
      providerStatus: "SUCCESS",
      webhookPayload: body,
    });

    console.log("Xixapay webhook: payment processed", {
      eventId: record.id,
      paymentReference: payment.paymentReference,
      previousStatus: "PENDING",
      newStatus: result.payment?.status,
      changed: result.changed,
    });

    return res.status(200).json({ success: true, message: "Acknowledged" });
  } catch (error) {
    console.error("Xixapay webhook: unhandled error", {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });
    return res
      .status(500)
      .json({ success: false, message: "Internal error" });
  }
};
