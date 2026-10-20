import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeXixapayPhone,
  toXixapayCreateVirtualAccountRequest,
} from "../../Provider/xixapay/xixapay.mapper.js";

test("normalizes supported Nigerian phone formats for Xixapay", () => {
  assert.equal(normalizeXixapayPhone("08012345678"), "08012345678");
  assert.equal(normalizeXixapayPhone("+2348012345678"), "08012345678");
  const request = toXixapayCreateVirtualAccountRequest({
    paymentReference: "CTX_TEST_123",
    amount: 100,
    customer: {
      name: "Test Customer",
      email: "test@example.com",
      phone: "+2348012345678",
    },
    businessId: "business-test",
    bankCodes: ["20867"],
  });
  assert.equal(request.phoneNumber, "08012345678");
});

test("rejects German, other-country, and absent numbers clearly", () => {
  assert.throws(
    () => normalizeXixapayPhone("+491795361207"),
    { code: "XIXAPAY_PHONE_FORMAT_UNSUPPORTED" }
  );
  assert.throws(
    () => normalizeXixapayPhone("+447911123456"),
    { code: "XIXAPAY_PHONE_FORMAT_UNSUPPORTED" }
  );
  assert.throws(
    () => normalizeXixapayPhone(""),
    { code: "XIXAPAY_PHONE_REQUIRED" }
  );
});

test("rejects unsupported phone lengths before building a Xixapay request", () => {
  assert.throws(
    () => normalizeXixapayPhone("+447911123456"),
    { code: "XIXAPAY_PHONE_FORMAT_UNSUPPORTED" }
  );

  assert.throws(
    () =>
      toXixapayCreateVirtualAccountRequest({
        paymentReference: "CTX_TEST_123",
        amount: 100,
        customer: {
          name: "Test Customer",
          email: "test@example.com",
          phone: "+447911123456",
        },
        businessId: "business-test",
        bankCodes: ["20867"],
      }),
    { code: "XIXAPAY_PHONE_FORMAT_UNSUPPORTED" }
  );
});
