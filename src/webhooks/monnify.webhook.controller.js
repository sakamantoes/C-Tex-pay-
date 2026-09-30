import envConfig from "../config/constant.js";
import { verifyMonnifySignature } from "../utils/monnifySignature.js";
import {
  deriveEventKey,
  recordWebhookEvent,
  resolvePaymentForEvent,
} from "../service/webhookEvent.service.js";
import { verifyPayment as verifyPaymentService } from "../service/payment.service.js";

/*
|--------------------------------------------------------------------------
| POST /api/v1/webhooks/monnify
|--------------------------------------------------------------------------
|
| Response codes:
|   200 — event accepted (created, duplicate, or safely acknowledged)
|   400 — malformed request body or missing raw body
|   401 — signature missing or invalid
|   500 — transient failure; Monnify should retry
|
| We only return 500 for cases where the payment state could not be
| verified or persisted due to a TRANSIENT problem (DB error, provider
| timeout). Permanent errors (mismatch, unsupported event, unknown
| payment) are acked with 200 so Monnify does not retry endlessly.
*/

const SUPPORTED_EVENTS = new Set([
  "SUCCESSFUL_TRANSACTION",
  "SUCCESSFUL_DISBURSEMENT",  // future
  "FAILED_DISBURSEMENT",      // future
  "REJECTED_PAYMENT",         // overdraft/underpaid case per Monnify docs
]);

export const handleMonnifyWebhook = async (req, res) => {
  const startedAt = Date.now();

  try {
    /*
    |----------------------------------------------------------------------
    | Step 1 — Raw body presence
    |----------------------------------------------------------------------
    */
    if (!req.rawBody || typeof req.rawBody !== "string") {
      console.warn("Monnify webhook: raw body not captured");
      return res
        .status(400)
        .json({ success: false, message: "Invalid request body" });
    }

    /*
    |----------------------------------------------------------------------
    | Step 2 — Signature verification
    |----------------------------------------------------------------------
    */
    const signature = req.headers["monnify-signature"];
    const sigResult = verifyMonnifySignature(req.rawBody, signature);

    if (!sigResult.valid) {
      console.warn("Monnify webhook: signature rejected", {
        reason: sigResult.reason,
      });
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature" });
    }

    /*
    |----------------------------------------------------------------------
    | Step 3 — Payload structure
    |----------------------------------------------------------------------
    */
    const { eventType, eventData } = req.body || {};

    if (!eventType || typeof eventType !== "string" || !eventData) {
      console.warn("Monnify webhook: malformed payload");
      return res
        .status(400)
        .json({ success: false, message: "Malformed payload" });
    }

    console.log("Monnify webhook received", { eventType });

    /*
    |----------------------------------------------------------------------
    | Step 4 — Deduplication (durable)
    |----------------------------------------------------------------------
    | Persist BEFORE acking. On duplicate, still return 200 so Monnify
    | stops retrying.
    */
    const eventKey = deriveEventKey(eventType, eventData);

    let recordResult;
    try {
      recordResult = await recordWebhookEvent({
        provider: "MONNIFY",
        eventType,
        eventKey,
        payload: eventData,
      });
    } catch (dbErr) {
      // Transient DB failure — ask provider to retry.
      console.error("Monnify webhook: event persistence failed", {
        eventType,
        error: dbErr.message,
      });
      return res
        .status(500)
        .json({ success: false, message: "Unable to persist event" });
    }

    if (!recordResult.created) {
      console.log("Monnify webhook: duplicate event", { eventKey });
      return res
        .status(200)
        .json({ success: true, message: "Acknowledged (duplicate)" });
    }

    /*
    |----------------------------------------------------------------------
    | Step 5 — Unsupported event types
    |----------------------------------------------------------------------
    */
    if (!SUPPORTED_EVENTS.has(eventType)) {
      console.log("Monnify webhook: unsupported event, acknowledged", {
        eventType,
      });
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    /*
    |----------------------------------------------------------------------
    | Step 6 — Resolve payment
    |----------------------------------------------------------------------
    */
    const paymentReference = eventData.paymentReference;
    const transactionReference = eventData.transactionReference;

    const { payment, mismatch } = await resolvePaymentForEvent({
      paymentReference,
      transactionReference,
    });

    if (mismatch) {
      console.warn("Monnify webhook: payment resolution failed", {
        paymentReference,
        transactionReference,
        mismatch,
      });
      // Permanent — do not ask provider to retry
      return res.status(200).json({ success: true, message: "Acknowledged" });
    }

    /*
    |----------------------------------------------------------------------
    | Step 7 — Provider verification
    |----------------------------------------------------------------------
    | Never trust the webhook payload alone. Re-query the provider.
    | verifyPaymentService already:
    |   - Validates reference, currency, amount.
    |   - Performs the atomic status transition with row lock.
    |   - Appends a PaymentStatusHistory row.
    */
    try {
      const { payment: verified, alreadyVerified } = await verifyPaymentService({
        merchantId: payment.merchantId,
        paymentReference: payment.paymentReference,
      });

      console.log("Monnify webhook: verified", {
        paymentReference: payment.paymentReference,
        status: verified.status,
        alreadyVerified,
        durationMs: Date.now() - startedAt,
      });

      return res.status(200).json({ success: true, message: "Acknowledged" });
    } catch (verifyError) {
      const code = verifyError.code || "UNKNOWN";

      /*
       * Classify: is this transient (retry) or permanent (ack)?
       *
       * Transient → 500 so Monnify retries:
       *   PROVIDER_TIMEOUT, PROVIDER_NETWORK_ERROR,
       *   PROVIDER_ERROR, SEQUELIZE_DATABASE_ERROR
       *
       * Permanent → 200 ack (retry won't help):
       *   AMOUNT_MISMATCH, CURRENCY_MISMATCH, REFERENCE_MISMATCH,
       *   INVALID_VERIFICATION_STATE, INVALID_STATE_TRANSITION,
       *   PAYMENT_NOT_FOUND
       */
      const transientCodes = new Set([
        "PROVIDER_TIMEOUT",
        "PROVIDER_NETWORK_ERROR",
        "PROVIDER_ERROR",
        "SEQUELIZE_DATABASE_ERROR",
      ]);

      const isTransient = transientCodes.has(code);

      console.error("Monnify webhook: verification failed", {
        paymentReference: payment.paymentReference,
        errorCode: code,
        transient: isTransient,
        message: verifyError.message,
      });

      if (isTransient) {
        return res
          .status(500)
          .json({ success: false, message: "Temporary failure" });
      }

      return res
        .status(200)
        .json({ success: true, message: "Acknowledged (permanent)" });
    }
  } catch (error) {
    console.error("Monnify webhook: unhandled error", {
      error: error.message,
      stack: error.stack,
    });
    // Unknown failure — ask Monnify to retry safely.
    return res
      .status(500)
      .json({ success: false, message: "Internal error" });
  }
};