import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { AdminAuditLog, WithdrawalFeeTier } from "../models/index.js";

const DEFAULT_TIERS = [
  { tierKey: "UNDER_10000", minimumAmount: 1, maximumAmountExclusive: 1_000_000, feeAmount: 2_000 },
  { tierKey: "FROM_10000_TO_50000", minimumAmount: 1_000_000, maximumAmountExclusive: 5_000_000, feeAmount: 4_000 },
  { tierKey: "FROM_50000", minimumAmount: 5_000_000, maximumAmountExclusive: null, feeAmount: 8_000 },
];

function unavailableWithdrawalFeeConfiguration(message = "Withdrawal fee configuration is unavailable") {
  const error = new Error(message);
  error.code = "WITHDRAWAL_FEE_CONFIGURATION_UNAVAILABLE";
  error.statusCode = 503;
  return error;
}

function serializeTier(tier) {
  return {
    id: tier.id,
    tierKey: tier.tierKey,
    minimumAmount: Number(tier.minimumAmount),
    maximumAmountExclusive: tier.maximumAmountExclusive == null ? null : Number(tier.maximumAmountExclusive),
    feeAmount: Number(tier.feeAmount),
    version: Number(tier.version),
    updatedBy: tier.updatedBy,
    updatedAt: tier.updatedAt,
  };
}

export async function getWithdrawalFeeTiers({ transaction } = {}) {
  const tiers = await WithdrawalFeeTier.findAll({ order: [["minimumAmount", "ASC"]], transaction });
  const keys = new Set(tiers.map((tier) => tier.tierKey));
  if (tiers.length !== DEFAULT_TIERS.length || DEFAULT_TIERS.some(({ tierKey }) => !keys.has(tierKey))) {
    throw unavailableWithdrawalFeeConfiguration("Withdrawal fee configuration is incomplete");
  }
  return tiers.map(serializeTier);
}

export async function calculateWithdrawalCharges({ amount, feeMode = "FEE_ON_TOP", transaction } = {}) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    const error = new Error("Withdrawal amount must be a positive integer in kobo");
    error.code = "INVALID_AMOUNT"; error.statusCode = 400; throw error;
  }
  if (!["FEE_ON_TOP", "DEDUCT_FROM_AMOUNT"].includes(feeMode)) {
    const error = new Error("Invalid withdrawal fee option");
    error.code = "INVALID_FEE_MODE"; error.statusCode = 400; throw error;
  }
  const tier = await WithdrawalFeeTier.findOne({
    where: {
      minimumAmount: { [Op.lte]: amount },
      [Op.or]: [{ maximumAmountExclusive: null }, { maximumAmountExclusive: { [Op.gt]: amount } }],
    },
    order: [["minimumAmount", "DESC"]],
    transaction,
  });
  if (!tier) throw unavailableWithdrawalFeeConfiguration("No configured withdrawal fee tier covers this amount");
  return computeWithdrawalAmounts({ amount, feeMode, tier: serializeTier(tier) });
}

export function computeWithdrawalAmounts({ amount, feeMode = "FEE_ON_TOP", tier }) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || !tier || !Number.isSafeInteger(Number(tier.feeAmount))) {
    const error = new Error("Invalid withdrawal amount or fee tier");
    error.code = "INVALID_WITHDRAWAL_FEE_CONFIG"; error.statusCode = 400; throw error;
  }
  if (!["FEE_ON_TOP", "DEDUCT_FROM_AMOUNT"].includes(feeMode)) {
    const error = new Error("Invalid withdrawal fee option");
    error.code = "INVALID_FEE_MODE"; error.statusCode = 400; throw error;
  }
  const feeAmount = Number(tier.feeAmount);
  const walletDebitAmount = feeMode === "FEE_ON_TOP" ? amount + feeAmount : amount;
  const beneficiaryAmount = feeMode === "FEE_ON_TOP" ? amount : amount - feeAmount;
  if (!Number.isSafeInteger(walletDebitAmount) || beneficiaryAmount <= 0) {
    const error = new Error("Withdrawal amount is too small after the applicable charge");
    error.code = "PAYOUT_AMOUNT_OUT_OF_RANGE"; error.statusCode = 400; throw error;
  }
  return {
    amount,
    feeMode,
    feeAmount,
    providerFee: null,
    totalCharges: feeAmount,
    walletDebitAmount,
    beneficiaryAmount,
    feeSnapshot: {
      type: "WITHDRAWAL_TIER",
      tierId: tier.id,
      tierKey: tier.tierKey,
      version: Number(tier.version),
      minimumAmount: Number(tier.minimumAmount),
      maximumAmountExclusive: tier.maximumAmountExclusive == null ? null : Number(tier.maximumAmountExclusive),
      feeAmount,
      feeMode,
      providerFee: null,
    },
  };
}

export async function updateWithdrawalFeeTiers({ fees, updatedBy, reason }) {
  if (!Array.isArray(fees) || fees.length !== DEFAULT_TIERS.length || !reason?.trim()) {
    const error = new Error("Provide all three tier charges and a change reason");
    error.code = "INVALID_WITHDRAWAL_FEE_CONFIG"; error.statusCode = 400; throw error;
  }
  const byKey = new Map(fees.map((item) => [item.tierKey, item.feeAmount]));
  if (byKey.size !== DEFAULT_TIERS.length || DEFAULT_TIERS.some(({ tierKey }) => !byKey.has(tierKey))) {
    const error = new Error("Tier keys must match the fixed withdrawal ranges");
    error.code = "INVALID_WITHDRAWAL_FEE_CONFIG"; error.statusCode = 400; throw error;
  }
  for (const fee of byKey.values()) {
    if (!Number.isSafeInteger(fee) || fee < 0 || fee > 100_000_000) {
      const error = new Error("Each withdrawal charge must be an integer from 0 to 1,000,000 NGN in kobo");
      error.code = "INVALID_WITHDRAWAL_FEE_CONFIG"; error.statusCode = 400; throw error;
    }
  }

  return sequelize.transaction(async (transaction) => {
    const rows = await WithdrawalFeeTier.findAll({ order: [["minimumAmount", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });
    if (rows.length !== DEFAULT_TIERS.length) throw new Error("Withdrawal fee configuration is incomplete");
    const beforeValue = rows.map(serializeTier);
    for (const row of rows) {
      const nextFee = byKey.get(row.tierKey);
      if (nextFee !== Number(row.feeAmount)) {
        await row.update({ feeAmount: nextFee, version: Number(row.version) + 1, updatedBy }, { transaction });
      }
    }
    const afterValue = rows.map(serializeTier);
    await AdminAuditLog.create({
      actorUserId: updatedBy,
      action: "WITHDRAWAL_FEE_TIERS_UPDATED",
      resourceType: "WITHDRAWAL_FEE_TIERS",
      resourceId: "platform-default",
      outcome: "SUCCESS",
      reason: reason.trim(),
      beforeValue,
      afterValue,
    }, { transaction });
    return afterValue;
  });
}

export async function resetWithdrawalFeeTiers({ updatedBy, reason }) {
  return updateWithdrawalFeeTiers({
    fees: DEFAULT_TIERS.map(({ tierKey, feeAmount }) => ({ tierKey, feeAmount })),
    updatedBy,
    reason,
  });
}
