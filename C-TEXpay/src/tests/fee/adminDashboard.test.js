import test from "node:test";
import assert from "node:assert/strict";
import { Merchant, Payment } from "../../models/index.js";
import { getPlatformDashboardSummary } from "../../service/adminDashboard.service.js";

test("platform dashboard summary aggregates payment and merchant status data", async () => {
  const originalPaymentFindAll = Payment.findAll;
  const originalPaymentSum = Payment.sum;
  const originalMerchantFindAll = Merchant.findAll;

  Payment.findAll = async () => [
    { status: "SUCCESS", total: "4" },
    { status: "PENDING", total: "2" },
    { status: "FAILED", total: "1" },
  ];
  Payment.sum = async () => "750000";
  Merchant.findAll = async () => [
    { status: "ACTIVE", total: "3" },
    { status: "PENDING", total: "1" },
  ];

  try {
    const summary = await getPlatformDashboardSummary();
    assert.deepEqual(summary, {
      currency: "NGN",
      merchants: { total: 4, active: 3, pending: 1, suspended: 0, inactive: 0 },
      transactions: {
        total: 7,
        successful: 4,
        pending: 2,
        failed: 1,
        expired: 0,
        cancelled: 0,
        successfulVolumeMinor: "750000",
      },
    });
  } finally {
    Payment.findAll = originalPaymentFindAll;
    Payment.sum = originalPaymentSum;
    Merchant.findAll = originalMerchantFindAll;
  }
});
