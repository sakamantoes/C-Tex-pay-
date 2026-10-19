import { test } from "node:test";
import assert from "node:assert/strict";
import { toPublicPayment } from "../../service/payment.service.js";
import { normalizeMetadata } from "../../utils/normalizeMetadata.js";

test("normalizes JSON metadata strings to objects", () => {
  assert.deepEqual(
    normalizeMetadata('{"returnUrl":"https://justtesters.com/success"}'),
    { returnUrl: "https://justtesters.com/success" },
  );
});

test("normalizes invalid or non-object metadata to null", () => {
  for (const value of [
    null,
    undefined,
    "not-json",
    '"a string"',
    "12",
    "[1,2]",
    ["array"],
  ]) {
    assert.equal(normalizeMetadata(value), null);
  }
});

test("preserves metadata objects without stringifying them in payment responses", () => {
  const response = toPublicPayment({
    id: "payment-id",
    paymentReference: "CTX_test_payment_metadata",
    merchantReference: null,
    customerId: null,
    amount: "100000",
    currency: "NGN",
    paymentMethod: "ACCOUNT_TRANSFER",
    status: "PENDING",
    description: "Metadata test",
    metadata: '{"returnUrl":"https://justtesters.com/success"}',
    paymentInstructions: null,
    expiresAt: null,
    createdAt: null,
    updatedAt: null,
  });

  assert.deepEqual(response.metadata, {
    returnUrl: "https://justtesters.com/success",
  });
  assert.equal(typeof response.metadata, "object");
});
