import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { AdminAuditLog, FeeRecord, Merchant, Payment, Payout } from "../models/index.js";

const RECOGNIZED = ["RECOGNIZED", "ESTIMATED", "RECONCILED"];

function buildFilters({ dateFrom, dateTo, provider, merchantId, settlementStatus } = {}) {
  const where = { financialStatus: { [Op.in]: RECOGNIZED } };
  if (provider) where.provider = provider;
  if (settlementStatus) where.settlementStatus = settlementStatus;
  if (dateFrom || dateTo) {
    where.paymentSuccessAt = {};
    if (dateFrom) where.paymentSuccessAt[Op.gte] = new Date(dateFrom);
    if (dateTo) where.paymentSuccessAt[Op.lte] = new Date(dateTo);
  }
  const paymentWhere = { status: "SUCCESS" };
  if (merchantId) paymentWhere.merchantId = merchantId;
  return { where, paymentWhere };
}

function sqlFilters({ dateFrom, dateTo, provider, merchantId, settlementStatus } = {}) {
  const clauses = ["p.status = 'SUCCESS'", "fr.financialStatus IN ('RECOGNIZED','ESTIMATED','RECONCILED')"];
  const replacements = {};
  if (dateFrom) { clauses.push("fr.paymentSuccessAt >= :dateFrom"); replacements.dateFrom = dateFrom; }
  if (dateTo) { clauses.push("fr.paymentSuccessAt <= :dateTo"); replacements.dateTo = dateTo; }
  if (provider) { clauses.push("fr.provider = :provider"); replacements.provider = provider; }
  if (merchantId) { clauses.push("p.merchantId = :merchantId"); replacements.merchantId = merchantId; }
  if (settlementStatus) { clauses.push("fr.settlementStatus = :settlementStatus"); replacements.settlementStatus = settlementStatus; }
  return { clause: clauses.join(" AND "), replacements };
}

