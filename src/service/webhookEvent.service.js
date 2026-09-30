import crypto from "crypto";
import sequelize from "../config/database.js";
import { WebhookEvent, Payment } from "../models/index.js";

/**
 * Webhook Event Service
 *
 * Responsibilities:
 *   - Derive a stable deduplication key per event.
 *   - Persist a durable WebhookEvent row before acking the provider.
 *   - Look up the associated C-TEX payment with provider cross-check.
 *   - Classify results so the controller can pick the right HTTP status.
 */

/**
 * Derive a stable event key.
 *
 * Priority:
 *   1. transactionReference — present on all transaction-related events.
 *   2. Hash of (eventType + canonicalized eventData).
 *
 * transactionReference is preferred because Monnify may re-emit the same
 * transaction under slightly different event aliases.
 */
export function deriveEventKey(eventType, eventData) {
  const txRef = eventData?.transactionReference;
  if (typeof txRef === "string" && txRef.length > 0) {
    return `tx:${txRef}`;
  }
  const canonical = `${eventType}|${JSON.stringify(eventData || {})}`;
  const hash = crypto.createHash("sha256").update(canonical).digest("hex");
  return `hash:${hash}`;
}

/**
 * Record the event durably. Returns:
 *   { created: true,  event }
 *   { created: false, event }   ← duplicate, caller should ack
 */
export async function recordWebhookEvent({
  provider,
  eventType,
  eventKey,
  payload,
}) {
  try {
    const event = await WebhookEvent.create({
      provider,
      eventType,
      eventKey,
      payload,
      processedAt: new Date(),
    });
    return { created: true, event };
  } catch (err) {
    const isDup =
      err.name === "SequelizeUniqueConstraintError" ||
      err.parent?.code === "ER_DUP_ENTRY";
    if (!isDup) throw err;

    const existing = await WebhookEvent.findOne({
      where: { provider, eventKey },
    });
    return { created: false, event: existing };
  }
}

/**
 * Find the C-TEX payment associated with an event's paymentReference,
 * and cross-check the stored provider reference when possible.
 *
 * @returns {{ payment: Payment|null, mismatch: string|null }}
 */
export async function resolvePaymentForEvent({
  paymentReference,
  transactionReference,
}) {
  if (!paymentReference) {
    return { payment: null, mismatch: "MISSING_PAYMENT_REFERENCE" };
  }

  const payment = await Payment.findOne({ where: { paymentReference } });
  if (!payment) {
    return { payment: null, mismatch: "PAYMENT_NOT_FOUND" };
  }

  // Cross-check provider reference if both are present.
  // A mismatch is a strong signal of tampering or provider mix-up.
  if (
    transactionReference &&
    payment.providerReference &&
    payment.providerReference !== transactionReference
  ) {
    return { payment: null, mismatch: "PROVIDER_REFERENCE_MISMATCH" };
  }

  return { payment, mismatch: null };
}