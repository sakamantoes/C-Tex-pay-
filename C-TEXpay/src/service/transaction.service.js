import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { Customer, Payment, FeeRecord } from "../models/index.js";

/*
|--------------------------------------------------------------------------
| Attribute whitelists
|--------------------------------------------------------------------------
*/

const PAYMENT_ATTRIBUTES = [
  "id",
  "merchantId",
  "customerId",
  "paymentReference",
  "merchantReference",
  "amount",
  "currency",
  "paymentMethod",
  "status",
  "createdAt",
  "updatedAt",
];

const CUSTOMER_ATTRIBUTES = ["id", "firstName", "lastName", "email", "phone"];
const FEE_RECORD_ATTRIBUTES = [
  "id",
  "currency",
  "grossAmount",
  "serviceFee",
  "providerFee",
  "totalFee",
  "merchantNetAmount",
  "providerFeeTreatment",
  "calculationVersion",
  "createdAt",
];

const ALLOWED_SORT_FIELDS = new Set(["createdAt", "amount", "status"]);

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function escapeLikeTerm(value) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function buildCustomerInclude(merchantId) {
  return {
    model: Customer,
    as: "customer",
    attributes: CUSTOMER_ATTRIBUTES,
    where: { merchantId },
    required: false,
  };
}

function buildFeeRecordInclude() {
  return {
    model: FeeRecord,
    as: "feeRecord",
    attributes: FEE_RECORD_ATTRIBUTES,
    required: false,
  };
}

/**
 * Serialize a FeeRecord to a stable public shape.
 * Returns null when no fee record is attached (pre-Stage-12 payments).
 */
function toFeeBreakdown(feeRecord) {
  if (!feeRecord) return null;

  const d =
    typeof feeRecord.toJSON === "function" ? feeRecord.toJSON() : feeRecord;

  return {
    currency: d.currency,
    grossAmount: Number(d.grossAmount),
    serviceFee: Number(d.serviceFee),
    providerFee: d.providerFee === null || d.providerFee === undefined
      ? null
      : Number(d.providerFee),
    totalFee: Number(d.totalFee),
    merchantNetAmount: Number(d.merchantNetAmount),
    providerFeeTreatment: d.providerFeeTreatment,
    calculationVersion: d.calculationVersion,
  };
}

/*
|--------------------------------------------------------------------------
| Serialization
|--------------------------------------------------------------------------
*/

