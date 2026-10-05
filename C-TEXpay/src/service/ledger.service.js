import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
  LedgerAccount,
  LedgerTransaction,
  LedgerEntry,
  FeeRecord,
  Payment,
  Merchant,
} from "../models/index.js";

/* =========================================================
 * ERRORS
 * ======================================================= */

export class LedgerError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/* =========================================================
 * VALIDATION
 * ======================================================= */

function assertPositiveInteger(amount, field = "amount") {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new LedgerError(
      `${field} must be a positive integer (minor units)`,
      "INVALID_AMOUNT",
      400
    );
  }
}

function assertBalanced(entries) {
  if (!entries || entries.length < 2) {
    throw new LedgerError(
      "Ledger transaction requires at least two entries",
      "UNBALANCED_LEDGER",
      500
    );
  }
  let debits = 0;
  let credits = 0;
  for (const entry of entries) {
    if (entry.direction === "DEBIT") debits += entry.amount;
    else if (entry.direction === "CREDIT") credits += entry.amount;
    else {
      throw new LedgerError(
        `Invalid entry direction: ${entry.direction}`,
        "INVALID_DIRECTION",
        500
      );
    }
  }
  if (debits !== credits) {
    throw new LedgerError(
      `Ledger transaction is unbalanced: debits=${debits} credits=${credits}`,
      "UNBALANCED_LEDGER",
      500
    );
  }
}

/* =========================================================
 * ACCOUNT RESOLUTION
 * ======================================================= */

/**
 * Find or create a platform-level account (merchantId = null).
 */
async function getPlatformAccount(type, currency, transaction) {
  const [account] = await LedgerAccount.findOrCreate({
    where: { type, merchantId: null, currency },
    defaults: { type, merchantId: null, currency, status: "ACTIVE" },
    transaction,
  });
  return account;
}

/**
 * Find or create a merchant-scoped account.
 */
async function getMerchantAccount({
  merchantId,
  type,
  currency,
  transaction,
}) {
  if (!merchantId) {
    throw new LedgerError(
      "merchantId is required for merchant accounts",
      "MERCHANT_REQUIRED",
      400
    );
  }
  const [account] = await LedgerAccount.findOrCreate({
    where: { merchantId, type, currency },
    defaults: { merchantId, type, currency, status: "ACTIVE" },
    transaction,
  });
  return account;
}

/* =========================================================
 * LOW-LEVEL POSTING
 * ======================================================= */

/**
 * Post a ledger transaction with entries.
 *
 * Idempotency:
 *   - `reference` is unique per (reference, currency).
 *   - If a transaction with that reference already exists, it is returned
 *     unchanged and no new entries are created.
 *
 * @param {object} params
 * @param {string} params.reference         - deterministic idempotency key
 * @param {string} params.type              - LedgerTransaction type
 * @param {string|null} params.merchantId
 * @param {string} params.currency
 * @param {string|null} params.paymentId
 * @param {object|null} params.metadata
 * @param {Array<{account: LedgerAccount, direction: string, amount: number, metadata?: object}>} params.entries
 * @returns {Promise<{ transaction: LedgerTransaction, created: boolean }>}
 */
