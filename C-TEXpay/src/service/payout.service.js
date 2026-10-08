import crypto from "crypto";
import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
  Payout,
  LedgerAccount,
  LedgerTransaction,
  Merchant,
} from "../models/index.js";
import envConfig from "../config/constant.js";
import { getPayoutProvider } from "../Provider/provider.factory.js";
import {
  postLedgerTransaction,
  getAvailableBalance,
} from "./ledger.service.js";

/* =========================================================
 * ERRORS
 * ======================================================= */

export class PayoutError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/* =========================================================
 * VALIDATION HELPERS
 * ======================================================= */

const MIN_AMOUNT = envConfig.PAYOUT_MIN_AMOUNT || 10000;
const MAX_AMOUNT = envConfig.PAYOUT_MAX_AMOUNT || 500_000_000;

function assertPayoutAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new PayoutError(
      "amount must be a positive integer (minor units)",
      "INVALID_AMOUNT",
      400
    );
  }
  if (amount < MIN_AMOUNT) {
    throw new PayoutError(
      `Minimum payout is ${MIN_AMOUNT} kobo`,
      "AMOUNT_BELOW_MINIMUM",
      400
    );
  }
  if (amount > MAX_AMOUNT) {
    throw new PayoutError(
      `Maximum payout is ${MAX_AMOUNT} kobo`,
      "AMOUNT_ABOVE_MAXIMUM",
      400
    );
  }
}

function assertBankFields({ bankCode, accountNumber, accountName }) {
  if (!/^\d{3,10}$/.test(String(bankCode || ""))) {
    throw new PayoutError(
      "bankCode must be 3-10 digits",
      "INVALID_BANK_CODE",
      400
    );
  }
  if (!/^\d{10}$/.test(String(accountNumber || ""))) {
    throw new PayoutError(
      "accountNumber must be exactly 10 digits",
      "INVALID_ACCOUNT_NUMBER",
      400
    );
  }
  if (
    !accountName ||
    typeof accountName !== "string" ||
    accountName.trim().length < 2
  ) {
    throw new PayoutError(
      "accountName is required and must be at least 2 characters",
      "INVALID_ACCOUNT_NAME",
      400
    );
  }
}

function assertIdempotencyKey(key) {
  if (!key || typeof key !== "string") {
    throw new PayoutError(
      "Idempotency-Key is required",
      "IDEMPOTENCY_KEY_REQUIRED",
      400
    );
  }
  if (key.length < 8 || key.length > 255) {
    throw new PayoutError(
      "Idempotency-Key must be 8-255 characters",
      "INVALID_IDEMPOTENCY_KEY",
      400
    );
  }
  if (!/^[A-Za-z0-9_\-:.]+$/.test(key)) {
    throw new PayoutError(
      "Idempotency-Key contains invalid characters",
      "INVALID_IDEMPOTENCY_KEY",
      400
    );
  }
}

/* =========================================================
 * CANONICAL HASH
 * ======================================================= */