export async function getPlatformFinancialSummary(filters = {}) {
  const sql = sqlFilters(filters);
  const [payments] = await sequelize.query(`
    SELECT COUNT(*) AS successfulPaymentCount,
      COUNT(fr.providerFee) AS confirmedProviderFeeRecords,
      COUNT(fr.providerFeeEstimate) AS estimatedProviderFeeRecords,
      COUNT(fr.providerReportedFee) AS providerReportedFeeRecords,
      COUNT(fr.providerReportedSettlementAmount) AS providerReportedSettlementRecords,
      COUNT(fr.actualSettlementAmount) AS actualSettlementRecords,
      COUNT(fr.ctexGrossMargin) AS confirmedMarginRecords,
      COUNT(fr.estimatedCtexGrossMargin) AS estimatedMarginRecords,
      COUNT(CASE WHEN fr.settlementStatus IN ('PENDING','REPORTED') AND fr.expectedSettlementAmount IS NOT NULL THEN 1 END) AS pendingExpectedSettlementRecords,
      COALESCE(SUM(fr.grossAmount),0) AS grossPaymentVolume,
      COALESCE(SUM(fr.providerFee),0) AS confirmedProviderCharges,
      COALESCE(SUM(fr.providerFeeEstimate),0) AS estimatedProviderCharges,
      COALESCE(SUM(fr.providerReportedFee),0) AS providerReportedCharges,
      COALESCE(SUM(fr.providerReportedSettlementAmount),0) AS providerReportedSettlements,
      COALESCE(SUM(fr.serviceFee),0) AS ctexServiceFeeRevenue,
      COALESCE(SUM(fr.merchantNetAmount),0) AS merchantNetPayable,
      COALESCE(SUM(fr.actualSettlementAmount),0) AS actualProviderSettlements,
      COALESCE(SUM(fr.ctexGrossMargin),0) AS ctexGrossProcessingMargin,
      COALESCE(SUM(fr.estimatedCtexGrossMargin),0) AS estimatedCtexGrossProcessingMargin,
      COALESCE(SUM(CASE WHEN fr.settlementStatus IN ('PENDING','REPORTED') THEN fr.expectedSettlementAmount ELSE 0 END),0) AS pendingExpectedSettlement,
      COALESCE(SUM(CASE WHEN fr.settlementStatus = 'DISCREPANCY' THEN 1 ELSE 0 END),0) AS settlementDiscrepancyCount,
      COALESCE(SUM(CASE WHEN fr.settlementStatus = 'DISCREPANCY' THEN fr.reconciliationDifference ELSE 0 END),0) AS settlementDiscrepancyAmount
    FROM fee_records fr INNER JOIN payments p ON p.id = fr.paymentId
    WHERE ${sql.clause}
  `, { replacements: sql.replacements });

  const payoutWhere = { status: "SUCCESS" };
  if (filters.merchantId) payoutWhere.merchantId = filters.merchantId;
  if (filters.dateFrom || filters.dateTo) {
    payoutWhere.completedAt = {};
    if (filters.dateFrom) payoutWhere.completedAt[Op.gte] = new Date(filters.dateFrom);
    if (filters.dateTo) payoutWhere.completedAt[Op.lte] = new Date(filters.dateTo);
  }
  const [successfulWithdrawalCount, successfulWithdrawals, withdrawalCharges] = await Promise.all([
    Payout.count({ where: payoutWhere }),
    Payout.sum("beneficiaryAmount", { where: payoutWhere }),
    Payout.sum("feeAmount", { where: payoutWhere }),
  ]);
  const row = payments[0] || {};
  const asString = (value) => String(value ?? 0);
  return {
    currency: "NGN",
    scope: "successful provider-confirmed payments only",
    payments: {
      count: Number(row.successfulPaymentCount || 0),
      confirmedProviderChargesAvailable: Number(row.confirmedProviderFeeRecords || 0) > 0,
      estimatedProviderChargesAvailable: Number(row.estimatedProviderFeeRecords || 0) > 0,
      providerReportedChargesAvailable: Number(row.providerReportedFeeRecords || 0) > 0,
      providerReportedSettlementsAvailable: Number(row.providerReportedSettlementRecords || 0) > 0,
      actualProviderSettlementsAvailable: Number(row.actualSettlementRecords || 0) > 0,
      ctexGrossProcessingMarginAvailable: Number(row.confirmedMarginRecords || 0) > 0,
      estimatedCtexGrossProcessingMarginAvailable: Number(row.estimatedMarginRecords || 0) > 0,
      pendingExpectedSettlementAvailable: Number(row.pendingExpectedSettlementRecords || 0) > 0,
      grossVolume: asString(row.grossPaymentVolume),
      confirmedProviderCharges: asString(row.confirmedProviderCharges),
      estimatedProviderCharges: asString(row.estimatedProviderCharges),
      providerReportedCharges: asString(row.providerReportedCharges),
      providerReportedSettlements: asString(row.providerReportedSettlements),
      ctexServiceFeeRevenue: asString(row.ctexServiceFeeRevenue),
      merchantNetPayable: asString(row.merchantNetPayable),
      actualProviderSettlements: asString(row.actualProviderSettlements),
      ctexGrossProcessingMargin: asString(row.ctexGrossProcessingMargin),
      estimatedCtexGrossProcessingMargin: asString(row.estimatedCtexGrossProcessingMargin),
      pendingExpectedSettlement: asString(row.pendingExpectedSettlement),
      settlementDiscrepancyCount: Number(row.settlementDiscrepancyCount || 0),
      settlementDiscrepancyAmount: asString(row.settlementDiscrepancyAmount),
    },
    withdrawals: {
      successfulPayoutCount: Number(successfulWithdrawalCount || 0),
      successfulPayoutAmount: asString(successfulWithdrawals),
      ctexWithdrawalChargesCollected: asString(withdrawalCharges),
    },
    note: "Processing margin is before operating costs, taxes, refunds, chargebacks, payout costs, and other expenses. Estimated values are not confirmed settlement or provider charges.",
  };
}

