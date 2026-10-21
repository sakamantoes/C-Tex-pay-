import test from "node:test";
import assert from "node:assert/strict";
import { computeWithdrawalAmounts } from "../../service/withdrawalFee.service.js";

const tiers = [
  { id: "tier-1", version: 1, tierKey: "UNDER_10000", minimumAmount: 1, maximumAmountExclusive: 1_000_000, feeAmount: 2_000 },
  { id: "tier-2", version: 1, tierKey: "FROM_10000_TO_50000", minimumAmount: 1_000_000, maximumAmountExclusive: 5_000_000, feeAmount: 4_000 },
  { id: "tier-3", version: 1, tierKey: "FROM_50000", minimumAmount: 5_000_000, maximumAmountExclusive: null, feeAmount: 8_000 },
];

function feeFor(amount) {
  const tier = tiers.find((item) => amount >= item.minimumAmount && (item.maximumAmountExclusive == null || amount < item.maximumAmountExclusive));
  return computeWithdrawalAmounts({ amount, tier });
}

test("withdrawal fee tier boundaries use integer kobo", () => {
  assert.equal(feeFor(999_999).feeAmount, 2_000);
  assert.equal(feeFor(1_000_000).feeAmount, 4_000);
  assert.equal(feeFor(4_999_999).feeAmount, 4_000);
  assert.equal(feeFor(5_000_000).feeAmount, 8_000);
});

test("fee-on-top reserves charge in addition to the requested payout", () => {
  const result = feeFor(1_000_000);
  assert.equal(result.walletDebitAmount, 1_004_000);
  assert.equal(result.beneficiaryAmount, 1_000_000);
  assert.equal(result.feeSnapshot.version, 1);
});

test("deduct-from-amount preserves wallet debit and reduces bank payout", () => {
  const result = computeWithdrawalAmounts({ amount: 1_000_000, feeMode: "DEDUCT_FROM_AMOUNT", tier: tiers[1] });
  assert.equal(result.walletDebitAmount, 1_000_000);
  assert.equal(result.beneficiaryAmount, 996_000);
});

test("deduct mode rejects requests smaller than the configured fee", () => {
  assert.throws(
    () => computeWithdrawalAmounts({ amount: 1_000, feeMode: "DEDUCT_FROM_AMOUNT", tier: tiers[0] }),
    { code: "PAYOUT_AMOUNT_OUT_OF_RANGE" },
  );
});
