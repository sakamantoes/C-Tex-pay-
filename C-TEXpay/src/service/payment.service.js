import { Op } from "sequelize";
import crypto from "crypto";

import sequelize from "../config/database.js";
import {
  Payment,
  PaymentStatusHistory,
  Customer,
  Merchant,
  FeeRecord,
} from "../models/index.js";
import envConfig from "../config/constant.js";
import { getPaymentProvider } from "../Provider/provider.factory.js";
import {
  createMerchantWebhookEventForSuccessfulPayment,
  processMerchantWebhookDelivery,
} from "./merchantWebhook.service.js";
import { enqueueSuccessfulPaymentNotifications } from "./merchantNotification.service.js";
import { calculateAndRecordFees } from "./fee.service.js";
import { postPaymentSettlement } from "./ledger.service.js";

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const SUPPORTED_CURRENCIES = ["NGN"];
const SUPPORTED_METHODS = ["ACCOUNT_TRANSFER"];

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_PAGE = 10_000;

const ALLOWED_SORT_FIELDS = ["createdAt", "amount", "status", "updatedAt"];
const ALLOWED_SORT_DIRECTIONS = ["ASC", "DESC"];

const VERIFICATION_STATUSES = [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
];

/**
 * Allowed payment status transitions during verification.
 *
 * SUCCESS / EXPIRED / CANCELLED are terminal.
 * FAILED may still become SUCCESS (late transfer) or EXPIRED.
 */
const ALLOWED_VERIFICATION_TRANSITIONS = {
  PENDING: ["PENDING", "SUCCESS", "FAILED", "EXPIRED", "CANCELLED"],
  FAILED: ["FAILED", "SUCCESS", "EXPIRED"],
  SUCCESS: ["SUCCESS"],
  EXPIRED: ["EXPIRED"],
  CANCELLED: ["CANCELLED"],
};

/**
 * Amounts are integers in kobo (smallest currency unit).
 * ₦50       => 5000 kobo
 * ₦10,000,000 => 1_000_000_000 kobo
 */
const MIN_AMOUNT = 50;
const MAX_AMOUNT = 1_000_000_000;

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_BYTES = 10 * 1024;
const MAX_MERCHANT_REFERENCE_LENGTH = 100;
const MAX_SEARCH_LENGTH = 100;

const MIN_IDEMPOTENCY_KEY_LENGTH = 8;
const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

const PAYMENT_REFERENCE_PREFIX =
  envConfig.PAYMENT_REFERENCE_PREFIX || "CTEXPAY";

const FALLBACK_CUSTOMER_EMAIL = "noreply@ctexpay.com";

const DEFAULT_PAYMENT_EXPIRY_MINUTES = 30;

/* =========================================================
 * ERROR HELPER
 * ======================================================= */

function throwErr(message, code, statusCode = 400, details = null) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  if (details !== null) error.details = details;
  throw error;
}

/* =========================================================
 * VALIDATION HELPERS
 * ======================================================= */

function assertSupportedCurrency(currency) {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throwErr(
      `Unsupported currency: ${currency}`,
      "UNSUPPORTED_CURRENCY",
      400
    );
  }
}

function assertSupportedPaymentMethod(paymentMethod) {
  if (!SUPPORTED_METHODS.includes(paymentMethod)) {
    throwErr(
      `Unsupported payment method: ${paymentMethod}`,
      "UNSUPPORTED_PAYMENT_METHOD",
      400
    );
  }
}

function assertValidAmount(amount) {
  if (!Number.isInteger(amount)) {
    throwErr(
      "Amount must be an integer in the smallest currency unit",
      "INVALID_AMOUNT",
      400
    );
  }
  if (amount < MIN_AMOUNT) {
    throwErr(
      `Amount must be at least ${MIN_AMOUNT} kobo`,
      "INVALID_AMOUNT",
      400
    );
  }
  if (amount > MAX_AMOUNT) {
    throwErr(
      `Amount cannot exceed ${MAX_AMOUNT} kobo`,
      "INVALID_AMOUNT",
      400
    );
  }
}

function assertDescription(description) {
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throwErr("Description must be a string", "INVALID_DESCRIPTION", 400);
  }
  if (
    typeof description === "string" &&
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    throwErr(
      `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
      "INVALID_DESCRIPTION",
      400
    );
  }
}

function assertMerchantReference(merchantReference) {
  if (
    merchantReference !== undefined &&
    merchantReference !== null &&
    typeof merchantReference !== "string"
  ) {
    throwErr(
      "merchantReference must be a string",
      "INVALID_MERCHANT_REFERENCE",
      400
    );
  }
  if (
    typeof merchantReference === "string" &&
    merchantReference.length > MAX_MERCHANT_REFERENCE_LENGTH
  ) {
    throwErr(
      `merchantReference cannot exceed ${MAX_MERCHANT_REFERENCE_LENGTH} characters`,
      "INVALID_MERCHANT_REFERENCE",
      400
    );
  }
}

function assertIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) {
    throwErr(
      "Idempotency-Key is required",
      "IDEMPOTENCY_KEY_REQUIRED",
      400
    );
  }
  if (typeof idempotencyKey !== "string") {
    throwErr(
      "Idempotency-Key must be a string",
      "INVALID_IDEMPOTENCY_KEY",
      400
    );
  }
  if (
    idempotencyKey.length < MIN_IDEMPOTENCY_KEY_LENGTH ||
    idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH
  ) {
    throwErr(
      `Idempotency-Key must be between ${MIN_IDEMPOTENCY_KEY_LENGTH} and ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      "INVALID_IDEMPOTENCY_KEY",
      400
    );
  }
  if (!/^[A-Za-z0-9_\-:.]+$/.test(idempotencyKey)) {
    throwErr(
      "Idempotency-Key contains invalid characters",
      "INVALID_IDEMPOTENCY_KEY",
      400
    );
  }
}

