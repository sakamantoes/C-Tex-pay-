import test from "node:test";
import assert from "node:assert/strict";
import { updateMerchantSchema } from "../../validation/merchant.validation.js";
import { up as backfillMerchantOnboardingStatus } from "../../migrations/20261019-backfill-merchant-onboarding-status.js";

test("merchant onboarding API accepts only forward onboarding fields, never account status or NOT_STARTED", () => {
  assert.equal(updateMerchantSchema.safeParse({ onboardingStatus: "IN_PROGRESS" }).success, true);
  assert.equal(updateMerchantSchema.safeParse({ onboardingStatus: "COMPLETED" }).success, true);
  assert.equal(updateMerchantSchema.safeParse({ onboardingStatus: "NOT_STARTED" }).success, false);
  assert.equal(updateMerchantSchema.safeParse({ status: "SUSPENDED" }).success, false);
  assert.equal(updateMerchantSchema.safeParse({ onboardingStatus: "COMPLETED", status: "ACTIVE" }).success, false);
});

test("onboarding backfill updates only legacy NOT_STARTED rows using profile presence", async () => {
  let capturedSql = "";
  await backfillMerchantOnboardingStatus({
    sequelize: {
      query: async (sql) => { capturedSql = sql; },
    },
  });
  assert.match(capturedSql, /LEFT JOIN business_profiles/i);
  assert.match(capturedSql, /WHEN bp\.id IS NULL THEN 'IN_PROGRESS'/i);
  assert.match(capturedSql, /ELSE 'COMPLETED'/i);
  assert.match(capturedSql, /WHERE m\.onboardingStatus = 'NOT_STARTED'/i);
});