export async function postLedgerTransaction({
  reference,
  type,
  merchantId = null,
  currency = "NGN",
  paymentId = null,
  metadata = null,
  entries,
}) {
  if (!reference) {
    throw new LedgerError("reference is required", "REFERENCE_REQUIRED", 400);
  }

  // Validate direction/amount up-front; caller provides ledgerAccount instances.
  const normalizedEntries = entries.map((e) => {
    assertPositiveInteger(e.amount, "entry.amount");
    if (e.direction !== "DEBIT" && e.direction !== "CREDIT") {
      throw new LedgerError(
        `Invalid direction: ${e.direction}`,
        "INVALID_DIRECTION",
        400
      );
    }
    if (!e.account) {
      throw new LedgerError(
        "Each entry must reference a ledger account",
        "ACCOUNT_REQUIRED",
        400
      );
    }
    return {
      ledgerAccountId: e.account.id,
      direction: e.direction,
      amount: e.amount,
      currency: e.account.currency,
      metadata: e.metadata || null,
    };
  });

  assertBalanced(normalizedEntries);

  /*
   * Fast path: existing transaction?
   * This is an optimization. The real protection is the DB unique constraint
   * below, which is enforced even under concurrency.
   */
  const existing = await LedgerTransaction.findOne({
    where: { reference, currency },
    include: [{ model: LedgerEntry, as: "entries" }],
  });
  if (existing) {
    return { transaction: existing, created: false };
  }

  /*
   * Insert inside a transaction. Under concurrency, one writer wins the
   * unique constraint, the others get SequelizeUniqueConstraintError and
   * fetch the existing transaction.
   */
  try {
    const created = await sequelize.transaction(async (t) => {
      const ledgerTx = await LedgerTransaction.create(
        {
          reference,
          type,
          merchantId,
          currency,
          status: "POSTED",
          paymentId,
          metadata,
          postedAt: new Date(),
        },
        { transaction: t }
      );

      await LedgerEntry.bulkCreate(
        normalizedEntries.map((e) => ({
          ...e,
          ledgerTransactionId: ledgerTx.id,
        })),
        { transaction: t, validate: true }
      );

      return ledgerTx;
    });

    return { transaction: created, created: true };
  } catch (error) {
    const isDup =
      error.name === "SequelizeUniqueConstraintError" ||
      error.parent?.code === "ER_DUP_ENTRY";

    if (isDup) {
      const winner = await LedgerTransaction.findOne({
        where: { reference, currency },
        include: [{ model: LedgerEntry, as: "entries" }],
      });
      if (winner) return { transaction: winner, created: false };
    }
    throw error;
  }
}

/* =========================================================
 * PAYMENT SETTLEMENT
 * ======================================================= */

/**
 * Post settlement for a SUCCESS payment. Idempotent.
 *
 * Uses FeeRecord as the authoritative source of amounts.
 * Never recomputes fees.
 *
 * Accounting:
 *   DEBIT  CLEARING                     gross
 *   CREDIT MERCHANT_AVAILABLE (merchant) net
 *   CREDIT CTEX_FEE_REVENUE              serviceFee
 */
export async function postPaymentSettlement({ paymentId }) {
  if (!paymentId) {
    throw new LedgerError("paymentId is required", "PAYMENT_ID_REQUIRED", 400);
  }

  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw new LedgerError("Payment not found", "PAYMENT_NOT_FOUND", 404);
  }
  if (payment.status !== "SUCCESS") {
    throw new LedgerError(
      `Cannot settle payment in status ${payment.status}`,
      "PAYMENT_NOT_SUCCESS",
      409
    );
  }

  const feeRecord = await FeeRecord.findOne({ where: { paymentId } });
  if (!feeRecord) {
    throw new LedgerError(
      "FeeRecord is required before settlement",
      "FEE_RECORD_MISSING",
      500
    );
  }

  const grossAmount = Number(feeRecord.grossAmount);
  const serviceFee = Number(feeRecord.serviceFee);
  const merchantNet = Number(feeRecord.merchantNetAmount);
  const currency = feeRecord.currency || "NGN";

  if (grossAmount !== merchantNet + serviceFee) {
    throw new LedgerError(
      `FeeRecord mismatch: gross=${grossAmount} net=${merchantNet} fee=${serviceFee}`,
      "FEE_RECORD_MISMATCH",
      500
    );
  }

  return sequelize.transaction(async (t) => {
    const clearing = await getPlatformAccount("CLEARING", currency, t);
    const feeRevenue = await getPlatformAccount(
      "CTEX_FEE_REVENUE",
      currency,
      t
    );
    const merchantAccount = await getMerchantAccount({
      merchantId: payment.merchantId,
      type: "MERCHANT_AVAILABLE",
      currency,
      transaction: t,
    });

    const entries = [
      {
        account: clearing,
        direction: "DEBIT",
        amount: grossAmount,
      },
      {
        account: merchantAccount,
        direction: "CREDIT",
        amount: merchantNet,
      },
    ];

    // Only post the fee revenue line if there is a service fee.
    if (serviceFee > 0) {
      entries.push({
        account: feeRevenue,
        direction: "CREDIT",
        amount: serviceFee,
      });
    }

    return postLedgerTransaction({
      reference: `PAYMENT_SETTLEMENT:${payment.id}`,
      type: "PAYMENT_SETTLEMENT",
      merchantId: payment.merchantId,
      currency,
      paymentId: payment.id,
      metadata: {
        paymentReference: payment.paymentReference,
        feeRecordId: feeRecord.id,
        providerFeeTreatment: feeRecord.providerFeeTreatment,
      },
      entries,
    });
  });
}

