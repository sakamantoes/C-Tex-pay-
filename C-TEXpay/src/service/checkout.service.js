import { Payment, Customer } from "../models/index.js";
import { verifyCheckoutToken } from "../utils/checkoutToken.js";
import { parseInstructions } from "./paymentLink.service.js";
import { getRedirectUrlsForMerchant } from "./merchantSetting.service.js";
import {
  isAllowedReturnUrl,
  validateMerchantUrl,
} from "../utils/urlValidator.js";
import { normalizeMetadata } from "../utils/normalizeMetadata.js";

export class CheckoutError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

const TERMINAL_STATUSES = new Set([
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
]);

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
 * Pick the correct redirect target for a terminal payment status.
 *
 * Priority:
 *   1. Per-payment override (payment.metadata.returnUrl) — wins if present
 *   2. Merchant's configured redirect for the status
 *
 * Returns the target URL string or null.
 */
function pickRedirectTarget({ payment, merchantRedirects }) {
  const override = normalizeMetadata(payment.metadata)?.returnUrl || null;
  if (override) {
    const configuredUrls = Object.values(merchantRedirects).filter(Boolean);
    if (isAllowedReturnUrl(override, configuredUrls)) return override;
    console.warn("Checkout return URL rejected", {
      merchantId: payment.merchantId,
      stage: "MERCHANT_ALLOWLIST",
      reason: "URL_NOT_CONFIGURED",
    });
    return null;
  }

  switch (payment.status) {
    case "SUCCESS":
      return merchantRedirects.success || null;
    case "CANCELLED":
      return merchantRedirects.cancel || null;
    case "FAILED":
    case "EXPIRED":
    default:
      return merchantRedirects.failure || null;
  }
}

/**
 * Attach query params to a redirect URL safely.
 * Returns null if the URL is not well-formed (defensive).
 */
function appendRedirectParams(targetUrl, payment) {
  try {
    const url = new URL(targetUrl);
    url.searchParams.set("paymentReference", payment.paymentReference);
    url.searchParams.set(
      "status",
      payment.status === "SUCCESS" ? "success" : "failed"
    );
    return url.toString();
  } catch {
    // Malformed URL was stored — do not redirect to it.
    return null;
  }
}

/**
 * Load a payment for the /checkout/:token flow.
 *
 * - Verifies the token's HMAC against the reference.
 * - Loads the payment by reference only (no cross-merchant leakage).
 * - Returns a safe public view.
 * - When the payment is terminal, attaches a `redirectUrl` that the
 *   frontend can send the customer to after showing the result.
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

  const publicView = toPublicCheckout(payment);

  /*
   * Use only the persisted server-side payment status. Browser query strings
   * and Monnify redirect parameters are not inputs to this decision. SUCCESS
   * is written by payment.service.verifyPayment after a provider status query.
   * While the payment is pending, there is nothing to redirect to.
   */
  if (!TERMINAL_STATUSES.has(payment.status)) {
    return publicView;
  }

  const merchantRedirects = await getRedirectUrlsForMerchant({
    merchantId: payment.merchantId,
  });

  const target = pickRedirectTarget({ payment, merchantRedirects });
  if (!target) {
    // Merchant hasn't configured a redirect for this outcome — return
    // the public view without a redirectUrl. The frontend shows the
    // on-page confirmation instead.
    return publicView;
  }

  const targetValidation = validateMerchantUrl(target);
  if (!targetValidation.valid) {
    console.warn("Checkout return URL rejected", {
      merchantId: payment.merchantId,
      stage: "CHECKOUT_REDIRECT_VALIDATION",
      reason: targetValidation.reason,
    });
    return publicView;
  }

  const redirectUrl = appendRedirectParams(targetValidation.url, payment);
  if (!redirectUrl) {
    return publicView;
  }

  return {
    ...publicView,
    redirectUrl,
  };
}
