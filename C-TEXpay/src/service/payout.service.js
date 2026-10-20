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
import { computeServiceFee, resolveFeeConfiguration } from "./fee.service.js";
import { encryptApiKeyValue, decryptApiKeyValue } from "./apiKey.service.js";

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

function assertFeeMode(mode) {
  if (!["FEE_ON_TOP", "DEDUCT_FROM_AMOUNT"].includes(mode)) {
    throw new PayoutError("feeMode must be FEE_ON_TOP or DEDUCT_FROM_AMOUNT", "INVALID_FEE_MODE", 400);
  }
}

export function getPayoutAmounts(amount, feeMode, configuration) {
  const calculated = configuration
    ? computeServiceFee({
        grossAmount: amount,
        percentageRateBps: configuration.percentageRateBps,
        fixedAmount: Number(configuration.fixedAmount),
        minimumFee: Number(configuration.minimumFee),
        maximumFee: configuration.maximumFee === null ? null : Number(configuration.maximumFee),
      })
    : { serviceFee: 0, calculation: "no-config" };
  const feeAmount = calculated.serviceFee;
  const walletDebitAmount = feeMode === "FEE_ON_TOP" ? amount + feeAmount : amount;
  const beneficiaryAmount = feeMode === "FEE_ON_TOP" ? amount : amount - feeAmount;
  if (beneficiaryAmount <= 0 || walletDebitAmount > MAX_PAYOUT_DEBIT) {
    throw new PayoutError("Payout amount is outside the supported range after fees", "PAYOUT_AMOUNT_OUT_OF_RANGE", 400);
  }
  return {
    feeAmount,
    walletDebitAmount,
    beneficiaryAmount,
    feeSnapshot: {
      feeMode,
      calculation: calculated.calculation,
      feeConfigurationId: configuration?.id || null,
      percentageRateBps: configuration?.percentageRateBps ?? 0,
      fixedAmount: configuration ? Number(configuration.fixedAmount) : 0,
      minimumFee: configuration ? Number(configuration.minimumFee) : 0,
      maximumFee: configuration?.maximumFee == null ? null : Number(configuration.maximumFee),
    },
  };
}

const MAX_PAYOUT_DEBIT = envConfig.PAYOUT_MAX_AMOUNT || 500_000_000;

function encryptAccountNumber(value) {
  return `enc:v1:${encryptApiKeyValue(String(value))}`;
}

function decryptAccountNumber(value) {
  const text = String(value || "");
  return text.startsWith("enc:v1:") ? decryptApiKeyValue(text.slice(7)) : text;
}

function safePayoutResponse(body) {
  if (!body || typeof body !== "object") return null;
  const safe = {};
  for (const key of ["reference", "transactionReference", "status", "amount", "currency", "fee", "dateCreated", "createdOn", "responseCode", "destinationBankName"]) {
    if (body[key] !== undefined) safe[key] = body[key];
  }
  return safe;
}

