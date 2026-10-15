import { Payment, Customer } from "../models/index.js";
import { verifyCheckoutToken } from "../utils/checkoutToken.js";
import { parseInstructions } from "./paymentLink.service.js";

export class CheckoutError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Return the safe public view of a payment for direct checkout.
 * No merchantId, no provider info, no customer PII beyond what the
 * customer themselves entered.
 */
function toPublicCheckout(payment) {
  if (!payment) return null;
  const d = payment.toJSON ? payment.toJSON() : payment;

  return {
    paymentReference: d.paymentReference,
    status: d.status,
    amount: Number(d.amount),
    currency: d.currency,
    paymentMethod: d.paymentMethod,
    description: d.description || null,
    merchantReference: d.merchantReference || null,
    paymentInstructions: parseInstructions(d.paymentInstructions),
    expiresAt: d.expiresAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/**
 * Load a payment for the /checkout/:token flow.
 *
 * - Verifies the token's HMAC against the reference.
 * - Loads the payment by reference only (no cross-merchant leakage).
 * - Returns a safe public view.
 *
 * Called from both the initial load and each status poll.
 */
export async function loadCheckoutByToken({ token }) {
  const verification = verifyCheckoutToken(token);

  if (!verification.valid) {
    throw new CheckoutError(
      "This checkout link is invalid or has been tampered with",
      "INVALID_TOKEN",
      401
    );
  }

  const payment = await Payment.findOne({
    where: { paymentReference: verification.paymentReference },
    include: [
      {
        model: Customer,
        as: "customer",
        attributes: ["id"],
        required: false,
      },
    ],
  });

  if (!payment) {
    throw new CheckoutError("Payment not found", "NOT_FOUND", 404);
  }

  return toPublicCheckout(payment);
}