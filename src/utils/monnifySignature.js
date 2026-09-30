import crypto from "crypto";
import envConfig from "../config/constant.js";

/**
 * Monnify Webhook Signature Verification
 *
 * Monnify signs the RAW request body with HMAC-SHA512 using the
 * merchant's client secret (MONNIFY_SECRET_KEY). The signature is
 * sent in the `monnify-signature` header as a hex string.
 *
 * Reference:
 *   https://developers.monnify.com/docs/webhooks
 *
 * Rules:
 *   - Signature is a 128-character lowercase hex string (SHA-512 = 64 bytes).
 *   - Comparison MUST be constant-time.
 *   - Missing or malformed signatures are rejected, never treated as valid.
 *   - When MONNIFY_SKIP_SIGNATURE_VERIFICATION=true is explicitly set (sandbox
 *     only), we log a loud warning and skip. This must never be enabled in
 *     production.
 */

const SHA512_HEX_LENGTH = 128;
const SHA512_BYTES = 64;

function isHexString(value, expectedLength) {
  if (typeof value !== "string") return false;
  if (value.length !== expectedLength) return false;
  return /^[0-9a-fA-F]+$/.test(value);
}

/**
 * Verify a Monnify webhook signature against the raw body.
 *
 * @param {string} rawBody    - Exact request body string.
 * @param {string} signature  - Value of the `monnify-signature` header.
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifyMonnifySignature(rawBody, signature) {
  // Sandbox-only bypass. Never enable in production.
  if (envConfig.MONNIFY_SKIP_SIGNATURE_VERIFICATION === true) {
    console.warn(
      "[monnify-signature] SKIPPED — MONNIFY_SKIP_SIGNATURE_VERIFICATION is enabled. Do not use in production."
    );
    return { valid: true, reason: "SKIPPED_BY_CONFIG" };
  }

  if (!envConfig.MONNIFY_SECRET_KEY) {
    return { valid: false, reason: "MISSING_SECRET_KEY" };
  }

  if (!signature) {
    return { valid: false, reason: "MISSING_SIGNATURE" };
  }

  if (!isHexString(signature, SHA512_HEX_LENGTH)) {
    return { valid: false, reason: "MALFORMED_SIGNATURE" };
  }

  if (typeof rawBody !== "string" || rawBody.length === 0) {
    return { valid: false, reason: "MISSING_RAW_BODY" };
  }

  const expected = crypto
    .createHmac("sha512", envConfig.MONNIFY_SECRET_KEY)
    .update(rawBody, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  if (expectedBuf.length !== SHA512_BYTES || receivedBuf.length !== SHA512_BYTES) {
    return { valid: false, reason: "SIGNATURE_LENGTH_MISMATCH" };
  }

  if (!crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    return { valid: false, reason: "SIGNATURE_MISMATCH" };
  }

  return { valid: true };
}