export function toTransactionResponse(payment, feeRecord = null) {
  if (!payment) return null;

  const data =
    typeof payment.toJSON === "function" ? payment.toJSON() : payment;
  const customer = data.customer;
  const customerName = customer
    ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
    : "";

  return {
    id: data.id,
    paymentReference: data.paymentReference,
    merchantReference: data.merchantReference || null,
    amount: Number(data.amount),
    currency: data.currency,
    status: data.status,
    paymentMethod: data.paymentMethod,
    customer: customer
      ? {
          id: customer.id,
          name: customerName,
          email: customer.email,
          phone: customer.phone || null,
        }
      : null,
    fees: toFeeBreakdown(feeRecord ?? data.feeRecord ?? null),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/*
|--------------------------------------------------------------------------
| List transactions
|--------------------------------------------------------------------------
*/

export async function listTransactionsForMerchant({ merchantId, query }) {
  const {
    page,
    limit,
    status,
    paymentMethod,
    paymentReference,
    merchantReference,
    customerId,
    currency,
    from,
    to,
    minAmount,
    maxAmount,
    sortBy,
    direction,
  } = query;

  const where = { merchantId };

  if (status) where.status = status;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (paymentReference) where.paymentReference = paymentReference;
  if (customerId) where.customerId = customerId;
  if (currency) where.currency = currency;

  if (merchantReference) {
    where.merchantReference = {
      [Op.like]: `%${escapeLikeTerm(merchantReference)}%`,
    };
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(from);
    if (to) where.createdAt[Op.lte] = new Date(to);
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined) where.amount[Op.gte] = minAmount;
    if (maxAmount !== undefined) where.amount[Op.lte] = maxAmount;
  }

  const resolvedSortBy = ALLOWED_SORT_FIELDS.has(sortBy)
    ? sortBy
    : "createdAt";

  const offset = (page - 1) * limit;

  const { count, rows } = await Payment.findAndCountAll({
    where,
    attributes: PAYMENT_ATTRIBUTES,
    include: [buildCustomerInclude(merchantId), buildFeeRecordInclude()],
    distinct: true,
    order: [[resolvedSortBy, direction], ["id", "ASC"]],
    limit,
    offset,
  });

  const totalPages = Math.ceil(count / limit);

  return {
    transactions: rows.map((row) =>
      toTransactionResponse(row, row.feeRecord)
    ),
    meta: {
      page,
      limit,
      total: count,
      totalPages,
    },
  };
}

/*
|--------------------------------------------------------------------------
| Get one transaction (merchant-scoped)
|--------------------------------------------------------------------------
*/

export async function getTransactionForMerchant({
  merchantId,
  paymentReference,
}) {
  const payment = await Payment.findOne({
    where: { merchantId, paymentReference },
    attributes: PAYMENT_ATTRIBUTES,
    include: [buildCustomerInclude(merchantId), buildFeeRecordInclude()],
  });

  return toTransactionResponse(payment, payment?.feeRecord);
}

/*
|--------------------------------------------------------------------------
| Summary (merchant-scoped)
|--------------------------------------------------------------------------
|
| successfulVolumeMinor : sum of gross amounts for SUCCESS payments
| totalFeesMinor        : sum of totalFee from fee_records (all statuses)
| successfulNetMinor    : sum of merchantNetAmount for SUCCESS payments
|
| Fee aggregates are computed by joining fee_records to successful
| payments via the paymentId foreign key, so pre-Stage-12 payments
| (which have no fee record) are correctly excluded from fee totals
| but still counted in successfulVolumeMinor.
*/

export async function getTransactionSummaryForMerchant({ merchantId }) {
  const baseWhere = { merchantId };
  const successfulWhere = { merchantId, status: "SUCCESS" };

  const [
    totalTransactions,
    successfulTransactions,
    successfulVolume,
    totalFees,
    feesCoveredCount,
  ] = await Promise.all([
    Payment.count({ where: baseWhere }),
    Payment.count({ where: successfulWhere }),
    Payment.sum("amount", { where: successfulWhere }),

    // Sum of fees for SUCCESS payments that have a fee record
    FeeRecord.sum("totalFee", {
      where: { merchantId },
      include: [
        {
          model: Payment,
          as: "payment",
          attributes: [],
          where: { status: "SUCCESS" },
          required: true,
        },
      ],
    }),

    // How many SUCCESS payments actually have a fee record
    FeeRecord.count({
      where: { merchantId },
      include: [
        {
          model: Payment,
          as: "payment",
          attributes: [],
          where: { status: "SUCCESS" },
          required: true,
        },
      ],
    }),
  ]);

  /*
   * successfulNetMinor is computed as gross - fees rather than
   * summing FeeRecord.merchantNetAmount, so it stays correct for
   * legacy payments that have no fee record. For those, fees = 0,
   * so net = gross, which is what the merchant actually received.
   */
  const grossKobo = Number(successfulVolume || 0);
  const feesKobo = Number(totalFees || 0);
  const netKobo = grossKobo - feesKobo;

  return {
    currency: "NGN",
    totalTransactions,
    successfulTransactions,
    successfulVolumeMinor: String(grossKobo),
    totalFeesMinor: String(feesKobo),
    successfulNetMinor: String(netKobo),
    feeCoveredSuccessfulTransactions: feesCoveredCount,
    legacySuccessfulTransactions: successfulTransactions - feesCoveredCount,
  };
}