function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function computeRequestHash({
  merchantId,
  amount,
  currency,
  bankCode,
  accountNumber,
  narration,
}) {
  const canonical = stableStringify({
    merchantId,
    amount,
    currency,
    bankCode,
    accountNumber,
    narration: narration || null,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/* =========================================================
 * BANK ACCOUNT VALIDATION
 * ======================================================= */

export async function validateBankAccount({ bankCode, accountNumber }) {
  if (!/^\d{3,10}$/.test(String(bankCode || ""))) {
    throw new PayoutError("bankCode must be 3-10 digits", "INVALID_BANK_CODE", 400);
  }
  if (!/^\d{10}$/.test(String(accountNumber || ""))) {
    throw new PayoutError(
      "accountNumber must be exactly 10 digits",
      "INVALID_ACCOUNT_NUMBER",
      400
    );
  }

  const provider = getPayoutProvider();

  try {
    const result = await provider.validateBankAccount({
      bankCode,
      accountNumber,
    });
    return {
      bankCode: String(bankCode),
      accountNumber: String(accountNumber),
      accountName: result.accountName,
    };
  } catch (providerError) {
    console.error("Bank validation failed", {
      bankCode,
      errorCode: providerError.code,
      errorMessage: providerError.message,
    });
    throw new PayoutError(
      "Unable to validate bank account with provider",
      providerError.code || "PROVIDER_ERROR",
      502
    );
  }
}

/* =========================================================
 * CREATE PAYOUT
 * ======================================================= */

/**
 * Initiate a payout.
 *
 * Concurrency model:
 *   We lock the Merchant row (not the LedgerAccount row) so concurrent
 *   payout attempts for the same merchant serialize cleanly. Locking
 *   the ledger account is unnecessary and was causing lock-wait timeouts
 *   when a previous transaction held a lock on that row.
 *
 * Ledger coordination:
 *   The reserve ledger transaction is posted using the SAME DB transaction
 *   as the payout creation, so no nested transactions and no extended lock
 *   windows.
 */
export async function createPayout({
  merchantId,
  amount,
  currency = "NGN",
  bankCode,
  accountNumber,
  accountName,
  narration = null,
  merchantReference = null,
  idempotencyKey,
  metadata = null,
}) {
  if (!merchantId) {
    throw new PayoutError("merchantId is required", "MERCHANT_REQUIRED", 400);
  }

  assertPayoutAmount(amount);
  assertBankFields({ bankCode, accountNumber, accountName });
  assertIdempotencyKey(idempotencyKey);

  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new PayoutError("Merchant not found", "MERCHANT_NOT_FOUND", 404);
  }
  if (merchant.status && merchant.status !== "ACTIVE") {
    throw new PayoutError(
      "Merchant account is not active",
      "MERCHANT_INACTIVE",
      403
    );
  }

  const requestHash = computeRequestHash({
    merchantId,
    amount,
    currency,
    bankCode,
    accountNumber,
    narration,
  });

  /* Fast-path idempotency check */
  const existing = await Payout.findOne({
    where: { merchantId, idempotencyKey },
  });
  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new PayoutError(
        "Idempotency-Key was reused with a different payout request",
        "IDEMPOTENCY_CONFLICT",
        409
      );
    }
    return { payout: existing, replayed: true };
  }

  /* Atomic creation + reservation */
  let payout;
  try {
    payout = await sequelize.transaction(async (t) => {
      /*
       * Lock the merchant row — this is the single synchronization point
       * for all financial operations on this merchant. Serializes
       * concurrent payouts safely.
       */
      await Merchant.findByPk(merchantId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      /*
       * Find the merchant's available ledger account. Do NOT lock it —
       * we only need its id to construct ledger entries. The merchant
       * row lock above is what prevents concurrent balance reads.
       */
      const account = await LedgerAccount.findOne({
        where: {
          merchantId,
          type: "MERCHANT_AVAILABLE",
          currency,
        },
        transaction: t,
      });

      if (!account) {
        throw new PayoutError(
          "Merchant has no ledger account yet",
          "INSUFFICIENT_BALANCE",
          400
        );
      }

      /* Recompute balance from ledger entries inside the lock. */
      const balance = await getAvailableBalance({ merchantId, currency });
      if (balance < amount) {
        throw new PayoutError(
          "Insufficient available balance",
          "INSUFFICIENT_BALANCE",
          400
        );
      }

      /* Create the payout in PENDING state. */
      const created = await Payout.create(
        {
          merchantId,
          amount,
          currency,
          bankCode: String(bankCode),
          accountNumber: String(accountNumber),
          accountName: accountName.trim(),
          narration: narration || null,
          merchantReference: merchantReference || null,
          idempotencyKey,
          requestHash,
          status: "PENDING",
          initiatedAt: new Date(),
          metadata,
        },
        { transaction: t }
      );

      /* Reserve funds: DEBIT AVAILABLE / CREDIT PENDING. */
      const pendingAccount = await LedgerAccount.findOrCreate({
        where: { merchantId, type: "MERCHANT_PENDING", currency },
        defaults: { merchantId, type: "MERCHANT_PENDING", currency },
        transaction: t,
      });
      const pending = pendingAccount[0];

      const reserveResult = await postLedgerTransaction({
        reference: `PAYOUT_RESERVE:${created.id}`,
        type: "PAYOUT",
        merchantId,
        currency,
        metadata: {
          payoutId: created.id,
          kind: "reserve",
        },
        entries: [
          {
            account,
            direction: "DEBIT",
            amount,
          },
          {
            account: pending,
            direction: "CREDIT",
            amount,
          },
        ],
        transaction: t,
      });

      await created.update(
        { reserveLedgerTransactionId: reserveResult.transaction.id },
        { transaction: t }
      );

      return created;
    });
  } catch (error) {
    if (
      error.name === "SequelizeUniqueConstraintError" ||
      error.parent?.code === "ER_DUP_ENTRY"
    ) {
      const raced = await Payout.findOne({
        where: { merchantId, idempotencyKey },
      });
      if (raced) {
        if (raced.requestHash !== requestHash) {
          throw new PayoutError(
            "Idempotency-Key was reused with a different payout request",
            "IDEMPOTENCY_CONFLICT",
            409
          );
        }
        return { payout: raced, replayed: true };
      }
    }
    throw error;
  }

  /* Provider submission — outside DB transaction */
  const provider = getPayoutProvider();

  let providerResult;
  try {
    providerResult = await provider.initiatePayout({
      amountKobo: amount,
      reference: payout.id,
      narration: payout.narration,
      bankCode: payout.bankCode,
      accountNumber: payout.accountNumber,
      accountName: payout.accountName,
      currency: payout.currency,
      sourceAccountNumber: envConfig.MONNIFY_PAYOUT_SOURCE_ACCOUNT,
      async: envConfig.MONNIFY_PAYOUT_ASYNC,
    });
  } catch (providerError) {
    console.error("Payout provider submission failed", {
      payoutId: payout.id,
      errorCode: providerError.code,
      errorMessage: providerError.message,
    });

    await payout.update({
      provider: envConfig.PAYMENT_PROVIDER || "MONNIFY",
      providerStatus: "UNKNOWN",
      failureCode: providerError.code || "PROVIDER_ERROR",
      failureReason: providerError.message,
      metadata: {
        ...(payout.metadata || {}),
        providerSubmissionError: {
          code: providerError.code,
          message: providerError.message,
        },
      },
    });

    return { payout, replayed: false, providerError };
  }

  const normalizedStatus = normalizeProviderStatus(providerResult.providerStatus);

  await payout.update({
    provider: envConfig.PAYMENT_PROVIDER || "MONNIFY",
    providerReference: providerResult.providerReference || null,
    providerStatus: providerResult.providerStatus || "PENDING",
    providerMetadata: {
      submission: providerResult.rawResponse || null,
    },
    status: normalizedStatus,
    processingAt: normalizedStatus === "PROCESSING" ? new Date() : null,
    completedAt: normalizedStatus === "SUCCESS" ? new Date() : null,
    failedAt: normalizedStatus === "FAILED" ? new Date() : null,
  });

  if (normalizedStatus === "SUCCESS") {
    await settleReservedFunds({ payout });
  }

  if (normalizedStatus === "FAILED") {
    await releaseReservedFunds({
      payout,
      reason: providerResult.rawResponse?.message || "Provider rejected payout",
    });
  }

  return { payout: await payout.reload(), replayed: false };
}

/* =========================================================
 * STATUS NORMALIZATION
 * ======================================================= */

function normalizeProviderStatus(providerStatus) {
  const s = String(providerStatus || "").toUpperCase();
  if (s === "SUCCESS" || s === "SUCCESSFUL" || s === "COMPLETED") return "SUCCESS";
  if (s === "FAILED" || s === "REJECTED" || s === "ERROR") return "FAILED";
  if (s === "REVERSED") return "REVERSED";
  if (s === "PENDING" || s === "PROCESSING" || s === "IN_PROGRESS") {
    return "PROCESSING";
  }
  return "PROCESSING";
}

/* =========================================================
 * SETTLE / RELEASE / REVERSE
 * ======================================================= */

export async function settleReservedFunds({ payout }) {
  if (!payout) throw new PayoutError("payout is required", "PAYOUT_REQUIRED", 400);

  const pending = await LedgerAccount.findOne({
    where: {
      merchantId: payout.merchantId,
      type: "MERCHANT_PENDING",
      currency: payout.currency,
    },
  });
  const clearing = await LedgerAccount.findOne({
    where: { merchantId: null, type: "CLEARING", currency: payout.currency },
  });

  if (!pending || !clearing) {
    throw new PayoutError(
      "Missing ledger accounts for settlement",
      "LEDGER_ACCOUNTS_MISSING",
      500
    );
  }

  const result = await postLedgerTransaction({
    reference: `PAYOUT_SETTLE:${payout.id}`,
    type: "PAYOUT",
    merchantId: payout.merchantId,
    currency: payout.currency,
    metadata: { payoutId: payout.id, kind: "settle" },
    entries: [
      { account: pending, direction: "DEBIT", amount: Number(payout.amount) },
      { account: clearing, direction: "CREDIT", amount: Number(payout.amount) },
    ],
  });

  if (!payout.settleLedgerTransactionId) {
    await payout.update({
      settleLedgerTransactionId: result.transaction.id,
    });
  }

  return result;
}

export async function releaseReservedFunds({ payout, reason = null }) {
  if (!payout) throw new PayoutError("payout is required", "PAYOUT_REQUIRED", 400);

  const available = await LedgerAccount.findOne({
    where: {
      merchantId: payout.merchantId,
      type: "MERCHANT_AVAILABLE",
      currency: payout.currency,
    },
  });
  const pending = await LedgerAccount.findOne({
    where: {
      merchantId: payout.merchantId,
      type: "MERCHANT_PENDING",
      currency: payout.currency,
    },
  });

  if (!available || !pending) {
    throw new PayoutError(
      "Missing ledger accounts for release",
      "LEDGER_ACCOUNTS_MISSING",
      500
    );
  }

  const result = await postLedgerTransaction({
    reference: `PAYOUT_RELEASE:${payout.id}`,
    type: "PAYOUT",
    merchantId: payout.merchantId,
    currency: payout.currency,
    metadata: { payoutId: payout.id, kind: "release", reason },
    entries: [
      { account: pending, direction: "DEBIT", amount: Number(payout.amount) },
      { account: available, direction: "CREDIT", amount: Number(payout.amount) },
    ],
  });

  await payout.update({
    status: "FAILED",
    failureReason: reason || payout.failureReason || "Payout failed",
    failedAt: new Date(),
  });

  return result;
}

export async function reversePayout({ payout, reason = null }) {
  if (!payout) throw new PayoutError("payout is required", "PAYOUT_REQUIRED", 400);
  if (payout.status !== "SUCCESS") {
    throw new PayoutError(
      "Only SUCCESS payouts can be reversed",
      "INVALID_STATE_TRANSITION",
      409
    );
  }

  const available = await LedgerAccount.findOne({
    where: {
      merchantId: payout.merchantId,
      type: "MERCHANT_AVAILABLE",
      currency: payout.currency,
    },
  });
  const clearing = await LedgerAccount.findOne({
    where: { merchantId: null, type: "CLEARING", currency: payout.currency },
  });

  if (!available || !clearing) {
    throw new PayoutError(
      "Missing ledger accounts for reversal",
      "LEDGER_ACCOUNTS_MISSING",
      500
    );
  }

  const result = await postLedgerTransaction({
    reference: `PAYOUT_REVERSAL:${payout.id}`,
    type: "REVERSAL",
    merchantId: payout.merchantId,
    currency: payout.currency,
    metadata: { payoutId: payout.id, kind: "reversal", reason },
    entries: [
      { account: clearing, direction: "DEBIT", amount: Number(payout.amount) },
      { account: available, direction: "CREDIT", amount: Number(payout.amount) },
    ],
  });

  await payout.update({
    status: "REVERSED",
    reversedAt: new Date(),
    failureReason: reason || payout.failureReason || "Payout reversed",
  });

  return result;
}

/* =========================================================
 * QUERY
 * ======================================================= */

export async function getPayoutForMerchant({ merchantId, payoutId }) {
  return Payout.findOne({
    where: { id: payoutId, merchantId },
  });
}

export async function listPayoutsForMerchant({
  merchantId,
  status = null,
  page = 1,
  limit = 20,
}) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const where = { merchantId };
  if (status) where.status = status;

  const { count, rows } = await Payout.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });

  return {
    payouts: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit) || 0,
    },
  };
}

