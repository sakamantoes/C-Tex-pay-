import { test } from "node:test";
import assert from "node:assert/strict";
import { computeServiceFee, FeeError } from "../../service/fee.service.js";

test("percentage fee: 0.5% of ₦2,000", () => {
  const r = computeServiceFee({ grossAmount: 200000, percentageRateBps: 50 });
  assert.equal(r.serviceFee, 1000); // 200000 * 50 / 10000 = 1000
});

test("fixed fee", () => {
  const r = computeServiceFee({ grossAmount: 200000, percentageRateBps: 0, fixedAmount: 5000 });
  assert.equal(r.serviceFee, 5000);
});

test("percentage + fixed", () => {
  const r = computeServiceFee({ grossAmount: 200000, percentageRateBps: 50, fixedAmount: 1000 });
  assert.equal(r.serviceFee, 2000);
});

test("minimum fee enforced", () => {
  const r = computeServiceFee({ grossAmount: 200000, percentageRateBps: 10, minimumFee: 5000 });
  assert.equal(r.serviceFee, 5000);
});

test("maximum fee caps", () => {
  const r = computeServiceFee({ grossAmount: 1000000, percentageRateBps: 100, maximumFee: 10000 });
  assert.equal(r.serviceFee, 10000);
});

test("zero fee config", () => {
  const r = computeServiceFee({ grossAmount: 200000, percentageRateBps: 0, fixedAmount: 0 });
  assert.equal(r.serviceFee, 0);
});

test("rounding: half-up to nearest kobo", () => {
  // 100001 * 50 / 10000 = 500.005 → 500
  const r = computeServiceFee({ grossAmount: 100001, percentageRateBps: 50 });
  assert.equal(r.serviceFee, 500);
});

test("rejects negative amount", () => {
  assert.throws(() => computeServiceFee({ grossAmount: -1, percentageRateBps: 100 }), FeeError);
});

test("rejects invalid rate", () => {
  assert.throws(() => computeServiceFee({ grossAmount: 100, percentageRateBps: -1 }), FeeError);
});

test("large amount does not overflow", () => {
  const r = computeServiceFee({ grossAmount: 100_000_000_000, percentageRateBps: 50 });
  assert.equal(r.serviceFee, 500_000_000);
});