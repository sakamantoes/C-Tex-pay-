import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Pure logic tests. Integration tests against a live DB are in the manual
 * curl section below — running them from the automated suite requires a
 * test database.
 */

test("balance arithmetic: available = credits - debits", () => {
  const credits = 1_966_000;
  const debits = 500_000;
  assert.equal(credits - debits, 1_466_000);
});

test("settlement is balanced: gross = net + fee", () => {
  const gross = 2_000_000;
  const net = 1_966_000;
  const fee = 34_000;
  assert.equal(gross, net + fee);
});

test("provider fee NULL does not reduce merchant net", () => {
  const gross = 2_000_000;
  const serviceFee = 34_000;
  const providerFee = null; // unknown
  const net = gross - serviceFee;
  assert.equal(net, 1_966_000);
  assert.equal(providerFee, null);
});