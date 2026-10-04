import { Op } from "sequelize";
import { FeeConfiguration } from "../models/index.js";

export class FeeConfigError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function serialize(config) {
  if (!config) return null;
  const d = typeof config.toJSON === "function" ? config.toJSON() : config;
  return {
    id: d.id,
    merchantId: d.merchantId,
    name: d.name,
    description: d.description,
    currency: d.currency,
    paymentMethod: d.paymentMethod,
    feeType: d.feeType,
    percentageRateBps: d.percentageRateBps,
    fixedAmount: Number(d.fixedAmount),
    minimumFee: Number(d.minimumFee),
    maximumFee: d.maximumFee === null ? null : Number(d.maximumFee),
    providerFeeTreatment: d.providerFeeTreatment,
    status: d.status,
    effectiveFrom: d.effectiveFrom,
    effectiveUntil: d.effectiveUntil,
    createdBy: d.createdBy,
    updatedBy: d.updatedBy,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export async function createFeeConfiguration({
  name,
  description = null,
  merchantId = null,
  currency = "NGN",
  paymentMethod = null,
  feeType,
  percentageRateBps = 0,
  fixedAmount = 0,
  minimumFee = 0,
  maximumFee = null,
  providerFeeTreatment = "UNKNOWN",
  effectiveFrom,
  effectiveUntil = null,
  createdBy,
}) {
  if (effectiveUntil && effectiveFrom && new Date(effectiveUntil) <= new Date(effectiveFrom)) {
    throw new FeeConfigError("effectiveUntil must be after effectiveFrom", "INVALID_DATE_RANGE");
  }

  const config = await FeeConfiguration.create({
    name,
    description,
    merchantId,
    currency,
    paymentMethod,
    feeType,
    percentageRateBps,
    fixedAmount,
    minimumFee,
    maximumFee,
    providerFeeTreatment,
    effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
    effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
    createdBy,
  });

  return serialize(config);
}

export async function listFeeConfigurations({
  page = 1,
  limit = 20,
  merchantId,
  status,
  currency,
} = {}) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const where = {};
  if (merchantId !== undefined) where.merchantId = merchantId;
  if (status) where.status = status;
  if (currency) where.currency = currency;

  const { count, rows } = await FeeConfiguration.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset,
  });

  return {
    configs: rows.map(serialize),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit) || 0,
    },
  };
}

export async function getFeeConfigurationById(id) {
  const config = await FeeConfiguration.findByPk(id);
  return serialize(config);
}

export async function updateFeeConfiguration({ id, updates, updatedBy }) {
  const config = await FeeConfiguration.findByPk(id);
  if (!config) {
    throw new FeeConfigError("Fee configuration not found", "NOT_FOUND", 404);
  }

  const allowed = [
    "name", "description",
    "percentageRateBps", "fixedAmount", "minimumFee", "maximumFee",
    "providerFeeTreatment", "effectiveFrom", "effectiveUntil",
  ];
  const patch = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) patch[key] = updates[key];
  }
  if (Object.keys(patch).length === 0) {
    throw new FeeConfigError("No valid fields to update", "NO_UPDATES");
  }
  patch.updatedBy = updatedBy;

  await config.update(patch);
  return serialize(config);
}

export async function setFeeConfigurationStatus({ id, status, updatedBy }) {
  const config = await FeeConfiguration.findByPk(id);
  if (!config) {
    throw new FeeConfigError("Fee configuration not found", "NOT_FOUND", 404);
  }
  await config.update({ status, updatedBy });
  return serialize(config);
}