export async function listAllPayouts({
  merchantId = null,
  status = null,
  page = 1,
  limit = 20,
} = {}) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const where = {};
  if (merchantId) where.merchantId = merchantId;
  if (status) where.status = status;

  const { count, rows } = await Payout.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  });

  return {
    payouts: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit) || 0,
    },
  };
}

/* =========================================================
 * PROVIDER STATUS REFRESH
 * ======================================================= */

export async function refreshPayoutFromProvider({ payoutId }) {
  const payout = await Payout.findByPk(payoutId);
  if (!payout) {
    throw new PayoutError("Payout not found", "PAYOUT_NOT_FOUND", 404);
  }
  if (!payout.providerReference) {
    throw new PayoutError(
      "Payout has no provider reference",
      "PROVIDER_REFERENCE_MISSING",
      500
    );
  }
  if (
    payout.status === "SUCCESS" ||
    payout.status === "FAILED" ||
    payout.status === "REVERSED"
  ) {
    return { payout, changed: false };
  }

  const provider = getPayoutProvider();
  const statusResult = await provider.getPayoutStatus({
    reference: payout.providerReference,
  });

  const normalized = normalizeProviderStatus(statusResult.providerStatus);

  if (normalized === payout.status) {
    await payout.update({
      providerStatus: statusResult.providerStatus,
    });
    return { payout, changed: false };
  }

  if (normalized === "SUCCESS") {
    await payout.update({
      status: "SUCCESS",
      providerStatus: statusResult.providerStatus,
      completedAt: new Date(),
    });
    await settleReservedFunds({ payout });
    return { payout: await payout.reload(), changed: true };
  }

  if (normalized === "FAILED") {
    await payout.update({
      providerStatus: statusResult.providerStatus,
      failureCode: statusResult.failureCode || null,
      failureReason: statusResult.failureMessage || null,
    });
    await releaseReservedFunds({
      payout,
      reason: statusResult.failureMessage || "Provider marked failed",
    });
    return { payout: await payout.reload(), changed: true };
  }

  return { payout, changed: false };
}