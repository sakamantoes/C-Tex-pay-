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
 * SIGNATURE VERIFICATION (unchanged)
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
 * FIND PAYMENT
 * ======================================================= */

async function findPaymentForWebhook(body, transaction = null) {
  const accountNumber = body?.receiver?.account_number;
  const amountPaidNaira = Number(body?.amount_paid);

  if (!accountNumber) return null;

  const candidates = await Payment.findAll({
    where: {
      provider: "XIXAPAY",
      status: { [require("sequelize").Op.in]: ["PENDING", "EXPIRED"] },
    },
    transaction,
    limit: 500,
    order: [["createdAt", "DESC"]],
  });

  for (const p of candidates) {
    let instr = p.paymentInstructions;
    if (typeof instr === "string") {
      try { instr = JSON.parse(instr); } catch { instr = null; }
    }
    if (!instr) continue;

    if (String(instr.accountNumber) !== String(accountNumber)) continue;

    const expectedAmount = Number(p.amount);
    const paidKobo = Math.round(amountPaidNaira * 100);
    if (paidKobo < expectedAmount) continue;

    return p;
  }

  return null;
}

/* =========================================================
 * TRANSITION TO SUCCESS
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

    if (!payment) return { payment: null, changed: false };
    if (payment.status === "SUCCESS") {
      return { payment, changed: false, alreadySuccess: true };
    }
    if (payment.status === "CANCELLED") {
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

    /* Step 3 — payload */
    const body = req.body || {};
    const notificationStatus = String(body.notification_status || "");
    const transactionStatus = String(body.transaction_status || "");

    if (!notificationStatus || !transactionStatus || !body.transaction_id) {
      return res
        .status(400)
        .json({ success: false, message: "Malformed payload" });
    }

    if (notificationStatus !== "payment_successful" || transactionStatus !== "success") {
      console.log("Xixapay webhook: ignoring non-success event", {
        notificationStatus,
        transactionStatus,
      });
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    /* Step 4 — dedupe (but try self-heal on duplicate) */
    const eventKey = deriveEventKey(body);
    let record;
    let isDuplicate = false;

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
      if (!isDup) {
        console.error("Xixapay webhook: event persistence failed", {
          errorName: err.name,
          errorMessage: err.message,
        });
        return res
          .status(500)
          .json({ success: false, message: "Unable to persist event" });
      }
      isDuplicate = true;
      record = await WebhookEvent.findOne({
        where: { provider: "XIXAPAY", eventKey },
      });
      console.log("Xixapay webhook: duplicate event — will attempt self-heal", {
        eventKey,
      });
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
        duplicate: isDuplicate,
      });
      return res
        .status(200)
        .json({ success: true, message: "Acknowledged (no matching payment)" });
    }

    /* Step 6 — amount check */
    if (amountPaidKobo < Number(payment.amount)) {
      console.warn("Xixapay webhook: underpayment", {
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

    console.log("Xixapay webhook: processed", {
      eventId: record?.id,
      paymentReference: payment.paymentReference,
      changed: result.changed,
      alreadySuccess: result.alreadySuccess,
      duplicate: isDuplicate,
    });

    return res.status(200).json({ success: true, message: "Acknowledged" });
  } catch (error) {
    console.error("Xixapay webhook: unhandled error", {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};