function assertMetadata(metadata) {
  if (metadata === undefined || metadata === null) return;

  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    throwErr("Metadata must be a JSON object", "INVALID_METADATA", 400);
  }

  const banned = new Set(["__proto__", "constructor", "prototype"]);
  for (const key of Object.keys(metadata)) {
    if (banned.has(key)) {
      throwErr(
        `metadata key "${key}" is not allowed`,
        "INVALID_METADATA",
        400
      );
    }
  }

  let serialized;
  try {
    serialized = JSON.stringify(metadata);
  } catch {
    throwErr("Metadata must be valid JSON", "INVALID_METADATA", 400);
  }

  if (Buffer.byteLength(serialized, "utf8") > MAX_METADATA_BYTES) {
    throwErr(
      `Metadata cannot exceed ${MAX_METADATA_BYTES} bytes`,
      "INVALID_METADATA",
      400
    );
  }
}

function assertSearch(search) {
  if (search !== undefined && search !== null && typeof search !== "string") {
    throwErr("Search must be a string", "INVALID_SEARCH", 400);
  }
  if (typeof search === "string" && search.length > MAX_SEARCH_LENGTH) {
    throwErr(
      `Search cannot exceed ${MAX_SEARCH_LENGTH} characters`,
      "INVALID_SEARCH",
      400
    );
  }
}

function parseDateOrNull(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throwErr(`${fieldName} is not a valid date`, "INVALID_DATE", 400);
  }
  return date;
}

function escapeLikeTerm(term) {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function isBlank(value) {
  return value === undefined || value === null || value === "";
}

function isUniqueViolation(error) {
  if (!error) return false;
  if (error.name === "SequelizeUniqueConstraintError") return true;
  const parentCode = error.parent?.code;
  if (parentCode === "ER_DUP_ENTRY") return true;
  if (parentCode === "SQLITE_CONSTRAINT_UNIQUE") return true;
  if (Array.isArray(error.errors)) {
    return error.errors.some((e) => {
      const s = String(e.path || e.message || "");
      return s.toLowerCase().includes("idempotency");
    });
  }
  return false;
}

/* =========================================================
 * PAYMENT REFERENCE
 * ======================================================= */

function generatePaymentReference() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `${PAYMENT_REFERENCE_PREFIX}_${y}${m}${d}_${rand}`;
}

async function generateUniquePaymentReference(transaction) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const paymentReference = generatePaymentReference();
    const existing = await Payment.findOne({
      where: { paymentReference },
      transaction,
    });
    if (!existing) return paymentReference;
  }
  throwErr(
    "Unable to generate a unique payment reference",
    "PAYMENT_REFERENCE_GENERATION_FAILED",
    500
  );
}

/* =========================================================
 * IDEMPOTENCY / HASHING
 * ======================================================= */

function stableStringify(value) {
  if (value === null || value === undefined) {
    return JSON.stringify(value ?? null);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function createRequestHash(payload) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");
}

function hashesMatch(existingHash, incomingHash) {
  if (!existingHash || !incomingHash) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(existingHash, "utf8"),
      Buffer.from(incomingHash, "utf8")
    );
  } catch {
    return false;
  }
}

/* =========================================================
 * EXPIRY HELPERS
 * ======================================================= */

function normalizeProviderExpiry(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throwErr(
      "Provider returned an invalid transfer account expiry",
      "PROVIDER_RESPONSE_MALFORMED",
      502
    );
  }
  return date;
}

function getDefaultPaymentExpiry() {
  return new Date(Date.now() + DEFAULT_PAYMENT_EXPIRY_MINUTES * 60 * 1000);
}

/* =========================================================
 * PAYMENT INSTRUCTIONS
 * ======================================================= */

function normalizePaymentInstructions(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return null;
    } catch {
      console.warn("Invalid paymentInstructions JSON detected");
      return null;
    }
  }

  return null;
}

/* =========================================================
 * SERIALIZERS
 * ======================================================= */

function toPlain(payment) {
  return typeof payment.toJSON === "function" ? payment.toJSON() : payment;
}

