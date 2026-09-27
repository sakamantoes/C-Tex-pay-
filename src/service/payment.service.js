import { Op } from "sequelize";
import crypto from "crypto";
import sequelize from "../config/database.js";
import {
  Payment,
  PaymentStatusHistory,
  Customer,
  Merchant,
} from "../models/index.js";
import envConfig from "../config/constant.js";

const SUPPORTED_CURRENCIES = ["NGN"];
const SUPPORTED_METHODS = ["BANK_TRANSFER"];

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_PAGE = 10_000; // bounds OFFSET so nobody can force a full table scan

const ALLOWED_SORT_FIELDS = ["createdAt", "amount", "status", "updatedAt"];
const ALLOWED_SORT_DIRECTIONS = ["ASC", "DESC"];

// --- Business limits — tune to your actual ledger precision / risk appetite ---
const MIN_AMOUNT = 50; // ₦50
const MAX_AMOUNT = 10_000_000; // ₦10,000,000 per transaction
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_METADATA_BYTES = 10 * 1024; // 10KB
const MAX_MERCHANT_REFERENCE_LENGTH = 100;
const MAX_SEARCH_LENGTH = 100;
const MIN_IDEMPOTENCY_KEY_LENGTH = 8;
const MAX_IDEMPOTENCY_KEY_LENGTH = 255;
const PENDING_PAYMENT_TTL_MINUTES = 30;

const PAYMENT_REFERENCE_PREFIX = envConfig.PAYMENT_REFERENCE_PREFIX || "CTX_PAY_sake";

/*
|--------------------------------------------------------------------------
| Reference generation
|--------------------------------------------------------------------------
*/

function generatePaymentReference() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `${PAYMENT_REFERENCE_PREFIX}_${y}${m}${d}_${rand}`;
}

async function generateUniquePaymentReference(transaction) {
  for (let i = 0; i < 5; i++) {
    const ref = generatePaymentReference();
    const existing = await Payment.findOne({
      where: { paymentReference: ref },
      transaction,
    });
    if (!existing) return ref;
  }
  throw new Error("Failed to generate unique payment reference");
}

/*
|--------------------------------------------------------------------------
| Input validation
|--------------------------------------------------------------------------
| All untrusted, caller-supplied fields are validated here, before anything
| touches the DB or the idempotency hash. Throwing early with a stable
| `.code` lets the controller map straight to an HTTP status without
| re-deriving what went wrong.
*/

function throwErr(message, code) {
  const e = new Error(message);
  e.code = code;
  throw e;
}

function assertValidAmount(amount) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throwErr("Amount must be a valid number", "INVALID_AMOUNT");
  }
  // Reject sub-kobo precision so the same logical amount can never produce
  // two different serializations (which would otherwise cause spurious
  // idempotency conflicts and rounding drift in the ledger).
  const cents = Math.round(n * 100);
  if (Math.abs(cents - n * 100) > 1e-6) {
    throwErr(
      "Amount cannot have more than 2 decimal places",
      "INVALID_AMOUNT_PRECISION"
    );
  }
  if (n < MIN_AMOUNT || n > MAX_AMOUNT) {
    throwErr(
      `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}`,
      "AMOUNT_OUT_OF_RANGE"
    );
  }
  // Normalize to a fixed 2-decimal string — this is what gets hashed and
  // stored, so "100", "100.0" and "100.00" are always the same request.
  return (cents / 100).toFixed(2);
}