/* =========================================================
 * PROVIDER COST
 * ======================================================= */

/**
 * Post provider cost for a payment. Idempotent per payment.
 *
 * Accounting:
 *   DEBIT  CTEX_PROVIDER_EXPENSE   providerFee
 *   CREDIT CLEARING                providerFee
 *
 * Note: only call this when an authoritative providerFee exists.
 */
export async function postProviderCost({ paymentId, providerFee, currency }) {
  if (!paymentId) {
    throw new LedgerError("paymentId is required", "PAYMENT_ID_REQUIRED", 400);
  }
  assertPositiveInteger(providerFee, "providerFee");

  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw new LedgerError("Payment not found", "PAYMENT_NOT_FOUND", 404);
  }

  const curr = currency || payment.currency || "NGN";

  return sequelize.transaction(async (t) => {
    const clearing = await getPlatformAccount("CLEARING", curr, t);
    const providerExpense = await getPlatformAccount(
      "CTEX_PROVIDER_EXPENSE",
      curr,
      t
    );

    return postLedgerTransaction({
      reference: `PROVIDER_COST:${payment.id}`,
      type: "PROVIDER_COST",
      merchantId: null,
      currency: curr,
      paymentId: payment.id,
      metadata: { providerFee },
      entries: [
        {
          account: providerExpense,
          direction: "DEBIT",
          amount: providerFee,
        },
        {
          account: clearing,
          direction: "CREDIT",
          amount: providerFee,
        },
      ],
    });
  });
}

/* =========================================================
 * ADMIN ADJUSTMENT
 * ======================================================= */

/**
 * Post an admin adjustment. Each call has a unique reference.
 *
 * @param {object} params
 * @param {string} params.merchantId
 * @param {string} params.currency
 * @param {number} params.amount              - minor units
 * @param {"CREDIT"|"DEBIT"} params.direction - merchant direction
 * @param {string} params.reason
 * @param {string} params.actorUserId
 * @param {string} params.adminReference      - unique idempotency token
 */
export async function postAdminAdjustment({
  merchantId,
  currency = "NGN",
  amount,
  direction,
  reason,
  actorUserId,
  adminReference,
}) {
  if (!merchantId) {
    throw new LedgerError("merchantId is required", "MERCHANT_REQUIRED", 400);
  }
  if (!reason || typeof reason !== "string" || reason.length < 3) {
    throw new LedgerError("reason is required", "REASON_REQUIRED", 400);
  }
  if (!actorUserId) {
    throw new LedgerError("actorUserId is required", "ACTOR_REQUIRED", 400);
  }
  if (!adminReference || typeof adminReference !== "string") {
    throw new LedgerError(
      "adminReference is required",
      "REFERENCE_REQUIRED",
      400
    );
  }
  assertPositiveInteger(amount, "amount");

  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new LedgerError("Merchant not found", "MERCHANT_NOT_FOUND", 404);
  }

  return sequelize.transaction(async (t) => {
    const clearing = await getPlatformAccount("CLEARING", currency, t);
    const merchantAccount = await getMerchantAccount({
      merchantId,
      type: "MERCHANT_AVAILABLE",
      currency,
      transaction: t,
    });

    const merchantDirection = direction === "CREDIT" ? "CREDIT" : "DEBIT";
    const clearingDirection = direction === "CREDIT" ? "DEBIT" : "CREDIT";

    return postLedgerTransaction({
      reference: `ADMIN_ADJUSTMENT:${adminReference}`,
      type: "ADJUSTMENT",
      merchantId,
      currency,
      metadata: {
        reason,
        actorUserId,
        direction,
      },
      entries: [
        {
          account: clearing,
          direction: clearingDirection,
          amount,
        },
        {
          account: merchantAccount,
          direction: merchantDirection,
          amount,
        },
      ],
    });
  });
}

