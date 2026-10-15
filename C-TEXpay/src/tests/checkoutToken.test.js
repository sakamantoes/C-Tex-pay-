import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateCheckoutToken,
  verifyCheckoutToken,
} from "../utils/checkoutToken.js";

const REF = "CTX_pay_saka__20261014_ABC123DEF456";

test("generateCheckoutToken produces reference.signature", () => {
  const token = generateCheckoutToken(REF);
  assert.ok(token.startsWith(`${REF}.`));
  const [, sig] = token.split(".");
  assert.match(sig, /^[0-9a-f]{64}$/);
});

test("verifyCheckoutToken accepts a valid token", () => {
  const token = generateCheckoutToken(REF);
  const result = verifyCheckoutToken(token);
  assert.equal(result.valid, true);
  assert.equal(result.paymentReference, REF);
});

test("verifyCheckoutToken rejects a tampered reference", () => {
  const token = generateCheckoutToken(REF);
  const [, sig] = token.split(".");
  const tampered = `CTX_pay_saka__20261014_DIFFERENT.${sig}`;
  const result = verifyCheckoutToken(tampered);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "SIGNATURE_MISMATCH");
});

test("verifyCheckoutToken rejects a tampered signature", () => {
  const token = generateCheckoutToken(REF);
  const [ref] = token.split(".");
  const bogus = "a".repeat(64);
  const result = verifyCheckoutToken(`${ref}.${bogus}`);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "SIGNATURE_MISMATCH");
});

test("verifyCheckoutToken rejects malformed input", () => {
  assert.equal(verifyCheckoutToken("").valid, false);
  assert.equal(verifyCheckoutToken("no-dot").valid, false);
  assert.equal(verifyCheckoutToken("ref.").valid, false);
  assert.equal(verifyCheckoutToken(".sig").valid, false);
  assert.equal(
    verifyCheckoutToken("ref.NOTHEX").reason,
    "MALFORMED_SIGNATURE"
  );
});

test("verifyCheckoutToken handles refs containing multiple dots", () => {
  const weirderRef = "CTX_pay.saka.20261014.ABC";
  const token = generateCheckoutToken(weirderRef);
  const result = verifyCheckoutToken(token);
  assert.equal(result.valid, true);
  assert.equal(result.paymentReference, weirderRef);
});