function assertValidIdempotencyKey(key) {
  if (key === null || key === undefined) return;
  if (typeof key !== "string") {
    throwErr("Idempotency-Key must be a string", "INVALID_IDEMPOTENCY_KEY");
  }
  if (
    key.length < MIN_IDEMPOTENCY_KEY_LENGTH ||
    key.length > MAX_IDEMPOTENCY_KEY_LENGTH
  ) {
    throwErr(
      `Idempotency-Key must be between ${MIN_IDEMPOTENCY_KEY_LENGTH} and ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      "INVALID_IDEMPOTENCY_KEY"
    );
  }
  // Restrict charset — this value ends up in a DB index and often in logs,
  // so keep it boring and predictable.
  if (!/^[A-Za-z0-9_\-:.]+$/.test(key)) {
    throwErr(
      "Idempotency-Key contains invalid characters",
      "INVALID_IDEMPOTENCY_KEY"
    );
  }
}

function assertValidMetadata(metadata) {
  if (metadata === null || metadata === undefined) return;
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    throwErr("metadata must be a JSON object", "INVALID_METADATA");
  }
  const banned = new Set(["__proto__", "constructor", "prototype"]);
  for (const key of Object.keys(metadata)) {
    if (banned.has(key)) {
      throwErr(`metadata key "${key}" is not allowed`, "INVALID_METADATA");
    }
  }
  const size = Buffer.byteLength(JSON.stringify(metadata), "utf8");
  if (size > MAX_METADATA_BYTES) {
    throwErr(
      `metadata exceeds ${MAX_METADATA_BYTES} bytes`,
      "METADATA_TOO_LARGE"
    );
  }
}

function assertValidDescription(description) {
  if (description === null || description === undefined) return;
  if (typeof description !== "string") {
    throwErr("description must be a string", "INVALID_DESCRIPTION");
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throwErr(
      `description exceeds ${MAX_DESCRIPTION_LENGTH} characters`,
      "DESCRIPTION_TOO_LONG"
    );
  }
}

function assertValidMerchantReference(ref) {
  if (ref === null || ref === undefined) return;
  if (typeof ref !== "string" || ref.length > MAX_MERCHANT_REFERENCE_LENGTH) {
    throwErr(
      `merchantReference must be a string up to ${MAX_MERCHANT_REFERENCE_LENGTH} characters`,
      "INVALID_MERCHANT_REFERENCE"
    );
  }
}

function parseDateOrNull(value, fieldName) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throwErr(`${fieldName} is not a valid date`, "INVALID_DATE");
  }
  return d;
}

// Escapes LIKE metacharacters so search input can't widen its own match
// (e.g. a customer searching "%" shouldn't match every reference in the DB).
// MySQL's default LIKE escape char is backslash, so no ESCAPE clause needed.
function escapeLikeTerm(term) {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/*
|--------------------------------------------------------------------------
| Idempotency request hash
|--------------------------------------------------------------------------
| Canonicalizes the request fields that must match on replay, with
| deterministic (recursively sorted) key ordering — plain JSON.stringify
| does NOT guarantee key order is stable across equivalent objects, which
| would otherwise let the same logical request hash differently and trip
| false IDEMPOTENCY_CONFLICTs.
*/

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`
  );
  return `{${entries.join(",")}}`;
}

function computeRequestHash({
  amount,
  currency,
  customerId,
  merchantReference,
  description,
  metadata,
  paymentMethod,
}) {
  const canonical = stableStringify({
    amount, // caller passes the already-normalized fixed-point string
    currency: currency || null,
    customerId: customerId || null,
    merchantReference: merchantReference || null,
    description: description || null,
    metadata: metadata || null,
    paymentMethod: paymentMethod || null,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

// Constant-time hash comparison. Not strictly required for correctness here
// (hashes aren't secret), but it costs nothing and removes any timing
// side-channel on the idempotency-conflict check.
function hashesMatch(a, b) {
  const bufA = Buffer.from(a || "", "hex");
  const bufB = Buffer.from(b || "", "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/*
|--------------------------------------------------------------------------
| Public serializers
|--------------------------------------------------------------------------
*/

export function toPublicPayment(payment) {
  if (!payment) return null;
  const data = payment.toJSON ? payment.toJSON() : payment;

  // Merchant-safe view — no provider fields, no requestHash, no idempotency internals.
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
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/*
|--------------------------------------------------------------------------
| Admin serializers
|--------------------------------------------------------------------------
*/

export function toAdminPayment(payment) {
  if (!payment) return null;
  const data = payment.toJSON ? payment.toJSON() : payment;
  // Same as public but provider fields included for internal investigation.
  return {
    ...toPublicPayment(payment),
    merchantId: data.merchantId,
    idempotencyKey: data.idempotencyKey,
    provider: data.provider,
    providerReference: data.providerReference,
    providerStatus: data.providerStatus,
    // providerMetadata intentionally omitted from default list responses
  };
}

export function toAdminPaymentFull(payment, history = []) {
  const base = toAdminPayment(payment);
  if (!base) return null;
  const data = payment.toJSON ? payment.toJSON() : payment;
  return {
    ...base,
    providerMetadata: data.providerMetadata || null,
    statusHistory: history.map((h) => {
      const hd = h.toJSON ? h.toJSON() : h;
      return {
        id: hd.id,
        previousStatus: hd.previousStatus,
        newStatus: hd.newStatus,
        reason: hd.reason,
        source: hd.source,
        createdAt: hd.createdAt,
      };
    }),
  };
}

/*
|--------------------------------------------------------------------------
| Customer / merchant validation (merchant-scoped)
|--------------------------------------------------------------------------
*/

async function validateCustomerBelongsToMerchant({
  customerId,
  merchantId,
  transaction,
}) {
  if (!customerId) return null;

  if (typeof customerId !== "string" && typeof customerId !== "number") {
    throwErr("Customer not found", "CUSTOMER_NOT_FOUND");
  }

  const customer = await Customer.findOne({
    where: { id: customerId, merchantId },
    transaction,
  });

  if (!customer) {
    throwErr("Customer not found", "CUSTOMER_NOT_FOUND");
  }

  return customer;
}

// Confirms the merchant exists and is allowed to take payments right now.
// Without this check a suspended/disabled merchant could keep creating
// payments as long as they still had a valid API key.
async function assertMerchantActive(merchantId, transaction) {
  const merchant = await Merchant.findByPk(merchantId, { transaction });
  if (!merchant) {
    throwErr("Merchant not found", "MERCHANT_NOT_FOUND");
  }
  if (merchant.status && merchant.status !== "ACTIVE") {
    throwErr("Merchant account is not active", "MERCHANT_INACTIVE");
  }
  return merchant;
}

/*
|--------------------------------------------------------------------------
| Unique-violation detection (cross-dialect)
|--------------------------------------------------------------------------
| Sequelize reports unique-constraint violations differently depending on
| the driver. We accept any of these signals so the concurrent-idempotency
| race is reliably detected:
|
|   - error.name === "SequelizeUniqueConstraintError"
|   - error.parent.code === "ER_DUP_ENTRY"        (MySQL / MariaDB)
|   - error.parent.code === "SQLITE_CONSTRAINT_UNIQUE" (SQLite)
|   - error.errors[].path or .message mentioning "idempotency"
*/

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

/*
|--------------------------------------------------------------------------
| Create payment (idempotent)
|--------------------------------------------------------------------------
| Race-safe via unique index (merchantId, idempotencyKey).
| If two concurrent requests with the same key race, one wins the INSERT
| and the other gets SequelizeUniqueConstraintError — we then re-fetch.
*/

export async function createPayment({
  merchantId,
  amount,
  currency,
  customerId = null,
  merchantReference = null,
  description = null,
  metadata = null,
  paymentMethod,
  idempotencyKey = null,
}) {
  if (!merchantId) {
    throwErr("merchantId is required", "MERCHANT_ID_REQUIRED");
  }

  const method = paymentMethod || "BANK_TRANSFER";
  const curr = currency || "NGN";

  if (!SUPPORTED_CURRENCIES.includes(curr)) {
    throwErr(`Unsupported currency: ${curr}`, "UNSUPPORTED_CURRENCY");
  }
  if (!SUPPORTED_METHODS.includes(method)) {
    throwErr(`Unsupported payment method: ${method}`, "UNSUPPORTED_METHOD");
  }

  // Validate + normalize every untrusted field before it reaches the DB
  // or the idempotency hash.
  const normalizedAmount = assertValidAmount(amount);
  assertValidIdempotencyKey(idempotencyKey);
  assertValidMetadata(metadata);
  assertValidDescription(description);
  assertValidMerchantReference(merchantReference);

  const requestHash = computeRequestHash({
    amount: normalizedAmount,
    currency: curr,
    customerId,
    merchantReference,
    description,
    metadata,
    paymentMethod: method,
  });

  /*
  |----------------------------------------------------------------------
  | Customer scope check — runs BEFORE idempotency fast path
  |----------------------------------------------------------------------
  | If customerId is supplied but belongs to another merchant, we want a
  | consistent 404 regardless of whether this is a fresh request or an
  | idempotent replay. Doing this first also means the idempotency cache
  | never returns a payment for a mismatched customer.
  */
  if (customerId) {
    await validateCustomerBelongsToMerchant({
      customerId,
      merchantId,
      transaction: null,
    });
  }

  /*
  |----------------------------------------------------------------------
  | Idempotency fast path (read-only pre-check)
  |----------------------------------------------------------------------
  */
  if (idempotencyKey) {
    const existing = await Payment.findOne({
      where: { merchantId, idempotencyKey },
    });

    if (existing) {
      if (!hashesMatch(existing.requestHash, requestHash)) {
        throwErr(
          "Idempotency-Key was reused with a different request payload",
          "IDEMPOTENCY_CONFLICT"
        );
      }
      return { payment: existing, replayed: true };
    }
  }

  /*
  |----------------------------------------------------------------------
  | Create inside a transaction
  |----------------------------------------------------------------------
  */
  try {
    const payment = await sequelize.transaction(async (t) => {
      // Merchant must exist and be active before we write anything.
      await assertMerchantActive(merchantId, t);

      const paymentReference = await generateUniquePaymentReference(t);
      const expiresAt = new Date(
        Date.now() + PENDING_PAYMENT_TTL_MINUTES * 60 * 1000
      );

      const created = await Payment.create(
        {
          merchantId,
          customerId,
          paymentReference,
          merchantReference,
          amount: normalizedAmount,
          currency: curr,
          paymentMethod: method,
          status: "PENDING",
          description,
          metadata,
          expiresAt,
          idempotencyKey: idempotencyKey || null,
          requestHash,
        },
        { transaction: t }
      );

      // Append-only status history seed
      await PaymentStatusHistory.create(
        {
          paymentId: created.id,
          previousStatus: null,
          newStatus: "PENDING",
          reason: "Payment initialized",
          source: "INITIALIZATION",
        },
        { transaction: t }
      );

      return created;
    });

    return { payment, replayed: false };
  } catch (error) {
    /*
    |----------------------------------------------------------------------
    | Concurrent idempotency race
    |----------------------------------------------------------------------
    | Two requests with the same (merchantId, idempotencyKey) both passed
    | the fast path. The DB unique index only allows one INSERT. The loser
    | gets a unique-violation. We re-fetch and either replay or conflict.
    */
    if (isUniqueViolation(error) && idempotencyKey) {
      const existing = await Payment.findOne({
        where: { merchantId, idempotencyKey },
      });

      if (existing) {
        if (!hashesMatch(existing.requestHash, requestHash)) {
          throwErr(
            "Idempotency-Key was reused with a different request payload",
            "IDEMPOTENCY_CONFLICT"
          );
        }
        return { payment: existing, replayed: true };
      }
    }

    /*
    |----------------------------------------------------------------------
    | Sequelize model-level validation error (e.g. amount < min)
    |----------------------------------------------------------------------
    | Normally Zod catches these, but the model still enforces its own
    | constraints and we must not surface them as 500s.
    */
    if (error.name === "SequelizeValidationError") {
      const mapped = new Error("Validation failed");
      mapped.code = "SEQUELIZE_VALIDATION_ERROR";
      mapped.fields = (error.errors || []).map((err) => ({
        field: err.path || err.field || "unknown",
        message: err.message,
      }));
      throw mapped;
    }

    /*
    |----------------------------------------------------------------------
    | Raw database error — wrap so nothing internal leaks to the client
    |----------------------------------------------------------------------
    */
    if (error.name === "SequelizeDatabaseError") {
      const mapped = new Error("Database operation failed");
      mapped.code = "SEQUELIZE_DATABASE_ERROR";
      throw mapped;
    }

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| Retrieve single payment (merchant-scoped)
|--------------------------------------------------------------------------
*/

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
    ],
  });
}

/*
|--------------------------------------------------------------------------
| List payments (merchant-scoped)
|--------------------------------------------------------------------------
*/

export async function listPaymentsForMerchant({
  merchantId,
  page = 1,
  limit = DEFAULT_LIMIT,
  status = null,
  customerId = null,
  merchantReference = null,
  paymentReference = null,
  search = null,
  createdFrom = null,
  createdTo = null,
  sortBy = "createdAt",
  sortDir = "DESC",
}) {
  if (!merchantId) {
    throwErr("merchantId is required", "MERCHANT_ID_REQUIRED");
  }

  return listPayments({
    scope: { merchantId },
    page,
    limit,
    status,
    customerId,
    merchantReference,
    paymentReference,
    search,
    createdFrom,
    createdTo,
    sortBy,
    sortDir,
    includeCustomer: true,
  });
}

/*
|--------------------------------------------------------------------------
| List payments (admin platform-wide)
|--------------------------------------------------------------------------
*/

export async function listAllPayments({
  merchantId = null,
  page = 1,
  limit = DEFAULT_LIMIT,
  status = null,
  customerId = null,
  merchantReference = null,
  paymentReference = null,
  search = null,
  createdFrom = null,
  createdTo = null,
  sortBy = "createdAt",
  sortDir = "DESC",
}) {
  const scope = {};
  if (merchantId) scope.merchantId = merchantId;

  return listPayments({
    scope,
    page,
    limit,
    status,
    customerId,
    merchantReference,
    paymentReference,
    search,
    createdFrom,
    createdTo,
    sortBy,
    sortDir,
    includeCustomer: false,
    includeMerchant: true,
  });
}

/*
|--------------------------------------------------------------------------
| Shared list implementation
|--------------------------------------------------------------------------
*/

async function listPayments({
  scope,
  page,
  limit,
  status,
  customerId,
  merchantReference,
  paymentReference,
  search,
  createdFrom,
  createdTo,
  sortBy,
  sortDir,
  includeCustomer,
  includeMerchant = false,
}) {
  const safePage = Math.min(Math.max(parseInt(page, 10) || 1, 1), MAX_PAGE);
  const safeLimit = Math.min(
    Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = (safePage - 1) * safeLimit;

  const where = { ...scope };

  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (paymentReference) where.paymentReference = paymentReference;
  if (merchantReference) where.merchantReference = merchantReference;

  const from = parseDateOrNull(createdFrom, "createdFrom");
  const to = parseDateOrNull(createdTo, "createdTo");
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = from;
    if (to) where.createdAt[Op.lte] = to;
  }

  if (search) {
    if (typeof search !== "string" || search.length > MAX_SEARCH_LENGTH) {
      throwErr(
        `search must be a string up to ${MAX_SEARCH_LENGTH} characters`,
        "INVALID_SEARCH"
      );
    }
    const term = `%${escapeLikeTerm(search.trim())}%`;
    where[Op.or] = [
      { paymentReference: { [Op.like]: term } },
      { merchantReference: { [Op.like]: term } },
    ];
  }

  const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy)
    ? sortBy
    : "createdAt";
  const safeSortDir = ALLOWED_SORT_DIRECTIONS.includes(sortDir?.toUpperCase())
    ? sortDir.toUpperCase()
    : "DESC";

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

  const { count, rows } = await Payment.findAndCountAll({
    where,
    include,
    order: [[safeSortBy, safeSortDir]],
    limit: safeLimit,
    offset,
  });

  return {
    payments: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit) || 0,
    },
  };
}

/*
|--------------------------------------------------------------------------
| Admin: get payment with status history (platform-wide)
|--------------------------------------------------------------------------
*/

export async function getAdminPaymentByReference(paymentReference) {
  if (!paymentReference) return null;

  const payment = await Payment.findOne({
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
    ],
    order: [
      [{ model: PaymentStatusHistory, as: "statusHistory" }, "createdAt", "ASC"],
    ],
  });

  return payment;
}