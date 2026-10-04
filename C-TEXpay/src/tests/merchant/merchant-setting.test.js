import test from "node:test";
import assert from "node:assert/strict";
import { updateMerchantSettingsSchema } from "../../validation/merchantSetting.validation.js";

test("merchant settings update preserves omitted fields", () => {
  const result = updateMerchantSettingsSchema.parse({
    notifyPaymentSuccessInApp: false,
  });

  assert.deepEqual(result, { notifyPaymentSuccessInApp: false });
});

test("merchant settings accepts blank notification email as a clear operation", () => {
  const result = updateMerchantSettingsSchema.parse({ notificationEmail: "" });
  assert.deepEqual(result, { notificationEmail: null });
});

test("merchant settings rejects unknown keys and empty updates", () => {
  assert.equal(updateMerchantSettingsSchema.safeParse({}).success, false);
  assert.equal(updateMerchantSettingsSchema.safeParse({ merchantId: "other" }).success, false);
});
