import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { deriveEventKey, resolvePaymentForEvent } from "../../service/webhookEvent.service.js";
import { verifyMonnifySignature } from "../../utils/monnifySignature.js";
import envConfig from "../../config/constant.js";

/*
 * These tests run without a live DB or a running server.
 * They exercise pure logic: event-key derivation, signature verification,
 * and payment resolution cross-checks.
 *
 * Integration tests (signature → DB) are covered separately against the
 * sandbox via curl (see Stage 9 §15 of the spec).
 */

const TEST_SECRET = "SK_TEST_1234567890_thisisasecret";
envConfig.MONNIFY_SECRET_KEY = TEST_SECRET;

test("deriveEventKey: prefers transactionReference", () => {
  const key = deriveEventKey("SUCCESSFUL_TRANSACTION", {
    transactionReference: "MNFY|14|20260929235253|000198",
    paymentReference: "CTX_pay_...",
  });
  assert.equal(key, "tx:MNFY|14|20260929235253|000198");
});

test("deriveEventKey: falls back to hash when no tx ref", () => {
  const key = deriveEventKey("SOMETHING_ELSE", { foo: "bar" });
  assert.match(key, /^hash:[0-9a-f]{64}$/);
});

test("verifyMonnifySignature: valid signature passes", () => {
  const raw = JSON.stringify({ eventType: "SUCCESSFUL_TRANSACTION" });
  const sig = crypto
    .createHmac("sha512", TEST_SECRET)
    .update(raw)
    .digest("hex");
  const result = verifyMonnifySignature(raw, sig);
  assert.equal(result.valid, true);
});

test("verifyMonnifySignature: wrong signature fails", () => {
  const raw = JSON.stringify({ eventType: "SUCCESSFUL_TRANSACTION" });
  const badSig = "0".repeat(128);
  const result = verifyMonnifySignature(raw, badSig);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "SIGNATURE_MISMATCH");
});

test("verifyMonnifySignature: missing signature fails", () => {
  const result = verifyMonnifySignature("{}", undefined);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "MISSING_SIGNATURE");
});

test("verifyMonnifySignature: malformed hex fails", () => {
  const result = verifyMonnifySignature("{}", "zzzz");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "MALFORMED_SIGNATURE");
});

test("verifyMonnifySignature: wrong length hex fails", () => {
  const result = verifyMonnifySignature("{}", "abc123");
  assert.equal(result.valid, false);
  assert.equal(result.reason, "MALFORMED_SIGNATURE");
});