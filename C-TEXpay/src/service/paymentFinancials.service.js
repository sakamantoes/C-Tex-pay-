import envConfig from "../config/constant.js";
import { FeeRecord } from "../models/index.js";

export function majorToMinor(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const cents = `${fraction}00`;
  let minor = Number(whole) * 100 + Number(cents.slice(0, 2));
  if (cents[2] && Number(cents[2]) >= 5) minor += 1;
  return Number.isSafeInteger(minor) ? minor : null;
}

export function buildSuccessfulPaymentFinancialSnapshot({
  payment,
  feeRecord,
  providerReportedSettlementAmount = null,
  providerReportedFee = null,
  successAt = new Date(),
}) {
  if (!payment || payment.status !== "SUCCESS" || !feeRecord) return null;
  const provider = String(payment.provider || "").toUpperCase();
  const configuredRate = provider === "MONNIFY"
    ? envConfig.MONNIFY_PROVIDER_FEE_BPS
    : provider === "XIXAPAY"
      ? envConfig.XIXAPAY_PROVIDER_FEE_BPS
      : null;
  const rateBps = Number.isInteger(configuredRate) && configuredRate >= 0 && configuredRate <= 10_000
    ? configuredRate
    : null;
  const gross = Number(feeRecord.grossAmount);
  if (!Number.isSafeInteger(gross) || gross <= 0) throw new Error("Invalid gross payment amount in fee snapshot");
  const estimate = rateBps === null ? null : Math.round((gross * rateBps) / 10_000);
  const ctexFee = Number(feeRecord.serviceFee);
  const ctexFeeRateBps = Number(feeRecord.feeBreakdown?.configBps);
  const reportedSettlement = Number.isSafeInteger(providerReportedSettlementAmount)
    ? providerReportedSettlementAmount
    : null;
  const reportedFee = Number.isSafeInteger(providerReportedFee) ? providerReportedFee : null;
  return {
    provider,
    providerReference: payment.providerReference || null,
    providerFeeRateBps: rateBps,
    providerFeeEstimate: estimate,
    providerReportedFee: reportedFee,
    ctexFeeRateBps: Number.isInteger(ctexFeeRateBps) ? ctexFeeRateBps : null,
    expectedSettlementAmount: estimate === null ? null : gross - estimate,
    providerReportedSettlementAmount: reportedSettlement,
    estimatedCtexGrossMargin: estimate === null ? null : ctexFee - estimate,
    financialStatus: estimate === null ? "RECOGNIZED" : "ESTIMATED",
    settlementStatus: reportedSettlement === null ? "PENDING" : "REPORTED",
    paymentSuccessAt: successAt,
  };
}

export async function recognizeSuccessfulPaymentFinancials({
  payment,
  transaction,
  providerReportedSettlementAmount = null,
  providerReportedFee = null,
  successAt = new Date(),
}) {
  if (!payment || payment.status !== "SUCCESS") return null;
  const record = await FeeRecord.findOne({
    where: { paymentId: payment.id },
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });
  if (!record) throw new Error("Successful payment is missing its immutable fee snapshot");
  if (record.financialStatus !== "NOT_RECOGNIZED") return record;

  const snapshot = buildSuccessfulPaymentFinancialSnapshot({ payment, feeRecord: record, providerReportedSettlementAmount, providerReportedFee, successAt });
  await record.update(snapshot, { transaction });
  return record;
}
