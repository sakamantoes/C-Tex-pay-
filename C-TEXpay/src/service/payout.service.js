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
import { computeServiceFee } from "./fee.service.js";
import { calculateWithdrawalCharges } from "./withdrawalFee.service.js";
import { encryptApiKeyValue, decryptApiKeyValue } from "./apiKey.service.js";

/*
 * Optional import — the payout service does not fail to load if this module
 * does not export `majorToMinor`. We use `safeMajorToMinor` as the actual
 * call site, which falls back to local conversion when the import is
 * undefined (deploy skew, partial rollouts, etc.).
 */
import * as paymentFinancialsModule from "./paymentFinancials.service.js";

const externalMajorToMinor =
  typeof paymentFinancialsModule.majorToMinor === "function"
    ? paymentFinancialsModule.majorToMinor
    : null;

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const MIN_AMOUNT = envConfig.PAYOUT_MIN_AMOUNT || 10_000;
const MAX_AMOUNT = envConfig.PAYOUT_MAX_AMOUNT || 500_000_000;
const MAX_PAYOUT_DEBIT = MAX_AMOUNT;

const ALLOWED_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "REVERSED",
];

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
 * HELPERS
 * ======================================================= */

function safeMajorToMinor(value) {
  if (externalMajorToMinor) {
    try {
      const result = externalMajorToMinor(value);
      if (result === null || result === undefined) return null;
      const n = Number(result);
      return Number.isFinite(n) ? Math.round(n) : null;
    } catch {
      // fall through to local conversion
    }
  }
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

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
 * VALIDATION
 * ======================================================= */

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
    throw new PayoutError("bankCode must be 3-10 digits", "INVALID_BANK_CODE", 400);
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
    throw new PayoutError(
      "feeMode must be FEE_ON_TOP or DEDUCT_FROM_AMOUNT",
      "INVALID_FEE_MODE",
      400
    );
  }
}

function assertStatusFilter(status) {
  if (status && !ALLOWED_STATUSES.includes(status)) {
    throw new PayoutError(
      "Invalid payout status filter",
      "INVALID_STATUS_FILTER",
      400
    );
  }
}

/* =========================================================
 * AMOUNT SPLITTING
 * ======================================================= */

export function getPayoutAmounts(amount, feeMode, configuration) {
  const calculated = configuration
    ? computeServiceFee({
        grossAmount: amount,
        percentageRateBps: configuration.percentageRateBps,
        fixedAmount: Number(configuration.fixedAmount),
        minimumFee: Number(configuration.minimumFee),
        maximumFee:
          configuration.maximumFee === null
            ? null
            : Number(configuration.maximumFee),
      })
    : { serviceFee: 0, calculation: "no-config" };

  const feeAmount = calculated.serviceFee;
  const walletDebitAmount =
    feeMode === "FEE_ON_TOP" ? amount + feeAmount : amount;
  const beneficiaryAmount =
    feeMode === "FEE_ON_TOP" ? amount : amount - feeAmount;

  if (beneficiaryAmount <= 0 || walletDebitAmount > MAX_PAYOUT_DEBIT) {
    throw new PayoutError(
      "Payout amount is outside the supported range after fees",
      "PAYOUT_AMOUNT_OUT_OF_RANGE",
      400
    );
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
      maximumFee:
        configuration?.maximumFee == null
          ? null
          : Number(configuration.maximumFee),
    },
  };
}

/* =========================================================
 * ENCRYPTION HELPERS
 * ======================================================= */

function encryptAccountNumber(value) {
  return `enc:v1:${encryptApiKeyValue(String(value))}`;
}

function decryptAccountNumber(value) {
  const text = String(value || "");
  return text.startsWith("enc:v1:")
    ? decryptApiKeyValue(text.slice(7))
    : text;
}