export async function quotePayout({ merchantId, amount, currency = "NGN", feeMode = "FEE_ON_TOP" }) {
  assertPayoutAmount(amount);
  assertFeeMode(feeMode);
  const configuration = await resolveFeeConfiguration({
    merchantId,
    currency,
    paymentMethod: "ACCOUNT_TRANSFER",
  });
  return { amount, currency, ...getPayoutAmounts(amount, feeMode, configuration) };
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
  feeMode,
}) {
  const request = {
    merchantId,
    amount,
    currency,
    bankCode,
    accountNumber,
    narration: narration || null,
  };
  if (feeMode !== undefined) request.feeMode = feeMode;
  const canonical = stableStringify(request);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/* =========================================================
 * BANK ACCOUNT VALIDATION
 * ======================================================= */

let payoutBanksCache = { expiresAt: 0, banks: [] };

export async function listPayoutBanks() {
  if (payoutBanksCache.expiresAt > Date.now() && payoutBanksCache.banks.length) {
    return payoutBanksCache.banks;
  }
  let provider;
  try {
    provider = getPayoutProvider();
  } catch (error) {
    throw new PayoutError("Bank payouts are not available", error.code || "PAYOUT_PROVIDER_UNAVAILABLE", 503);
  }
  if (typeof provider.getBanks !== "function") {
    throw new PayoutError("Bank directory is unavailable", "BANK_DIRECTORY_UNAVAILABLE", 503);
  }
  try {
    const banks = await provider.getBanks();
    payoutBanksCache = { banks, expiresAt: Date.now() + 60 * 60 * 1000 };
    return banks;
  } catch (error) {
    console.error("Payout bank directory fetch failed", { errorCode: error.code });
    throw new PayoutError("Unable to load supported banks", error.code || "PROVIDER_ERROR", 502);
  }
}

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
      bankName: result.bankName || null,
    };
  } catch (providerError) {
    console.error("Bank validation failed", {
      bankCode,
      errorCode: providerError.code,
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
  feeMode = "FEE_ON_TOP",
}) {
  if (!merchantId) {
    throw new PayoutError("merchantId is required", "MERCHANT_REQUIRED", 400);
  }

  assertPayoutAmount(amount);
  assertBankFields({ bankCode, accountNumber, accountName });
  assertIdempotencyKey(idempotencyKey);
  assertFeeMode(feeMode);

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
    feeMode,
  });

  /* Fast-path idempotency check */
  const existing = await Payout.findOne({
    where: { merchantId, idempotencyKey },
  });
  if (existing) {
    const legacyRequestHash = feeMode === "FEE_ON_TOP"
      ? computeRequestHash({ merchantId, amount, currency, bankCode, accountNumber, narration })
      : null;
    if (existing.requestHash !== requestHash && existing.requestHash !== legacyRequestHash) {
      throw new PayoutError(
        "Idempotency-Key was reused with a different payout request",
        "IDEMPOTENCY_CONFLICT",
        409
      );
    }
    return { payout: existing, replayed: true };
  }

  // Select the disbursement rail independently from collection payments and
  // fail before reserving funds if no compatible provider is configured.
  let provider;
  try {
    provider = getPayoutProvider();
  } catch {
    throw new PayoutError(
      "Bank payouts are not available for the configured provider",
      "PAYOUT_PROVIDER_UNAVAILABLE",
      503,
    );
  }
  if (!envConfig.MONNIFY_PAYOUT_SOURCE_ACCOUNT) {
    throw new PayoutError("Payout source account is not configured", "PAYOUT_SOURCE_ACCOUNT_MISSING", 503);
  }

  // Do not trust the beneficiary name supplied by the browser. Use the name
  // returned by provider account enquiry for the actual payout submission.
  const validatedDestination = await validateBankAccount({ bankCode, accountNumber });
  const verifiedAccountName = validatedDestination.accountName;

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

      const feeConfiguration = await resolveFeeConfiguration({
        merchantId,
        currency,
        paymentMethod: "ACCOUNT_TRANSFER",
        transaction: t,
      });
      const amounts = getPayoutAmounts(amount, feeMode, feeConfiguration);

      /* Recompute balance from ledger entries inside the lock. */
      const balance = await getAvailableBalance({ merchantId, currency, transaction: t });
      if (balance < amounts.walletDebitAmount) {
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
          feeMode,
          feeAmount: amounts.feeAmount,
          walletDebitAmount: amounts.walletDebitAmount,
          beneficiaryAmount: amounts.beneficiaryAmount,
          feeConfigurationId: feeConfiguration?.id || null,
          feeSnapshot: amounts.feeSnapshot,
          currency,
          bankCode: validatedDestination.bankCode,
          accountNumber: encryptAccountNumber(validatedDestination.accountNumber),
          accountNumberLast4: validatedDestination.accountNumber.slice(-4),
          accountName: verifiedAccountName,
          narration: narration || null,
          merchantReference: merchantReference || null,
          idempotencyKey,
          requestHash,
          status: "PENDING",
          initiatedAt: new Date(),
          metadata,
          providerMetadata: validatedDestination.bankName
            ? { beneficiaryBankName: validatedDestination.bankName }
            : null,
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
            amount: amounts.walletDebitAmount,
          },
          {
            account: pending,
            direction: "CREDIT",
            amount: amounts.walletDebitAmount,
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

  let providerResult;
  try {
    providerResult = await provider.initiatePayout({
      amountKobo: Number(payout.beneficiaryAmount),
      reference: payout.id,
      narration: payout.narration,
      bankCode: payout.bankCode,
      accountNumber: decryptAccountNumber(payout.accountNumber),
      accountName: payout.accountName,
      currency: payout.currency,
      sourceAccountNumber: envConfig.MONNIFY_PAYOUT_SOURCE_ACCOUNT,
      async: envConfig.MONNIFY_PAYOUT_ASYNC,
    });
  } catch (providerError) {
    console.error("Payout provider submission failed", {
      payoutId: payout.id,
      errorCode: providerError.code,
    });

    await payout.update({
      provider: envConfig.PAYOUT_PROVIDER || "MONNIFY",
      // The deterministic request reference is the lookup key for ambiguous
      // timeouts. Reconciliation can query it without submitting a second payout.
      providerReference: payout.id,
      providerStatus: "UNKNOWN",
      failureCode: providerError.code || "PROVIDER_ERROR",
      failureReason: "Provider outcome is pending reconciliation",
      metadata: {
        ...(payout.metadata || {}),
        providerSubmissionError: {
          code: providerError.code,
        },
      },
    });

    return { payout, replayed: false, providerError };
  }

  const normalizedStatus = normalizeProviderStatus(providerResult.providerStatus);

  await payout.update({
    provider: envConfig.PAYOUT_PROVIDER || "MONNIFY",
    providerReference: providerResult.providerReference || payout.id,
    providerStatus: providerResult.providerStatus || "PENDING",
    providerMetadata: {
      ...(payout.providerMetadata || {}),
      submission: safePayoutResponse(providerResult.rawResponse),
    },
    ...(normalizedStatus === "PROCESSING" ? { status: "PROCESSING", processingAt: new Date() } : {}),
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

  if (normalizedStatus === "REVERSED") {
    await releaseReservedFunds({ payout, reason: "Provider reversed payout before settlement" });
    await payout.update({ status: "REVERSED", reversedAt: new Date() });
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
  return sequelize.transaction(async (t) => {
    const current = await Payout.findByPk(payout.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!current) throw new PayoutError("Payout not found", "PAYOUT_NOT_FOUND", 404);
    if (current.status === "SUCCESS" && current.settleLedgerTransactionId) return { transaction: await LedgerTransaction.findByPk(current.settleLedgerTransactionId, { transaction: t }), created: false };
    if (["FAILED", "REVERSED"].includes(current.status)) throw new PayoutError("Cannot settle a terminal payout", "INVALID_STATE_TRANSITION", 409);
    const pending = await LedgerAccount.findOne({ where: { merchantId: current.merchantId, type: "MERCHANT_PENDING", currency: current.currency }, transaction: t, lock: t.LOCK.UPDATE });
    const clearing = await LedgerAccount.findOrCreate({ where: { merchantId: null, type: "CLEARING", currency: current.currency }, defaults: { merchantId: null, type: "CLEARING", currency: current.currency }, transaction: t }).then(([row]) => row);
    const revenue = await LedgerAccount.findOrCreate({ where: { merchantId: null, type: "CTEX_FEE_REVENUE", currency: current.currency }, defaults: { merchantId: null, type: "CTEX_FEE_REVENUE", currency: current.currency }, transaction: t }).then(([row]) => row);
    if (!pending) throw new PayoutError("Missing ledger account for settlement", "LEDGER_ACCOUNTS_MISSING", 500);
    const entries = [
      { account: pending, direction: "DEBIT", amount: Number(current.walletDebitAmount ?? current.amount) },
      { account: clearing, direction: "CREDIT", amount: Number(current.beneficiaryAmount ?? current.amount) },
    ];
    if (Number(current.feeAmount || 0) > 0) entries.push({ account: revenue, direction: "CREDIT", amount: Number(current.feeAmount) });
    const result = await postLedgerTransaction({ reference: `PAYOUT_SETTLE:${current.id}`, type: "PAYOUT", merchantId: current.merchantId, currency: current.currency, metadata: { payoutId: current.id, kind: "settle", feeAmount: Number(current.feeAmount || 0) }, entries, transaction: t });
    await current.update({ status: "SUCCESS", completedAt: current.completedAt || new Date(), settleLedgerTransactionId: result.transaction.id }, { transaction: t });
    return result;
  });
}

export async function releaseReservedFunds({ payout, reason = null }) {
  if (!payout) throw new PayoutError("payout is required", "PAYOUT_REQUIRED", 400);
  return sequelize.transaction(async (t) => {
    const current = await Payout.findByPk(payout.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!current) throw new PayoutError("Payout not found", "PAYOUT_NOT_FOUND", 404);
    if (current.status === "FAILED") return { transaction: await LedgerTransaction.findOne({ where: { reference: `PAYOUT_RELEASE:${current.id}`, currency: current.currency }, transaction: t }), created: false };
    if (["SUCCESS", "REVERSED"].includes(current.status)) throw new PayoutError("Cannot release a terminal payout", "INVALID_STATE_TRANSITION", 409);
    const available = await LedgerAccount.findOne({ where: { merchantId: current.merchantId, type: "MERCHANT_AVAILABLE", currency: current.currency }, transaction: t, lock: t.LOCK.UPDATE });
    const pending = await LedgerAccount.findOne({ where: { merchantId: current.merchantId, type: "MERCHANT_PENDING", currency: current.currency }, transaction: t, lock: t.LOCK.UPDATE });
    if (!available || !pending) throw new PayoutError("Missing ledger accounts for release", "LEDGER_ACCOUNTS_MISSING", 500);
    const result = await postLedgerTransaction({ reference: `PAYOUT_RELEASE:${current.id}`, type: "PAYOUT", merchantId: current.merchantId, currency: current.currency, metadata: { payoutId: current.id, kind: "release" }, entries: [
      { account: pending, direction: "DEBIT", amount: Number(current.walletDebitAmount ?? current.amount) },
      { account: available, direction: "CREDIT", amount: Number(current.walletDebitAmount ?? current.amount) },
    ], transaction: t });
    await current.update({ status: "FAILED", failureReason: reason || current.failureReason || "Payout failed", failedAt: current.failedAt || new Date() }, { transaction: t });
    return result;
  });
}

export async function reversePayout({ payout, reason = null }) {
  if (!payout) throw new PayoutError("payout is required", "PAYOUT_REQUIRED", 400);
  return sequelize.transaction(async (t) => {
    const current = await Payout.findByPk(payout.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (current?.status !== "SUCCESS") throw new PayoutError("Only SUCCESS payouts can be reversed", "INVALID_STATE_TRANSITION", 409);
    const available = await LedgerAccount.findOne({ where: { merchantId: current.merchantId, type: "MERCHANT_AVAILABLE", currency: current.currency }, transaction: t, lock: t.LOCK.UPDATE });
    const clearing = await LedgerAccount.findOne({ where: { merchantId: null, type: "CLEARING", currency: current.currency }, transaction: t, lock: t.LOCK.UPDATE });
    const revenue = Number(current.feeAmount || 0) > 0
      ? await LedgerAccount.findOne({ where: { merchantId: null, type: "CTEX_FEE_REVENUE", currency: current.currency }, transaction: t, lock: t.LOCK.UPDATE })
      : null;
    if (!available || !clearing || (Number(current.feeAmount || 0) > 0 && !revenue)) throw new PayoutError("Missing ledger accounts for reversal", "LEDGER_ACCOUNTS_MISSING", 500);
    const entries = [
      { account: clearing, direction: "DEBIT", amount: Number(current.beneficiaryAmount ?? current.amount) },
      { account: available, direction: "CREDIT", amount: Number(current.walletDebitAmount ?? current.amount) },
    ];
    if (Number(current.feeAmount || 0) > 0) entries.push({ account: revenue, direction: "DEBIT", amount: Number(current.feeAmount) });
    const result = await postLedgerTransaction({ reference: `PAYOUT_REVERSAL:${current.id}`, type: "REVERSAL", merchantId: current.merchantId, currency: current.currency, metadata: { payoutId: current.id, kind: "reversal", reason }, entries, transaction: t });
    await current.update({ status: "REVERSED", reversedAt: new Date(), failureReason: reason || current.failureReason || "Payout reversed" }, { transaction: t });
    return result;
  });
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
    await payout.update({ providerStatus: statusResult.providerStatus });
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

  if (normalized === "REVERSED") {
    if (payout.status === "SUCCESS") {
      await reversePayout({ payout, reason: "Provider reversed payout" });
    } else {
      await releaseReservedFunds({ payout, reason: "Provider reversed payout before settlement" });
      await payout.update({ status: "REVERSED", reversedAt: new Date() });
    }
    return { payout: await payout.reload(), changed: true };
  }

  return { payout, changed: false };
}

export async function authorizePayout({ merchantId, payoutId, authorizationCode }) {
  if (!/^\d{4,10}$/.test(String(authorizationCode || ""))) {
    throw new PayoutError("Invalid authorization code", "INVALID_AUTHORIZATION_CODE", 400);
  }
  const payout = await Payout.findOne({ where: { id: payoutId, merchantId } });
  if (!payout) throw new PayoutError("Payout not found", "PAYOUT_NOT_FOUND", 404);
  if (payout.status !== "PROCESSING" || payout.providerStatus !== "PENDING_AUTHORIZATION") {
    throw new PayoutError("Payout is not waiting for provider authorization", "INVALID_STATE_TRANSITION", 409);
  }
  const provider = getPayoutProvider();
  if (typeof provider.authorizePayout !== "function") {
    throw new PayoutError("Configured payout provider does not support authorization", "PAYOUT_AUTHORIZATION_UNSUPPORTED", 409);
  }
  const result = await provider.authorizePayout({
    reference: payout.providerReference || payout.id,
    authorizationCode: String(authorizationCode),
  });
  const normalized = normalizeProviderStatus(result.providerStatus);
  await payout.update({
    providerStatus: result.providerStatus,
    providerMetadata: { ...(payout.providerMetadata || {}), authorizationStatus: safePayoutResponse(result.rawResponse) },
  });
  if (normalized === "SUCCESS") await settleReservedFunds({ payout });
  else if (normalized === "FAILED") await releaseReservedFunds({ payout, reason: "Provider rejected authorized payout" });
  else await payout.update({ status: "PROCESSING", processingAt: payout.processingAt || new Date() });
  return payout.reload();
}