/* =========================================================
 * BALANCE CALCULATION
 * ======================================================= */

/**
 * Derive balance for a merchant's account of a given type.
 * Sum over posted credits minus debits.
 */
async function sumAccount({ merchantId, type, currency }) {
  const account = await LedgerAccount.findOne({
    where: { merchantId, type, currency },
  });
  if (!account) return 0;

  const rows = await LedgerEntry.findAll({
    attributes: [
      "direction",
      [sequelize.fn("SUM", sequelize.col("amount")), "total"],
    ],
    where: { ledgerAccountId: account.id, currency },
    group: ["direction"],
    raw: true,
  });

  let credits = 0;
  let debits = 0;
  for (const row of rows) {
    if (row.direction === "CREDIT") credits = Number(row.total || 0);
    else if (row.direction === "DEBIT") debits = Number(row.total || 0);
  }
  return credits - debits;
}

export async function getAvailableBalance({ merchantId, currency = "NGN" }) {
  return sumAccount({ merchantId, type: "MERCHANT_AVAILABLE", currency });
}

export async function getPendingBalance({ merchantId, currency = "NGN" }) {
  return sumAccount({ merchantId, type: "MERCHANT_PENDING", currency });
}

export async function getBalanceSummary({ merchantId, currency = "NGN" }) {
  const [available, pending] = await Promise.all([
    getAvailableBalance({ merchantId, currency }),
    getPendingBalance({ merchantId, currency }),
  ]);
  return {
    currency,
    availableBalance: available,
    pendingBalance: pending,
    totalBalance: available + pending,
  };
}

/* =========================================================
 * MERCHANT LEDGER LIST
 * ======================================================= */

export async function listMerchantLedgerEntries({
  merchantId,
  currency = "NGN",
  page = 1,
  limit = 20,
  from = null,
  to = null,
  direction = null,
  type = null,
  reference = null,
}) {
  if (!merchantId) {
    throw new LedgerError("merchantId is required", "MERCHANT_REQUIRED", 400);
  }

  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  /*
   * Merchant-visible entries: credits and debits on the merchant's
   * MERCHANT_AVAILABLE account only. Provider expense and C-TEX revenue
   * entries are excluded by joining to the merchant's own account.
   */
  const merchantAccount = await LedgerAccount.findOne({
    where: {
      merchantId,
      type: "MERCHANT_AVAILABLE",
      currency,
    },
  });

  if (!merchantAccount) {
    return {
      entries: [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const where = {
    ledgerAccountId: merchantAccount.id,
    currency,
  };

  if (direction) where.direction = direction;

  const txWhere = {};
  if (type) txWhere.type = type;
  if (reference) txWhere.reference = reference;
  if (from || to) {
    txWhere.postedAt = {};
    if (from) txWhere.postedAt[Op.gte] = new Date(from);
    if (to) txWhere.postedAt[Op.lte] = new Date(to);
  }

  const { count, rows } = await LedgerEntry.findAndCountAll({
    where,
    include: [
      {
        model: LedgerTransaction,
        as: "transaction",
        where: Object.keys(txWhere).length > 0 ? txWhere : undefined,
        required: true,
        attributes: [
          "id",
          "reference",
          "type",
          "status",
          "postedAt",
          "paymentId",
          "metadata",
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset,
  });

  return {
    entries: rows.map((entry) => {
      const d = entry.toJSON();
      return {
        id: d.id,
        direction: d.direction,
        amount: Number(d.amount),
        currency: d.currency,
        createdAt: d.createdAt,
        transaction: d.transaction
          ? {
              id: d.transaction.id,
              reference: d.transaction.reference,
              type: d.transaction.type,
              status: d.transaction.status,
              postedAt: d.transaction.postedAt,
              paymentId: d.transaction.paymentId,
              metadata: d.transaction.metadata,
            }
          : null,
      };
    }),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit) || 0,
    },
  };
}