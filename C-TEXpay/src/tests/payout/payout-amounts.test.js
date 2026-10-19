import test from "node:test";
import assert from "node:assert/strict";
import { getPayoutAmounts } from "../../service/payout.service.js";

const configuration = {
  id: "fee-config-test",
  percentageRateBps: 100,
  fixedAmount: 50,
  minimumFee: 0,
  maximumFee: null,
};

test("fee on top keeps beneficiary amount and adds fee to wallet debit", () => {
  assert.deepEqual(getPayoutAmounts(100_000, "FEE_ON_TOP", configuration), {
    feeAmount: 1_050,
    walletDebitAmount: 101_050,
    beneficiaryAmount: 100_000,
    feeSnapshot: {
      feeMode: "FEE_ON_TOP",
      calculation: "1000 + 50 → 1050 (bps=100, min=0, max=none)",
      feeConfigurationId: "fee-config-test",
      percentageRateBps: 100,
      fixedAmount: 50,
      minimumFee: 0,
      maximumFee: null,
    },
  });
});

test("deduct mode keeps wallet debit fixed and reduces beneficiary amount", () => {
  const result = getPayoutAmounts(100_000, "DEDUCT_FROM_AMOUNT", configuration);
  assert.equal(result.walletDebitAmount, 100_000);
  assert.equal(result.beneficiaryAmount, 98_950);
  assert.equal(result.feeAmount, 1_050);
});

test("missing payout fee configuration produces a zero fee snapshot", () => {
  const result = getPayoutAmounts(100_000, "FEE_ON_TOP", null);
  assert.equal(result.feeAmount, 0);
  assert.equal(result.walletDebitAmount, 100_000);
  assert.equal(result.beneficiaryAmount, 100_000);
});

test("fee cannot consume the full beneficiary payout", () => {
  assert.throws(
    () => getPayoutAmounts(10_000, "DEDUCT_FROM_AMOUNT", {
      ...configuration, fixedAmount: 10_000, percentageRateBps: 0,
    }),
    { code: "PAYOUT_AMOUNT_OUT_OF_RANGE" },
  );
});
