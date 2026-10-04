import { Op } from "sequelize";
import { Customer, Payment } from "../models/index.js";

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
const ALLOWED_SORT_FIELDS = new Set(["createdAt", "amount", "status"]);

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

export function toTransactionResponse(payment) {
  if (!payment) return null;

  const data = typeof payment.toJSON === "function" ? payment.toJSON() : payment;
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
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

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

  const resolvedSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  const offset = (page - 1) * limit;
  const { count, rows } = await Payment.findAndCountAll({
    where,
    attributes: PAYMENT_ATTRIBUTES,
    include: [buildCustomerInclude(merchantId)],
    distinct: true,
    order: [[resolvedSortBy, direction], ["id", "ASC"]],
    limit,
    offset,
  });
  const totalPages = Math.ceil(count / limit);

  return {
    transactions: rows.map(toTransactionResponse),
    meta: {
      page,
      limit,
      total: count,
      totalPages,
    },
  };
}

export async function getTransactionForMerchant({ merchantId, paymentReference }) {
  const payment = await Payment.findOne({
    where: { merchantId, paymentReference },
    attributes: PAYMENT_ATTRIBUTES,
    include: [buildCustomerInclude(merchantId)],
  });

  return toTransactionResponse(payment);
}

export async function getTransactionSummaryForMerchant({ merchantId }) {
  const where = { merchantId };
  const successfulWhere = { merchantId, status: "SUCCESS" };
  const [totalTransactions, successfulTransactions, successfulVolume] =
    await Promise.all([
      Payment.count({ where }),
      Payment.count({ where: successfulWhere }),
      Payment.sum("amount", { where: successfulWhere }),
    ]);

  return {
    currency: "NGN",
    totalTransactions,
    successfulTransactions,
    successfulVolumeMinor: String(successfulVolume || 0),
  };
}
