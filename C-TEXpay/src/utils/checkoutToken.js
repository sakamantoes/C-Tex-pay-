import crypto from "crypto";
import envConfig from "../config/constant.js";

const SECRET =
  envConfig.CHECKOUT_TOKEN_SECRET || envConfig.JWT_ACCESS_SECRET;

if (!SECRET) {
  throw new Error(
    "Checkout token secret is not configured. Set CHECKOUT_TOKEN_SECRET."
  );
}

/**
 * Generate a transaction-scoped checkout token.
 *
 * Format: <paymentReference>.<hexSignature>
 *   - paymentReference is the identifier we already generate
 *   - signature is HMAC-SHA256(paymentReference, SECRET) in hex
 *
 * The token is stateless — nothing is persisted.
 */
export function generateCheckoutToken(paymentReference) {
  if (!paymentReference || typeof paymentReference !== "string") {
    throw new Error("paymentReference is required");
  }
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(paymentReference)
    .digest("hex");
  return `${paymentReference}.${signature}`;
}

/**
 * Verify a checkout token.
 * Returns { valid: true, paymentReference } or { valid: false, reason }.
 */
export function verifyCheckoutToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "MISSING_TOKEN" };
  }

  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === token.length - 1) {
    return { valid: false, reason: "MALFORMED_TOKEN" };
  }

  const paymentReference = token.slice(0, lastDot);
  const providedSignature = token.slice(lastDot + 1);

  if (!/^[0-9a-f]{64}$/.test(providedSignature)) {
    return { valid: false, reason: "MALFORMED_SIGNATURE" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", SECRET)
    .update(paymentReference)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSignature, "hex");
  const providedBuf = Buffer.from(providedSignature, "hex");

  if (expectedBuf.length !== providedBuf.length) {
    return { valid: false, reason: "LENGTH_MISMATCH" };
  }

  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, reason: "SIGNATURE_MISMATCH" };
  }

  return { valid: true, paymentReference };
}