function toFeeBreakdown(record) {
  if (!record) return null;
  const d = typeof record.toJSON === "function" ? record.toJSON() : record;
  return {
    currency: d.currency,
    grossAmount: Number(d.grossAmount),
    serviceFee: Number(d.serviceFee),
    providerFee:
      d.providerFee === null || d.providerFee === undefined
        ? null
        : Number(d.providerFee),
    totalFee: Number(d.totalFee),
    merchantNetAmount: Number(d.merchantNetAmount),
    providerFeeTreatment: d.providerFeeTreatment,
    calculationVersion: d.calculationVersion,
  };
}

export function toPublicPayment(payment, feeRecord = null) {
  if (!payment) return null;
  const data = toPlain(payment);

  return {
    id: data.id,
    paymentReference: data.paymentReference,
    merchantReference: data.merchantReference,
    customerId: data.customerId,
    amount: Number(data.amount),
    currency: data.currency,
    paymentMethod: data.paymentMethod,
    status: data.status,
    description: data.description,
    metadata: data.metadata,
    paymentInstructions: normalizePaymentInstructions(data.paymentInstructions),
    expiresAt: data.expiresAt,
    fees: toFeeBreakdown(feeRecord ?? data.feeRecord ?? null),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function toAdminPayment(payment) {
  if (!payment) return null;
  const data = toPlain(payment);

  return {
    ...toPublicPayment(payment),
    merchantId: data.merchantId,
    idempotencyKey: data.idempotencyKey,
    provider: data.provider,
    providerReference: data.providerReference,
    providerStatus: data.providerStatus,
  };
}

export function toAdminPaymentFull(payment, history = []) {
  const base = toAdminPayment(payment);
  if (!base) return null;
  const data = toPlain(payment);

  return {
    ...base,
    providerMetadata: data.providerMetadata || null,
    statusHistory: history.map((entry) => {
      const h = toPlain(entry);
      return {
        id: h.id,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        reason: h.reason,
        source: h.source,
        createdAt: h.createdAt,
      };
    }),
  };
}

/* =========================================================
 * CREATE PAYMENT
 * ======================================================= */

export async function createPayment({
  merchantId,
  customerId = null,
  amount,
  currency = "NGN",
  paymentMethod = "ACCOUNT_TRANSFER",
  merchantReference = null,
  description = null,
  metadata = null,
  idempotencyKey,
}) {
  if (!merchantId) {
    throwErr("merchantId is required", "MERCHANT_REQUIRED", 400);
  }

  currency = currency || "NGN";
  paymentMethod = paymentMethod || "ACCOUNT_TRANSFER";

  assertValidAmount(amount);
  assertSupportedCurrency(currency);
  assertSupportedPaymentMethod(paymentMethod);
  assertMerchantReference(merchantReference);
  assertDescription(description);
  assertMetadata(metadata);
  assertIdempotencyKey(idempotencyKey);

  const requestHash = createRequestHash({
    merchantId,
    customerId,
    amount,
    currency,
    paymentMethod,
    merchantReference,
    description,
    metadata,
  });

  /* -------------------------------------------------------
   * MERCHANT
   * ----------------------------------------------------- */

  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throwErr("Merchant not found", "MERCHANT_NOT_FOUND", 404);
  }
  if (merchant.status && merchant.status !== "ACTIVE") {
    throwErr("Merchant account is not active", "MERCHANT_INACTIVE", 403);
  }

  /* -------------------------------------------------------
   * CUSTOMER (merchant-scoped)
   * ----------------------------------------------------- */

  let customer = null;

  if (customerId) {
    if (typeof customerId !== "string" && typeof customerId !== "number") {
      throwErr(
        "Customer not found for this merchant",
        "CUSTOMER_NOT_FOUND",
        404
      );
    }

    customer = await Customer.findOne({
      where: { id: customerId, merchantId },
    });

    if (!customer) {
      throwErr(
        "Customer not found for this merchant",
        "CUSTOMER_NOT_FOUND",
        404
      );
    }
  }

  /* -------------------------------------------------------
   * IDEMPOTENCY — fast path
   * ----------------------------------------------------- */

  const replay = async () => {
    const existing = await Payment.findOne({
      where: { merchantId, idempotencyKey },
      include: [
        {
          model: FeeRecord,
          as: "feeRecord",
          required: false,
        },
      ],
    });

    if (!existing) return null;

    if (!hashesMatch(existing.requestHash, requestHash)) {
      throwErr(
        "This Idempotency-Key was already used with a different payment request",
        "IDEMPOTENCY_CONFLICT",
        409
      );
    }

    return { payment: existing, reused: true, replayed: true };
  };

  const replayed = await replay();
  if (replayed) return replayed;

  /* -------------------------------------------------------
   * CREATE PAYMENT + FEE SNAPSHOT (atomic)
   * ----------------------------------------------------- */

  let payment;
  try {
    payment = await sequelize.transaction(async (transaction) => {
      const paymentReference = await generateUniquePaymentReference(
        transaction
      );

      const createdPayment = await Payment.create(
        {
          merchantId,
          customerId,
          paymentReference,
          merchantReference,
          amount,
          currency,
          paymentMethod,
          status: "PENDING",
          description,
          metadata,
          paymentInstructions: null,
          idempotencyKey,
          requestHash,
          expiresAt: getDefaultPaymentExpiry(),
        },
        { transaction }
      );

      await PaymentStatusHistory.create(
        {
          paymentId: createdPayment.id,
          previousStatus: null,
          newStatus: "PENDING",
          reason: "Payment created",
          source: "INITIALIZATION",
        },
        { transaction }
      );

      /*
       * Fee snapshot — MUST be inside this transaction.
       *
       * If fee calculation or persistence fails, the Payment rolls back.
       * This guarantees: no payment without a fee record.
       *
       * The fee service reads FeeConfiguration and writes FeeRecord
       * using the same transaction handle.
       */
      await calculateAndRecordFees({
        payment: createdPayment,
        merchantId,
        grossAmount: amount,        // integer kobo — matches Payment.amount
        currency,
        paymentMethod,
        transaction,
      });

      return createdPayment;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const raced = await replay();
      if (raced) return raced;
    }

    if (error.name === "SequelizeValidationError") {
      const mapped = new Error("Validation failed");
      mapped.code = "SEQUELIZE_VALIDATION_ERROR";
      mapped.statusCode = 400;
      mapped.fields = (error.errors || []).map((err) => ({
        field: err.path || err.field || "unknown",
        message: err.message,
      }));
      throw mapped;
    }

    if (error.name === "SequelizeDatabaseError") {
      const mapped = new Error("Database operation failed");
      mapped.code = "SEQUELIZE_DATABASE_ERROR";
      mapped.statusCode = 500;
      throw mapped;
    }

    throw error;
  }

  /* -------------------------------------------------------
   * GET PAYMENT PROVIDER
   * ----------------------------------------------------- */

  let provider;
  try {
    provider = getPaymentProvider();
  } catch (error) {
    console.error("Unable to load payment provider", {
      paymentReference: payment.paymentReference,
      error: error.message,
    });
    throwErr(
      "Payment provider is currently unavailable",
      "PAYMENT_PROVIDER_UNAVAILABLE",
      503
    );
  }

  /* -------------------------------------------------------
   * PROVIDER INITIALIZATION (outside transaction)
   * ----------------------------------------------------- */

  const customerContext = {
    id: customerId,
    email: customer?.email || FALLBACK_CUSTOMER_EMAIL,
    name: customer
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : "Customer",
    phone: customer?.phone || null,
  };

  let initializeResult;
  try {
    initializeResult = await provider.initializePayment({
      paymentReference: payment.paymentReference,
      merchantReference: payment.merchantReference,
      // Provider expects major units (naira). Payment.amount is kobo.
      amount: Number(payment.amount) / 100,
      currency: payment.currency,
      customer: customerContext,
      description: payment.description,
      metadata: payment.metadata,
    });
  } catch (error) {
    console.error("Payment provider initialization failed", {
      paymentReference: payment.paymentReference,
      merchantId,
      errorCode: error?.code,
      providerHttpStatus: error?.httpStatus,
      error: error?.message,
    });
    throwErr(
      "Unable to initialize payment",
      "PAYMENT_PROVIDER_INITIALIZATION_FAILED",
      502
    );
  }

  if (!initializeResult || typeof initializeResult !== "object") {
    throwErr(
      "Payment provider returned an invalid initialization response",
      "PROVIDER_RESPONSE_MALFORMED",
      502
    );
  }

  if (!initializeResult.providerReference) {
    throwErr(
      "Payment provider did not return a provider reference",
      "PROVIDER_RESPONSE_MALFORMED",
      502
    );
  }

  await payment.update({
    provider:
      initializeResult.provider || envConfig.PAYMENT_PROVIDER || "MONNIFY",
    providerReference: initializeResult.providerReference,
    providerStatus: initializeResult.providerStatus || "PENDING",
    providerMetadata: {
      initialization: initializeResult.rawResponse || null,
    },
  });

  console.log("Payment provider initialized", {
    merchantId,
    paymentReference: payment.paymentReference,
    provider: payment.provider,
    providerReference: payment.providerReference,
  });

  /* -------------------------------------------------------
   * ACCOUNT TRANSFER INSTRUCTIONS
   * ----------------------------------------------------- */

  if (paymentMethod === "ACCOUNT_TRANSFER") {
    let bankTransferResult;
    try {
      bankTransferResult = await provider.initializeBankTransfer({
        transactionReference: initializeResult.providerReference,
        bankCode: envConfig.MONNIFY_TRANSFER_BANK_CODE || null,
        paymentReference: payment.paymentReference,
        providerReference: initializeResult.providerReference,
        merchantReference: payment.merchantReference,
        amount: Number(payment.amount) / 100,
        currency: payment.currency,
        customer: customerContext,
        description: payment.description,
        metadata: payment.metadata,
      });
    } catch (error) {
      console.error("Bank transfer initialization failed", {
        paymentReference: payment.paymentReference,
        providerReference: initializeResult.providerReference,
        errorCode: error?.code,
        providerHttpStatus: error?.httpStatus,
        error: error?.message,
      });
      throwErr(
        "Unable to initialize bank transfer payment",
        "ACCOUNT_TRANSFER_INIT_FAILED",
        502
      );
    }

    if (!bankTransferResult || typeof bankTransferResult !== "object") {
      throwErr(
        "Payment provider returned an invalid bank transfer response",
        "PROVIDER_RESPONSE_MALFORMED",
        502
      );
    }

    if (!bankTransferResult.accountNumber) {
      throwErr(
        "Payment provider did not return a transfer account number",
        "PROVIDER_RESPONSE_MALFORMED",
        502
      );
    }

    const providerExpiresAt = normalizeProviderExpiry(
      bankTransferResult.expiresAt
    );

    if (!providerExpiresAt) {
      throwErr(
        "Payment provider did not return a transfer account expiry",
        "PROVIDER_RESPONSE_MALFORMED",
        502
      );
    }

    if (providerExpiresAt.getTime() <= Date.now()) {
      throwErr(
        "Payment provider returned an already expired transfer account",
        "PROVIDER_RESPONSE_MALFORMED",
        502
      );
    }

    const paymentInstructions = {
      type: "ACCOUNT_TRANSFER",
      accountNumber: bankTransferResult.accountNumber,
      accountName: bankTransferResult.accountName || null,
      bankName: bankTransferResult.bankName || null,
      bankCode: bankTransferResult.bankCode || null,
      expiresAt: providerExpiresAt.toISOString(),
      ussdPayment: bankTransferResult.ussdPayment || null,
    };

    await payment.update({
      expiresAt: providerExpiresAt,
      paymentInstructions,
      providerStatus:
        bankTransferResult.providerStatus ||
        initializeResult.providerStatus ||
        "PENDING",
      providerMetadata: {
        ...(payment.providerMetadata || {}),
        bankTransfer: bankTransferResult.rawResponse || null,
      },
    });

    console.log("Bank transfer instructions generated", {
      paymentReference: payment.paymentReference,
      bankName: bankTransferResult.bankName,
    });
  }

  /* -------------------------------------------------------
   * Reload with fee record for the response
   * ----------------------------------------------------- */

  await payment.reload({
    include: [
      {
        model: FeeRecord,
        as: "feeRecord",
        required: false,
      },
    ],
  });

  return { payment, reused: false, replayed: false };
}

/* =========================================================
 * VERIFY PAYMENT
 * ======================================================= */

export async function verifyPayment({
  merchantId = null,
  paymentReference,
  providerReference = null,
}) {
  if (!paymentReference) {
    throwErr(
      "paymentReference is required",
      "PAYMENT_REFERENCE_REQUIRED",
      400
    );
  }

  /* -------------------------------------------------------
   * FIND PAYMENT
   * ----------------------------------------------------- */

  const where = { paymentReference };
  if (merchantId) where.merchantId = merchantId;

  const payment = await Payment.findOne({ where });
  if (!payment) {
    throwErr("Payment not found", "PAYMENT_NOT_FOUND", 404);
  }

  /* -------------------------------------------------------
   * FAST PATHS
   * ----------------------------------------------------- */

  if (payment.status === "SUCCESS") {
    return {
      payment,
      reused: true,
      alreadyVerified: true,
      statusChanged: false,
    };
  }

  if (payment.status === "EXPIRED" || payment.status === "CANCELLED") {
    throwErr(
      `Payment is ${payment.status} and cannot be verified`,
      "INVALID_VERIFICATION_STATE",
      409
    );
  }

  if (!payment.providerReference) {
    throwErr(
      "Payment does not have a provider reference",
      "PROVIDER_REFERENCE_MISSING",
      500
    );
  }

  /* -------------------------------------------------------
   * GET PROVIDER
   * ----------------------------------------------------- */

  let provider;
  try {
    provider = getPaymentProvider();
  } catch (error) {
    console.error("Unable to load payment provider", {
      paymentReference,
      error: error.message,
    });
    throwErr(
      "Payment provider is currently unavailable",
      "PAYMENT_PROVIDER_UNAVAILABLE",
      503
    );
  }

  /* -------------------------------------------------------
   * PROVIDER VERIFICATION (external call — outside tx)
   * ----------------------------------------------------- */

  let verificationResult;
  try {
    verificationResult = await provider.verifyPayment({
      paymentReference: payment.paymentReference,
      providerReference: providerReference || payment.providerReference,
    });
  } catch (error) {
    console.error("Payment provider verification failed", {
      paymentReference: payment.paymentReference,
      providerReference: payment.providerReference,
      errorCode: error?.code,
      providerHttpStatus: error?.httpStatus,
      error: error?.message,
    });
    throwErr(
      "Unable to verify payment with provider",
      "PAYMENT_VERIFICATION_FAILED",
      502
    );
  }

  /* -------------------------------------------------------
   * VALIDATE PROVIDER RESPONSE
   * ----------------------------------------------------- */

  if (!verificationResult || typeof verificationResult !== "object") {
    throwErr(
      "Payment provider returned an invalid verification response",
      "PROVIDER_RESPONSE_MALFORMED",
      502
    );
  }

  const newStatus = verificationResult.ctexStatus ?? verificationResult.status;
  const rawProviderStatus = verificationResult.providerStatus ?? newStatus;

  if (!VERIFICATION_STATUSES.includes(newStatus)) {
    throwErr(
      `Unsupported provider payment status: ${newStatus}`,
      "PROVIDER_STATUS_UNSUPPORTED",
      502
    );
  }

  if (
    verificationResult.paymentReference &&
    verificationResult.paymentReference !== payment.paymentReference
  ) {
    throwErr(
      "Provider payment reference does not match the requested payment",
      "PROVIDER_REFERENCE_MISMATCH",
      502
    );
  }

  if (
    verificationResult.providerReference &&
    verificationResult.providerReference !== payment.providerReference
  ) {
    throwErr(
      "Provider reference does not match the requested payment",
      "PROVIDER_REFERENCE_MISMATCH",
      502
    );
  }

  if (
    verificationResult.currency &&
    verificationResult.currency !== payment.currency
  ) {
    throwErr(
      "Provider currency does not match the payment currency",
      "PAYMENT_CURRENCY_MISMATCH",
      502
    );
  }

  /*
   * Amount check — SUCCESS only.
   */
  if (newStatus === "SUCCESS") {
    const rawPaid =
      verificationResult.amountPaid ?? verificationResult.amount;

    if (rawPaid === undefined || rawPaid === null) {
      throwErr(
        "Provider did not return the payment amount",
        "PROVIDER_AMOUNT_MISSING",
        502
      );
    }

    let paidAmount = Number(rawPaid);

    if (!Number.isFinite(paidAmount)) {
      throwErr(
        "Provider returned an invalid payment amount",
        "PROVIDER_AMOUNT_INVALID",
        502
      );
    }

    if (!Number.isInteger(paidAmount)) {
      paidAmount = Math.round(paidAmount * 100);
    } else if (paidAmount < Number(payment.amount)) {
      const asKobo = paidAmount * 100;
      if (asKobo >= Number(payment.amount)) {
        paidAmount = asKobo;
      }
    }

    if (paidAmount < Number(payment.amount)) {
      console.error("Amount underpayment detected", {
        paymentReference: payment.paymentReference,
        expectedKobo: Number(payment.amount),
        paidKobo: paidAmount,
      });
      throwErr(
        "Provider payment amount is less than the requested amount",
        "PAYMENT_AMOUNT_MISMATCH",
        409
      );
    }
  }

  /* -------------------------------------------------------
   * ATOMIC STATUS UPDATE (row lock)
   * ----------------------------------------------------- */

  let merchantWebhookEvent = null;

  const result = await sequelize.transaction(async (transaction) => {
    const lockedPayment = await Payment.findOne({
      where: { id: payment.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedPayment) {
      throwErr("Payment no longer exists", "PAYMENT_NOT_FOUND", 404);
    }

    if (lockedPayment.status === "SUCCESS") {
      return {
        payment: lockedPayment,
        statusChanged: false,
        alreadyVerified: true,
      };
    }

    if (
      lockedPayment.status === "EXPIRED" ||
      lockedPayment.status === "CANCELLED"
    ) {
      throwErr(
        `Payment is ${lockedPayment.status} and cannot be verified`,
        "INVALID_VERIFICATION_STATE",
        409
      );
    }

    const currentStatus = lockedPayment.status;
    const allowedTransitions =
      ALLOWED_VERIFICATION_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throwErr(
        `Invalid payment status transition: ${currentStatus} -> ${newStatus}`,
        "INVALID_PAYMENT_STATUS_TRANSITION",
        409
      );
    }

    const statusChanged = currentStatus !== newStatus;

    await lockedPayment.update(
      {
        status: newStatus,
        providerStatus: rawProviderStatus,
        providerMetadata: {
          ...(lockedPayment.providerMetadata || {}),
          verification: {
            amountPaid: verificationResult.amountPaid ?? null,
            currency: verificationResult.currency ?? null,
            paymentMethod: verificationResult.paymentMethod ?? null,
            paidAt: verificationResult.paidAt ?? null,
            raw: verificationResult.rawResponse ?? null,
          },
        },
      },
      { transaction }
    );

    if (statusChanged) {
      await PaymentStatusHistory.create(
        {
          paymentId: lockedPayment.id,
          previousStatus: currentStatus,
          newStatus,
          reason: `Verified via provider: ${rawProviderStatus}`,
          source: "VERIFICATION",
        },
        { transaction }
      );
    }

    if (statusChanged && newStatus === "SUCCESS") {
      const hookResult = await createMerchantWebhookEventForSuccessfulPayment({
        payment: lockedPayment,
        transaction,
      });

      if (hookResult.created) {
        merchantWebhookEvent = hookResult.event;
      }

      try {
        await enqueueSuccessfulPaymentNotifications({
          payment: lockedPayment,
          transaction,
        });
      } catch (notificationError) {
        console.error("Unable to queue merchant payment notifications", {
          merchantId: lockedPayment.merchantId,
          paymentReference: lockedPayment.paymentReference,
          errorName: notificationError.name,
        });
      }
    }

    return {
      payment: lockedPayment,
      statusChanged,
      alreadyVerified: false,
    };
  });

  console.log("Payment verification completed", {
    paymentReference: payment.paymentReference,
    status: result.payment.status,
    providerStatus: rawProviderStatus,
    statusChanged: result.statusChanged,
  });

  /*
  |----------------------------------------------------------------------
  | Ledger settlement
  |----------------------------------------------------------------------
  | Only post when the payment actually transitioned to SUCCESS in
  | this call. Duplicate verifications (already SUCCESS) skip this
  | block because result.statusChanged will be false.
  |
  | postPaymentSettlement is idempotent on its own, so even a race
  | between this call and a webhook-driven verification cannot
  | double-credit.
  */
  if (result.statusChanged && result.payment.status === "SUCCESS") {
    try {
      const ledgerResult = await postPaymentSettlement({
        paymentId: result.payment.id,
      });
      console.log("Ledger settlement posted", {
        paymentReference: result.payment.paymentReference,
        ledgerTransactionId: ledgerResult.transaction.id,
        created: ledgerResult.created,
      });
    } catch (ledgerError) {
      /*
       * Non-fatal for the HTTP response: the payment is already SUCCESS.
       * The ledger can be re-posted by a reconciliation job (Stage 15)
       * using the same deterministic reference.
       */
      console.error("Ledger settlement failed — will need reconciliation", {
        paymentReference: result.payment.paymentReference,
        errorCode: ledgerError.code,
        errorName: ledgerError.name,
        errorMessage: ledgerError.message,
      });
    }
  }

  if (merchantWebhookEvent) {
    try {
      const deliveryResult = await processMerchantWebhookDelivery({
        eventId: merchantWebhookEvent.eventId,
      });
      console.log("Merchant webhook delivery attempted", {
        paymentReference: payment.paymentReference,
        eventId: merchantWebhookEvent.eventId,
        delivered: deliveryResult.delivered,
        status: deliveryResult.event?.status,
      });
    } catch (deliveryError) {
      console.error("Merchant webhook delivery failed after creation", {
        paymentReference: payment.paymentReference,
        eventId: merchantWebhookEvent.eventId,
        error: deliveryError.message,
      });
    }
  }

  return {
    payment: result.payment,
    reused: !result.statusChanged,
    alreadyVerified: result.alreadyVerified,
    statusChanged: result.statusChanged,
  };
}

/* =========================================================
 * GET PAYMENT (merchant-scoped)
 * ======================================================= */

export async function getPaymentForMerchant({
  merchantId,
  paymentReference,
}) {
  if (!merchantId || !paymentReference) return null;

  return Payment.findOne({
    where: { merchantId, paymentReference },
    include: [
      {
        model: Customer,
        as: "customer",
        attributes: ["id", "customerCode", "firstName", "lastName", "email"],
      },
      {
        model: FeeRecord,
        as: "feeRecord",
        required: false,
      },
    ],
  });
}

/* =========================================================
 * SHARED LIST IMPLEMENTATION
 * ======================================================= */

async function listPayments({
  scope,
  page,
  limit,
  status,
  paymentMethod,
  customerId,
  merchantReference,
  paymentReference,
  search,
  createdFrom,
  createdTo,
  sortBy,
  sortDir,
  includeCustomer = false,
  includeMerchant = false,
}) {
  const parsedPage = isBlank(page) ? 1 : Number(page);
  const parsedLimit = isBlank(limit) ? DEFAULT_LIMIT : Number(limit);
  const resolvedSortBy = isBlank(sortBy) ? "createdAt" : sortBy;
  const resolvedSortDir = isBlank(sortDir)
    ? "DESC"
    : String(sortDir).toUpperCase();

  if (
    !Number.isInteger(parsedPage) ||
    parsedPage < 1 ||
    parsedPage > MAX_PAGE
  ) {
    throwErr("Invalid page", "INVALID_PAGE", 400);
  }

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > MAX_LIMIT
  ) {
    throwErr(
      `Limit must be between 1 and ${MAX_LIMIT}`,
      "INVALID_LIMIT",
      400
    );
  }

  if (!ALLOWED_SORT_FIELDS.includes(resolvedSortBy)) {
    throwErr(
      `Invalid sort field: ${resolvedSortBy}`,
      "INVALID_SORT_FIELD",
      400
    );
  }

  if (!ALLOWED_SORT_DIRECTIONS.includes(resolvedSortDir)) {
    throwErr(
      `Invalid sort direction: ${resolvedSortDir}`,
      "INVALID_SORT_DIRECTION",
      400
    );
  }

  if (!isBlank(status) && !VERIFICATION_STATUSES.includes(status)) {
    throwErr(`Invalid payment status: ${status}`, "INVALID_STATUS", 400);
  }

  if (
    !isBlank(paymentMethod) &&
    !SUPPORTED_METHODS.includes(paymentMethod)
  ) {
    throwErr(
      `Invalid payment method: ${paymentMethod}`,
      "INVALID_PAYMENT_METHOD",
      400
    );
  }

  assertSearch(search);

  const from = parseDateOrNull(createdFrom, "createdFrom");
  const to = parseDateOrNull(createdTo, "createdTo");

  const where = { ...scope };

  if (!isBlank(status)) where.status = status;
  if (!isBlank(paymentMethod)) where.paymentMethod = paymentMethod;
  if (!isBlank(customerId)) where.customerId = customerId;
  if (!isBlank(paymentReference)) where.paymentReference = paymentReference;
  if (!isBlank(merchantReference)) where.merchantReference = merchantReference;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = from;
    if (to) where.createdAt[Op.lte] = to;
  }

  if (typeof search === "string" && search.trim() !== "") {
    const term = `%${escapeLikeTerm(search.trim())}%`;
    where[Op.or] = [
      { paymentReference: { [Op.like]: term } },
      { merchantReference: { [Op.like]: term } },
    ];
  }

  const include = [];

  if (includeCustomer) {
    include.push({
      model: Customer,
      as: "customer",
      attributes: ["id", "customerCode", "firstName", "lastName", "email"],
    });
  }

  if (includeMerchant) {
    include.push({
      model: Merchant,
      as: "merchant",
      attributes: ["id", "merchantCode"],
    });
  }

  include.push({
    model: FeeRecord,
    as: "feeRecord",
    required: false,
  });

  const offset = (parsedPage - 1) * parsedLimit;

  const { rows, count } = await Payment.findAndCountAll({
    where,
    include,
    order: [[resolvedSortBy, resolvedSortDir]],
    limit: parsedLimit,
    offset,
  });

  const totalPages = Math.ceil(count / parsedLimit) || 0;

  return {
    payments: rows,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalItems: count,
      totalPages,
      hasNextPage: parsedPage < totalPages,
      hasPreviousPage: parsedPage > 1,
    },
  };
}