function safePayoutResponse(body) {
  if (!body || typeof body !== "object") return null;
  const safe = {};
  for (const key of [
    "reference",
    "transactionReference",
    "status",
    "amount",
    "currency",
    "fee",
    "totalFee",
    "dateCreated",
    "createdOn",
    "responseCode",
    "destinationBankName",
  ]) {
    if (body[key] !== undefined) safe[key] = body[key];
  }
  return safe;
}

/* =========================================================
 * QUOTE
 * ======================================================= */

export async function quotePayout({
  merchantId,
  amount,
  currency = "NGN",
  feeMode = "FEE_ON_TOP",
}) {
  assertPayoutAmount(amount);
  assertFeeMode(feeMode);
  const calculated = await calculateWithdrawalCharges({ amount, feeMode });
  if (calculated.walletDebitAmount > MAX_PAYOUT_DEBIT) {
    throw new PayoutError(
      "Payout amount is outside the supported range after fees",
      "PAYOUT_AMOUNT_OUT_OF_RANGE",
      400
    );
  }
  return { currency, ...calculated };
}

/* =========================================================
 * BANKS + ACCOUNT VALIDATION
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
    throw new PayoutError(
      "Bank payouts are not available",
      error.code || "PAYOUT_PROVIDER_UNAVAILABLE",
      503
    );
  }
  if (typeof provider.getBanks !== "function") {
    throw new PayoutError(
      "Bank directory is unavailable",
      "BANK_DIRECTORY_UNAVAILABLE",
      503
    );
  }
  try {
    const banks = await provider.getBanks();
    payoutBanksCache = { banks, expiresAt: Date.now() + 60 * 60 * 1000 };
    return banks;
  } catch (error) {
    console.error("Payout bank directory fetch failed", {
      errorCode: error.code,
    });
    throw new PayoutError(
      "Unable to load supported banks",
      error.code || "PROVIDER_ERROR",
      502
    );
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
 * Concurrency:
 *   Merchant row is locked inside the DB transaction. This is the single
 *   serialization point for all financial operations on that merchant.
 *
 * Ledger:
 *   Reserve is posted in the SAME DB transaction as payout creation.
 *   Provider submission happens OUTSIDE the transaction to keep locks
 *   short-lived.
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

  /* Fast-path idempotency */
  const existing = await Payout.findOne({
    where: { merchantId, idempotencyKey },
  });
  if (existing) {
    const legacyRequestHash =
      feeMode === "FEE_ON_TOP"
        ? computeRequestHash({
            merchantId,
            amount,
            currency,
            bankCode,
            accountNumber,
            narration,
          })
        : null;
    if (
      existing.requestHash !== requestHash &&
      existing.requestHash !== legacyRequestHash
    ) {
      throw new PayoutError(
        "Idempotency-Key was reused with a different payout request",
        "IDEMPOTENCY_CONFLICT",
        409
      );
    }
    return { payout: existing, replayed: true };
  }

  /* Provider selection */
  const payoutProviderName = String(
    envConfig.PAYOUT_PROVIDER || "MONNIFY"
  ).toUpperCase();
  let provider;
  try {
    provider = getPayoutProvider(payoutProviderName);
  } catch {
    throw new PayoutError(
      "Bank payouts are not available for the configured provider",
      "PAYOUT_PROVIDER_UNAVAILABLE",
      503
    );
  }
  if (
    payoutProviderName === "MONNIFY" &&
    !envConfig.MONNIFY_PAYOUT_SOURCE_ACCOUNT
  ) {
    throw new PayoutError(
      "Payout source account is not configured",
      "PAYOUT_SOURCE_ACCOUNT_MISSING",
      503
    );
  }
  if (
    payoutProviderName === "XIXAPAY" &&
    (!envConfig.XIXAPAY_API_KEY ||
      !envConfig.XIXAPAY_API_SECRET ||
      !envConfig.XIXAPAY_BUSINESS_ID)
  ) {
    throw new PayoutError(
      "Xixapay payout credentials or business ID are not configured",
      "PAYOUT_PROVIDER_NOT_CONFIGURED",
      503
    );
  }

  /* Resolve authoritative beneficiary name from provider */
  const validatedDestination = await validateBankAccount({
    bankCode,
    accountNumber,
  });
  const verifiedAccountName = validatedDestination.accountName;

  /* Atomic creation + reservation */
  let payout;
  try {
    payout = await sequelize.transaction(async (t) => {
      // Serialize all payouts for this merchant
      await Merchant.findByPk(merchantId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

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

      const amounts = await calculateWithdrawalCharges({
        amount,
        feeMode,
        transaction: t,
      });
      if (amounts.walletDebitAmount > MAX_PAYOUT_DEBIT) {
        throw new PayoutError(
          "Payout amount is outside the supported range after fees",
          "PAYOUT_AMOUNT_OUT_OF_RANGE",
          400
        );
      }

      const balance = await getAvailableBalance({
        merchantId,
        currency,
        transaction: t,
      });
      if (balance < amounts.walletDebitAmount) {
        throw new PayoutError(
          "Insufficient available balance",
          "INSUFFICIENT_BALANCE",
          400
        );
      }

      const created = await Payout.create(
        {
          merchantId,
          provider: payoutProviderName,
          amount,
          feeMode,
          feeAmount: amounts.feeAmount,
          walletDebitAmount: amounts.walletDebitAmount,
          beneficiaryAmount: amounts.beneficiaryAmount,
          feeConfigurationId: null,
          feeSnapshot: amounts.feeSnapshot,
          currency,
          bankCode: validatedDestination.bankCode,
          accountNumber: encryptAccountNumber(
            validatedDestination.accountNumber
          ),
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

      /* Reserve: DEBIT AVAILABLE / CREDIT PENDING */
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

  /* Provider submission — OUTSIDE DB transaction */
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
      businessId: envConfig.XIXAPAY_BUSINESS_ID,
      async: envConfig.MONNIFY_PAYOUT_ASYNC,
    });
  } catch (providerError) {
    console.error("Payout provider submission failed", {
      payoutId: payout.id,
      errorCode: providerError.code,
    });

    await payout.update({
      provider: payout.provider || payoutProviderName,
      providerReference:
        providerError.providerResponse?.reference || payout.id,
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

  const normalizedStatus = normalizeProviderStatus(
    providerResult.providerStatus
  );

  await payout.update({
    provider: payout.provider || payoutProviderName,
    providerReference: providerResult.providerReference || payout.id,
    providerStatus: providerResult.providerStatus || "PENDING",
    providerFeeReported: safeMajorToMinor(
      providerResult.rawResponse?.totalFee ?? providerResult.rawResponse?.fee
    ),
    providerMetadata: {
      ...(payout.providerMetadata || {}),
      submission: safePayoutResponse(providerResult.rawResponse),
    },
    ...(normalizedStatus === "PROCESSING"
      ? { status: "PROCESSING", processingAt: new Date() }
      : {}),
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
    await releaseReservedFunds({
      payout,
      reason: "Provider reversed payout before settlement",
    });
    await payout.update({ status: "REVERSED", reversedAt: new Date() });
  }

  return { payout: await payout.reload(), replayed: false };
}

/* =========================================================
 * STATUS NORMALIZATION
 * ======================================================= */

function normalizeProviderStatus(providerStatus) {
  const s = String(providerStatus || "").toUpperCase();
  if (s === "SUCCESS" || s === "SUCCESSFUL" || s === "COMPLETED") {
    return "SUCCESS";
  }
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
  if (!payout) {
    throw new PayoutError("payout is required", "PAYOUT_REQUIRED", 400);
  }

  return sequelize.transaction(async (t) => {
    const current = await Payout.findByPk(payout.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!current) {
      throw new PayoutError("Payout not found", "PAYOUT_NOT_FOUND", 404);
    }
    if (current.status === "SUCCESS" && current.settleLedgerTransactionId) {
      return {
        transaction: await LedgerTransaction.findByPk(
          current.settleLedgerTransactionId,
          { transaction: t }
        ),
        created: false,
      };
    }
    if (["FAILED", "REVERSED"].includes(current.status)) {
      throw new PayoutError(
        "Cannot settle a terminal payout",
        "INVALID_STATE_TRANSITION",
        409
      );
    }

    const pending = await LedgerAccount.findOne({
      where: {
        merchantId: current.merchantId,
        type: "MERCHANT_PENDING",
        currency: current.currency,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const clearing = await LedgerAccount.findOrCreate({
      where: {
        merchantId: null,
        type: "CLEARING",
        currency: current.currency,
      },
      defaults: {
        merchantId: null,
        type: "CLEARING",
        currency: current.currency,
      },
      transaction: t,
    }).then(([row]) => row);
    const revenue = await LedgerAccount.findOrCreate({
      where: {
        merchantId: null,
        type: "CTEX_FEE_REVENUE",
        currency: current.currency,
      },
      defaults: {
        merchantId: null,
        type: "CTEX_FEE_REVENUE",
        currency: current.currency,
      },
      transaction: t,
    }).then(([row]) => row);

    if (!pending) {
      throw new PayoutError(
        "Missing ledger account for settlement",
        "LEDGER_ACCOUNTS_MISSING",
        500
      );
    }

    const walletDebit = Number(
      current.walletDebitAmount ?? current.amount
    );
    const beneficiary = Number(
      current.beneficiaryAmount ?? current.amount
    );
    const feeAmount = Number(current.feeAmount || 0);

    const entries = [
      { account: pending, direction: "DEBIT", amount: walletDebit },
      { account: clearing, direction: "CREDIT", amount: beneficiary },
    ];
    if (feeAmount > 0) {
      entries.push({ account: revenue, direction: "CREDIT", amount: feeAmount });
    }

    const result = await postLedgerTransaction({
      reference: `PAYOUT_SETTLE:${current.id}`,
      type: "PAYOUT",
      merchantId: current.merchantId,
      currency: current.currency,
      metadata: {
        payoutId: current.id,
        kind: "settle",
        feeAmount,
      },
      entries,
      transaction: t,
    });

    await current.update(
      {
        status: "SUCCESS",
        completedAt: current.completedAt || new Date(),
        settleLedgerTransactionId: result.transaction.id,
      },
      { transaction: t }
    );

    return result;
  });
}

export async function releaseReservedFunds({ payout, reason = null }) {
  if (!payout) {
    throw new PayoutError("payout is required", "PAYOUT_REQUIRED", 400);
  }

  return sequelize.transaction(async (t) => {
    const current = await Payout.findByPk(payout.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!current) {
      throw new PayoutError("Payout not found", "PAYOUT_NOT_FOUND", 404);
    }
    if (current.status === "FAILED") {
      return {
        transaction: await LedgerTransaction.findOne({
          where: {
            reference: `PAYOUT_RELEASE:${current.id}`,
            currency: current.currency,
          },
          transaction: t,
        }),
        created: false,
      };
    }
    if (["SUCCESS", "REVERSED"].includes(current.status)) {
      throw new PayoutError(
        "Cannot release a terminal payout",
        "INVALID_STATE_TRANSITION",
        409
      );
    }

    const available = await LedgerAccount.findOne({
      where: {
        merchantId: current.merchantId,
        type: "MERCHANT_AVAILABLE",
        currency: current.currency,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const pending = await LedgerAccount.findOne({
      where: {
        merchantId: current.merchantId,
        type: "MERCHANT_PENDING",
        currency: current.currency,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!available || !pending) {
      throw new PayoutError(
        "Missing ledger accounts for release",
        "LEDGER_ACCOUNTS_MISSING",
        500
      );
    }

    const walletDebit = Number(
      current.walletDebitAmount ?? current.amount
    );

    const result = await postLedgerTransaction({
      reference: `PAYOUT_RELEASE:${current.id}`,
      type: "PAYOUT",
      merchantId: current.merchantId,
      currency: current.currency,
      metadata: { payoutId: current.id, kind: "release" },
      entries: [
        { account: pending, direction: "DEBIT", amount: walletDebit },
        { account: available, direction: "CREDIT", amount: walletDebit },
      ],
      transaction: t,
    });

    await current.update(
      {
        status: "FAILED",
        failureReason: reason || current.failureReason || "Payout failed",
        failedAt: current.failedAt || new Date(),
      },
      { transaction: t }
    );

    return result;
  });
}

export async function reversePayout({ payout, reason = null }) {
  if (!payout) {
    throw new PayoutError("payout is required", "PAYOUT_REQUIRED", 400);
  }

  return sequelize.transaction(async (t) => {
    const current = await Payout.findByPk(payout.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (current?.status !== "SUCCESS") {
      throw new PayoutError(
        "Only SUCCESS payouts can be reversed",
        "INVALID_STATE_TRANSITION",
        409
      );
    }

    const available = await LedgerAccount.findOne({
      where: {
        merchantId: current.merchantId,
        type: "MERCHANT_AVAILABLE",
        currency: current.currency,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const clearing = await LedgerAccount.findOne({
      where: {
        merchantId: null,
        type: "CLEARING",
        currency: current.currency,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const feeAmount = Number(current.feeAmount || 0);
    const revenue =
      feeAmount > 0
        ? await LedgerAccount.findOne({
            where: {
              merchantId: null,
              type: "CTEX_FEE_REVENUE",
              currency: current.currency,
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
          })
        : null;

    if (!available || !clearing || (feeAmount > 0 && !revenue)) {
      throw new PayoutError(
        "Missing ledger accounts for reversal",
        "LEDGER_ACCOUNTS_MISSING",
        500
      );
    }

    const beneficiary = Number(
      current.beneficiaryAmount ?? current.amount
    );
    const walletDebit = Number(
      current.walletDebitAmount ?? current.amount
    );

    const entries = [
      { account: clearing, direction: "DEBIT", amount: beneficiary },
      { account: available, direction: "CREDIT", amount: walletDebit },
    ];
    if (feeAmount > 0) {
      entries.push({ account: revenue, direction: "DEBIT", amount: feeAmount });
    }

    const result = await postLedgerTransaction({
      reference: `PAYOUT_REVERSAL:${current.id}`,
      type: "REVERSAL",
      merchantId: current.merchantId,
      currency: current.currency,
      metadata: {
        payoutId: current.id,
        kind: "reversal",
        reason,
      },
      entries,
      transaction: t,
    });

    await current.update(
      {
        status: "REVERSED",
        reversedAt: new Date(),
        failureReason: reason || current.failureReason || "Payout reversed",
      },
      { transaction: t }
    );

    return result;
  });
}

/* =========================================================
 * QUERY — SINGLE
 * ======================================================= */

export async function getPayoutForMerchant({ merchantId, payoutId }) {
  if (!payoutId) {
    throw new PayoutError("payoutId is required", "PAYOUT_ID_REQUIRED", 400);
  }

  const where = { id: payoutId };
  if (merchantId) where.merchantId = merchantId;

  try {
    return await Payout.findOne({ where });
  } catch (error) {
    console.error("getPayoutForMerchant failed", {
      merchantId: merchantId || null,
      payoutId,
      name: error?.name,
      sqlMessage: error?.parent?.sqlMessage,
      message: error?.message,
    });
    throw new PayoutError(
      "Unable to retrieve payout",
      "PAYOUT_GET_FAILED",
      500
    );
  }
}

/* =========================================================
 * QUERY — LISTS
 * ======================================================= */

export async function listPayoutsForMerchant({
  merchantId,
  status = null,
  page = 1,
  limit = 20,
}) {
  if (!merchantId) {
    throw new PayoutError("merchantId is required", "MERCHANT_REQUIRED", 400);
  }

  assertStatusFilter(status);

  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const where = { merchantId };
  if (status) where.status = status;

  try {
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
  } catch (error) {
    console.error("listPayoutsForMerchant failed", {
      merchantId,
      name: error?.name,
      sqlMessage: error?.parent?.sqlMessage,
      message: error?.message,
    });
    throw new PayoutError(
      "Unable to list payouts",
      "PAYOUT_LIST_FAILED",
      500
    );
  }
}

export async function listAllPayouts({
  merchantId = null,
  status = null,
  page = 1,
  limit = 20,
} = {}) {
  assertStatusFilter(status);

  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const where = {};
  if (merchantId) where.merchantId = merchantId;
  if (status) where.status = status;

  try {
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
  } catch (error) {
    console.error("listAllPayouts failed", {
      name: error?.name,
      sqlMessage: error?.parent?.sqlMessage,
      message: error?.message,
    });
    throw new PayoutError(
      "Unable to list payouts",
      "PAYOUT_LIST_FAILED",
      500
    );
  }
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
  if (payout.status === "FAILED" || payout.status === "REVERSED") {
    return { payout, changed: false };
  }

  // Legacy null-provider rows default to Monnify, the only historical rail.
  const provider = getPayoutProvider(payout.provider || "MONNIFY");
  if (typeof provider.getPayoutStatus !== "function") {
    throw new PayoutError(
      "The configured payout provider does not document a payout status lookup. Contact the provider to resolve this transfer before changing its reserved funds.",
      "PAYOUT_STATUS_LOOKUP_UNSUPPORTED",
      409
    );
  }

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
      await releaseReservedFunds({
        payout,
        reason: "Provider reversed payout before settlement",
      });
      await payout.update({ status: "REVERSED", reversedAt: new Date() });
    }
    return { payout: await payout.reload(), changed: true };
  }

  return { payout, changed: false };
}

/* =========================================================
 * AUTHORIZATION
 * ======================================================= */

export async function authorizePayout({
  merchantId,
  payoutId,
  authorizationCode,
}) {
  if (!/^\d{4,10}$/.test(String(authorizationCode || ""))) {
    throw new PayoutError(
      "Invalid authorization code",
      "INVALID_AUTHORIZATION_CODE",
      400
    );
  }
  const payout = await Payout.findOne({ where: { id: payoutId, merchantId } });
  if (!payout) {
    throw new PayoutError("Payout not found", "PAYOUT_NOT_FOUND", 404);
  }
  if (
    payout.status !== "PROCESSING" ||
    payout.providerStatus !== "PENDING_AUTHORIZATION"
  ) {
    throw new PayoutError(
      "Payout is not waiting for provider authorization",
      "INVALID_STATE_TRANSITION",
      409
    );
  }

  const provider = getPayoutProvider(payout.provider || "MONNIFY");
  if (typeof provider.authorizePayout !== "function") {
    throw new PayoutError(
      "Configured payout provider does not support authorization",
      "PAYOUT_AUTHORIZATION_UNSUPPORTED",
      409
    );
  }

  const result = await provider.authorizePayout({
    reference: payout.providerReference || payout.id,
    authorizationCode: String(authorizationCode),
  });

  const normalized = normalizeProviderStatus(result.providerStatus);

  await payout.update({
    providerStatus: result.providerStatus,
    providerMetadata: {
      ...(payout.providerMetadata || {}),
      authorizationStatus: safePayoutResponse(result.rawResponse),
    },
  });

  if (normalized === "SUCCESS") {
    await settleReservedFunds({ payout });
  } else if (normalized === "FAILED") {
    await releaseReservedFunds({
      payout,
      reason: "Provider rejected authorized payout",
    });
  } else {
    await payout.update({
      status: "PROCESSING",
      processingAt: payout.processingAt || new Date(),
    });
  }

  return payout.reload();
}