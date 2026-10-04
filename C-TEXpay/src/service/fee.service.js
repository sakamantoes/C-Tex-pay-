import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { FeeConfiguration, FeeRecord } from "../models/index.js";

/*
|--------------------------------------------------------------------------
| Fee Calculation Service
|--------------------------------------------------------------------------
| All amounts are integer minor units (kobo).
| Rates are basis points (integers): 100 = 1.00%.
|
| Rounding: half-up to nearest kobo (Math.round).
| Deterministic for identical inputs.
*/

export const CALCULATION_VERSION = "v1";
export const MAX_SAFE_AMOUNT = 100_000_000_000; // ₦1 billion in kobo

export class FeeError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

function assertValidAmount(amount) {
  if (!Number.isInteger(amount)) {
    throw new FeeError("Amount must be an integer (kobo)", "INVALID_AMOUNT");
  }
  if (amount <= 0) {
    throw new FeeError("Amount must be positive", "INVALID_AMOUNT");
  }
  if (amount > MAX_SAFE_AMOUNT) {
    throw new FeeError("Amount exceeds safe maximum", "AMOUNT_TOO_LARGE");
  }
}

/*
|--------------------------------------------------------------------------
| Pure calculation (unit-testable, no I/O)
|--------------------------------------------------------------------------
*/

/**
 * Calculate the C-TEX service fee for a given gross amount.
 *
 * @param {object} params
 * @param {number} params.grossAmount        - integer kobo
 * @param {number} params.percentageRateBps  - integer basis points
 * @param {number} params.fixedAmount        - integer kobo
 * @param {number} params.minimumFee         - integer kobo
 * @param {number|null} params.maximumFee    - integer kobo or null
 * @returns {{ serviceFee:number, calculation:string }}
 */
export function computeServiceFee({
  grossAmount,
  percentageRateBps = 0,
  fixedAmount = 0,
  minimumFee = 0,
  maximumFee = null,
}) {
  assertValidAmount(grossAmount);

  if (!Number.isInteger(percentageRateBps) || percentageRateBps < 0) {
    throw new FeeError("Invalid percentage rate", "INVALID_RATE");
  }
  if (!Number.isInteger(fixedAmount) || fixedAmount < 0) {
    throw new FeeError("Invalid fixed amount", "INVALID_FIXED");
  }
  if (!Number.isInteger(minimumFee) || minimumFee < 0) {
    throw new FeeError("Invalid minimum fee", "INVALID_MINIMUM");
  }
  if (maximumFee !== null && (!Number.isInteger(maximumFee) || maximumFee < 0)) {
    throw new FeeError("Invalid maximum fee", "INVALID_MAXIMUM");
  }
  if (maximumFee !== null && maximumFee < minimumFee) {
    throw new FeeError("Maximum fee cannot be less than minimum fee", "INVALID_RANGE");
  }

  // grossAmount * bps / 10000, rounded half-up
  const percentageComponent = Math.round((grossAmount * percentageRateBps) / 10000);
  let fee = percentageComponent + fixedAmount;

  if (fee < minimumFee) fee = minimumFee;
  if (maximumFee !== null && fee > maximumFee) fee = maximumFee;

  // Fee cannot exceed gross amount
  if (fee > grossAmount) {
    fee = grossAmount;
  }

  return {
    serviceFee: fee,
    calculation: `${percentageComponent} + ${fixedAmount} → ${fee} (bps=${percentageRateBps}, min=${minimumFee}, max=${maximumFee ?? "none"})`,
  };
}

/*
|--------------------------------------------------------------------------
| Config resolution (deterministic precedence)
|--------------------------------------------------------------------------
*/

/**
 * Resolve the applicable fee config for a merchant.
 * Precedence (first match wins):
 *   1. merchant + currency + method
 *   2. merchant + currency + NULL method
 *   3. NULL merchant + currency + method
 *   4. NULL merchant + currency + NULL method
 */