/* =========================================================
 * LIST PAYMENTS (merchant-scoped)
 * ======================================================= */

export async function listPaymentsForMerchant({
  merchantId,
  page,
  limit,
  status,
  paymentMethod,
  customerId,
  merchantReference,
  paymentReference,
  search,
  createdFrom,
  createdTo,
  sortBy,
  sortDir,
  sortDirection,
}) {
  if (!merchantId) {
    throwErr("merchantId is required", "MERCHANT_REQUIRED", 400);
  }

  return listPayments({
    scope: { merchantId },
    page,
    limit,
    status,
    paymentMethod,
    customerId,
    merchantReference,
    paymentReference,
    search,
    createdFrom,
    createdTo,
    sortBy,
    sortDir: sortDir ?? sortDirection,
    includeCustomer: true,
  });
}

/* =========================================================
 * LIST PAYMENTS (admin, platform-wide)
 * ======================================================= */

export async function listAllPayments({
  merchantId = null,
  page,
  limit,
  status,
  paymentMethod,
  customerId,
  merchantReference,
  paymentReference,
  search,
  createdFrom,
  createdTo,
  sortBy,
  sortDir,
  sortDirection,
} = {}) {
  const scope = {};
  if (!isBlank(merchantId)) scope.merchantId = merchantId;

  return listPayments({
    scope,
    page,
    limit,
    status,
    paymentMethod,
    customerId,
    merchantReference,
    paymentReference,
    search,
    createdFrom,
    createdTo,
    sortBy,
    sortDir: sortDir ?? sortDirection,
    includeCustomer: false,
    includeMerchant: true,
  });
}

/* =========================================================
 * ADMIN: GET PAYMENT WITH STATUS HISTORY
 * ======================================================= */

export async function getAdminPaymentByReference(paymentReference) {
  if (!paymentReference) return null;

  return Payment.findOne({
    where: { paymentReference },
    include: [
      {
        model: Customer,
        as: "customer",
        attributes: [
          "id",
          "customerCode",
          "firstName",
          "lastName",
          "email",
          "phone",
        ],
      },
      {
        model: Merchant,
        as: "merchant",
        attributes: ["id", "merchantCode", "status", "ownerId"],
      },
      {
        model: PaymentStatusHistory,
        as: "statusHistory",
      },
      {
        model: FeeRecord,
        as: "feeRecord",
        required: false,
      },
    ],
    order: [
      [
        { model: PaymentStatusHistory, as: "statusHistory" },
        "createdAt",
        "ASC",
      ],
    ],
  });
}