export async function listPlatformFinancialPayments({ page = 1, limit = 25, ...filters } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const { where, paymentWhere } = buildFilters(filters);
  const { rows, count } = await FeeRecord.findAndCountAll({
    where,
    include: [
      {
        model: Payment, as: "payment", required: true,
        where: paymentWhere,
        attributes: ["id", "paymentReference", "providerReference", "provider", "merchantId", "status", "amount", "currency", "createdAt"],
        include: [{ model: Merchant, as: "merchant", attributes: ["id", "merchantCode"], include: [{ association: "businessProfile", attributes: ["businessName"] }] }],
      },
    ],
    order: [["paymentSuccessAt", "DESC"], ["id", "ASC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    distinct: true,
  });
  return {
    data: rows.map((row) => ({ ...row.toJSON(), grossAmount: Number(row.grossAmount), serviceFee: Number(row.serviceFee), merchantNetAmount: Number(row.merchantNetAmount) })),
    pagination: { page: safePage, limit: safeLimit, totalItems: count, totalPages: Math.ceil(count / safeLimit) },
  };
}

export async function getPlatformFinancialPayment(paymentReference) {
  return FeeRecord.findOne({
    include: [{
      model: Payment, as: "payment", required: true,
      attributes: ["id", "paymentReference", "providerReference", "provider", "merchantId", "status", "amount", "currency", "createdAt"],
      where: { paymentReference, status: "SUCCESS" },
      include: [{ model: Merchant, as: "merchant", attributes: ["id", "merchantCode"], include: [{ association: "businessProfile", attributes: ["businessName"] }] }],
    }],
  });
}

export async function reconcilePlatformPaymentSettlement({
  paymentReference,
  actualSettlementAmount,
  actualProviderFee,
  actorUserId,
  reason,
}) {
  if (!Number.isSafeInteger(actualSettlementAmount) || actualSettlementAmount < 0 || (actualProviderFee != null && (!Number.isSafeInteger(actualProviderFee) || actualProviderFee < 0)) || !reason?.trim()) {
    const error = new Error("Settlement amount, optional provider fee, and reason are invalid");
    error.statusCode = 400; error.code = "INVALID_SETTLEMENT_RECONCILIATION"; throw error;
  }
  return sequelize.transaction(async (transaction) => {
    const payment = await Payment.findOne({ where: { paymentReference }, transaction, lock: transaction.LOCK.UPDATE });
    if (!payment || payment.status !== "SUCCESS") {
      const error = new Error("Only an authoritatively successful payment can be reconciled");
      error.statusCode = 404; error.code = "FINANCIAL_PAYMENT_NOT_FOUND"; throw error;
    }
    const record = await FeeRecord.findOne({ where: { paymentId: payment.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!record || record.financialStatus === "NOT_RECOGNIZED") {
      const error = new Error("Successful payment financial snapshot is not recognized yet");
      error.statusCode = 409; error.code = "FINANCIAL_SNAPSHOT_NOT_RECOGNIZED"; throw error;
    }
    const providerFee = actualProviderFee == null ? record.providerFee : actualProviderFee;
    const expectedSettlementAmount = providerFee == null
      ? (record.expectedSettlementAmount == null ? null : Number(record.expectedSettlementAmount))
      : Number(record.grossAmount) - providerFee;
    if (expectedSettlementAmount == null) {
      const error = new Error("A configured provider fee estimate or actual provider fee is required before settlement reconciliation");
      error.statusCode = 409; error.code = "EXPECTED_SETTLEMENT_UNAVAILABLE"; throw error;
    }
    if (expectedSettlementAmount < 0) {
      const error = new Error("Provider fee cannot exceed the gross payment amount");
      error.statusCode = 400; error.code = "INVALID_PROVIDER_FEE"; throw error;
    }
    const difference = actualSettlementAmount - expectedSettlementAmount;
    const next = {
      providerFee: actualProviderFee == null ? record.providerFee : actualProviderFee,
      expectedSettlementAmount,
      actualSettlementAmount,
      reconciliationDifference: difference,
      settlementStatus: difference === 0 ? "CONFIRMED" : "DISCREPANCY",
      settlementConfirmedAt: new Date(),
      ...(actualProviderFee == null ? {} : {
        ctexGrossMargin: Number(record.serviceFee) - actualProviderFee,
        financialStatus: difference === 0 ? "RECONCILED" : "ESTIMATED",
      }),
    };
    const beforeValue = {
      providerFee: record.providerFee == null ? null : Number(record.providerFee),
      expectedSettlementAmount: record.expectedSettlementAmount == null ? null : Number(record.expectedSettlementAmount),
      actualSettlementAmount: record.actualSettlementAmount == null ? null : Number(record.actualSettlementAmount),
      reconciliationDifference: record.reconciliationDifference == null ? null : Number(record.reconciliationDifference),
      settlementStatus: record.settlementStatus,
    };
    await record.update(next, { transaction });
    await AdminAuditLog.create({
      actorUserId,
      action: "PAYMENT_SETTLEMENT_RECONCILED",
      resourceType: "PAYMENT_FINANCIAL_RECORD",
      resourceId: payment.paymentReference,
      outcome: "SUCCESS",
      reason: reason.trim(),
      beforeValue,
      afterValue: {
        ...beforeValue,
        providerFee: next.providerFee == null ? null : Number(next.providerFee),
        expectedSettlementAmount,
        actualSettlementAmount,
        reconciliationDifference: difference,
        settlementStatus: next.settlementStatus,
      },
    }, { transaction });
    return record.reload({ transaction });
  });
}
