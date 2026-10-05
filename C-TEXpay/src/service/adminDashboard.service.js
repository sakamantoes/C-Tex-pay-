import { fn, col } from "sequelize";
import { Merchant, Payment } from "../models/index.js";

export async function getPlatformDashboardSummary() {
  const [paymentStatusRows, successfulVolume, merchantStatusRows] = await Promise.all([
    Payment.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "total"]],
      group: ["status"],
      raw: true,
    }),
    Payment.sum("amount", { where: { status: "SUCCESS" } }),
    Merchant.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "total"]],
      group: ["status"],
      raw: true,
    }),
  ]);

  const paymentsByStatus = Object.fromEntries(
    paymentStatusRows.map((row) => [row.status, Number(row.total)]),
  );
  const merchantsByStatus = Object.fromEntries(
    merchantStatusRows.map((row) => [row.status, Number(row.total)]),
  );

  return {
    currency: "NGN",
    merchants: {
      total: Object.values(merchantsByStatus).reduce((sum, value) => sum + value, 0),
      active: merchantsByStatus.ACTIVE || 0,
      pending: merchantsByStatus.PENDING || 0,
      suspended: merchantsByStatus.SUSPENDED || 0,
      inactive: merchantsByStatus.INACTIVE || 0,
    },
    transactions: {
      total: Object.values(paymentsByStatus).reduce((sum, value) => sum + value, 0),
      successful: paymentsByStatus.SUCCESS || 0,
      pending: paymentsByStatus.PENDING || 0,
      failed: paymentsByStatus.FAILED || 0,
      expired: paymentsByStatus.EXPIRED || 0,
      cancelled: paymentsByStatus.CANCELLED || 0,
      successfulVolumeMinor: String(successfulVolume || 0),
    },
  };
}