export async function resolveFeeConfiguration({
  merchantId,
  currency = "NGN",
  paymentMethod = null,
  at = new Date(),
  transaction = null,
}) {
  const activeWindow = {
    status: "ACTIVE",
    effectiveFrom: { [Op.lte]: at },
    [Op.or]: [
      { effectiveUntil: null },
      { effectiveUntil: { [Op.gt]: at } },
    ],
  };

  const candidates = await FeeConfiguration.findAll({
    where: {
      currency,
      ...activeWindow,
      [Op.and]: [
        { [Op.or]: [{ merchantId }, { merchantId: null }] },
        {
          [Op.or]: [
            { paymentMethod },
            { paymentMethod: null },
          ],
        },
      ],
    },
    order: [
      // Merchant-specific first
      [sequelize.literal("CASE WHEN merchantId IS NULL THEN 1 ELSE 0 END"), "ASC"],
      // Specific method first
      [sequelize.literal("CASE WHEN paymentMethod IS NULL THEN 1 ELSE 0 END"), "ASC"],
      ["createdAt", "DESC"],
    ],
    transaction,
  });

  if (candidates.length === 0) return null;

  // Explicit deterministic pick: highest specificity, then newest
  const scored = candidates.map((c) => ({
    config: c,
    score:
      (c.merchantId ? 2 : 0) +
      (c.paymentMethod ? 1 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);

  return scored[0].config;
}

/*
|--------------------------------------------------------------------------
| High-level: calculate + persist fee record
|--------------------------------------------------------------------------
*/

/**
 * Calculate fees for a payment and persist an immutable FeeRecord.
 *
 * MUST be called inside the same DB transaction that creates the Payment,
 * so a failure to record fees rolls back the payment too.
 *
 * @param {object} params
 * @param {object} params.payment       - Sequelize Payment instance (must have id)
 * @param {string} params.merchantId
 * @param {number} params.grossAmount   - integer kobo
 * @param {string} params.currency
 * @param {string|null} params.paymentMethod
 * @param {object} params.transaction   - Sequelize transaction
 */
export async function calculateAndRecordFees({
  payment,
  merchantId,
  grossAmount,
  currency = "NGN",
  paymentMethod = null,
  transaction,
}) {
  assertValidAmount(grossAmount);

  const config = await resolveFeeConfiguration({
    merchantId,
    currency,
    paymentMethod,
    transaction,
  });

  let serviceFee = 0;
  let providerFeeTreatment = "UNKNOWN";
  let calculation = "no-config";
  let configId = null;

  if (config) {
    const result = computeServiceFee({
      grossAmount,
      percentageRateBps: config.percentageRateBps,
      fixedAmount: Number(config.fixedAmount),
      minimumFee: Number(config.minimumFee),
      maximumFee: config.maximumFee === null ? null : Number(config.maximumFee),
    });
    serviceFee = result.serviceFee;
    calculation = result.calculation;
    providerFeeTreatment = config.providerFeeTreatment;
    configId = config.id;
  }

  // Ensure non-negative net
  const totalFee = serviceFee;
  const merchantNet = grossAmount - totalFee;
  if (merchantNet < 0) {
    throw new FeeError(
      "Calculated fee exceeds gross amount",
      "FEE_EXCEEDS_GROSS",
      500
    );
  }

  const record = await FeeRecord.create(
    {
      paymentId: payment.id,
      merchantId,
      feeConfigurationId: configId,
      currency,
      grossAmount,
      serviceFee,
      providerFee: null,
      totalFee,
      merchantNetAmount: merchantNet,
      providerFeeTreatment,
      feeBreakdown: {
        calculation,
        configName: config?.name ?? null,
        configBps: config?.percentageRateBps ?? 0,
        configFixed: config ? Number(config.fixedAmount) : 0,
        configMin: config ? Number(config.minimumFee) : 0,
        configMax: config?.maximumFee === null || config?.maximumFee === undefined
          ? null
          : Number(config.maximumFee),
      },
      calculationVersion: CALCULATION_VERSION,
    },
    { transaction }
  );

  return record;
}

/*
|--------------------------------------------------------------------------
| Read helpers
|--------------------------------------------------------------------------
*/

export async function getFeeRecordForPayment(paymentId) {
  return FeeRecord.findOne({ where: { paymentId } });
}

export function toPublicFeeBreakdown(feeRecord) {
  if (!feeRecord) return null;
  const d = typeof feeRecord.toJSON === "function" ? feeRecord.toJSON() : feeRecord;
  return {
    currency: d.currency,
    grossAmount: Number(d.grossAmount),
    serviceFee: Number(d.serviceFee),
    totalFee: Number(d.totalFee),
    merchantNetAmount: Number(d.merchantNetAmount),
    providerFeeTreatment: d.providerFeeTreatment,
    calculationVersion: d.calculationVersion,
  };
}