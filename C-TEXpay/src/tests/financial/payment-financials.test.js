import test from "node:test";
import assert from "node:assert/strict";
import { buildSuccessfulPaymentFinancialSnapshot, majorToMinor } from "../../service/paymentFinancials.service.js";
import { computeServiceFee } from "../../service/fee.service.js";

const feeRecord = {
  grossAmount: 10_000_000,
  serviceFee: 160_000,
  feeBreakdown: { configBps: 160 },
};

test("successful Monnify payment records a labeled provider-fee estimate and margin", () => {
  const snapshot = buildSuccessfulPaymentFinancialSnapshot({
    payment: { status: "SUCCESS", provider: "MONNIFY", providerReference: "provider-ref" },
    feeRecord,
    successAt: new Date("2026-10-21T00:00:00Z"),
  });
  assert.equal(snapshot.providerFeeEstimate, 150_000);
  assert.equal(snapshot.expectedSettlementAmount, 9_850_000);
  assert.equal(snapshot.estimatedCtexGrossMargin, 10_000);
  assert.equal(snapshot.providerFeeRateBps, 150);
  assert.equal(snapshot.financialStatus, "ESTIMATED");
  assert.equal(snapshot.settlementStatus, "PENDING");
  assert.equal(snapshot.providerReference, "provider-ref");
});

test("successful Xixapay payment records its configured estimate and reported settlement separately", () => {
  const snapshot = buildSuccessfulPaymentFinancialSnapshot({
    payment: { status: "SUCCESS", provider: "XIXAPAY" },
    feeRecord,
    providerReportedSettlementAmount: 9_900_000,
    providerReportedFee: 100_000,
  });
  assert.equal(snapshot.providerFeeEstimate, 100_000);
  assert.equal(snapshot.providerReportedFee, 100_000);
  assert.equal(snapshot.expectedSettlementAmount, 9_900_000);
  assert.equal(snapshot.providerReportedSettlementAmount, 9_900_000);
  assert.equal(snapshot.settlementStatus, "REPORTED");
  assert.equal(snapshot.actualSettlementAmount, undefined);
});

test("pending or failed payments do not produce recognized financial snapshots", () => {
  for (const status of ["PENDING", "FAILED", "EXPIRED", "CANCELLED"]) {
    assert.equal(buildSuccessfulPaymentFinancialSnapshot({ payment: { status, provider: "MONNIFY" }, feeRecord }), null);
  }
});

test("major units convert to kobo with half-up rounding and reject invalid input", () => {
  assert.equal(majorToMinor("100.005"), 10_001);
  assert.equal(majorToMinor("100.004"), 10_000);
  assert.equal(majorToMinor("-1.00"), null);
  assert.equal(majorToMinor("invalid"), null);
});

test("payment financial snapshots preserve the configured capped C-TEX service fee", () => {
  const fee = computeServiceFee({
    grossAmount: 100_000_000,
    percentageRateBps: 160,
    maximumFee: 210_000,
  });
  assert.equal(fee.serviceFee, 210_000);
  const snapshot = buildSuccessfulPaymentFinancialSnapshot({
    payment: { status: "SUCCESS", provider: "XIXAPAY" },
    feeRecord: { ...feeRecord, grossAmount: 100_000_000, serviceFee: fee.serviceFee },
  });
  assert.equal(snapshot.estimatedCtexGrossMargin, -790_000);
});

test("provider fee estimate uses half-up kobo rounding for small transactions", () => {
  const snapshot = buildSuccessfulPaymentFinancialSnapshot({
    payment: { status: "SUCCESS", provider: "XIXAPAY" },
    feeRecord: { grossAmount: 150, serviceFee: 2, feeBreakdown: { configBps: 160 } },
  });
  assert.equal(snapshot.providerFeeEstimate, 2);
});
