import envConfig from "../../config/constant.js";

/**
 * Monnify Request/Response Mapper
 *
 * Purpose:
 *   Isolate EVERY Monnify-specific field name inside this file.
 *   The rest of the application consumes only the normalized
 *   C-TEX provider contract described in each function's return value.
 *
 * Amount conventions in C-TEX PAY (LOCKED — do not change without migration):
 *   - Payment.amount is stored as a naira DECIMAL STRING (e.g. "25000.00").
 *   - Merchant API accepts amount in naira (25000 = NGN 25,000).
 *   - Monnify returns amountPaid as naira decimal (e.g. 25000.00).
 *   - We keep amounts as naira throughout the contract, and only convert
 *     to integer kobo when comparing (to avoid floating-point drift).
 *
 * Bank-transfer flow:
 *   1. POST /api/v1/merchant/transactions/init-transaction
 *        toMonnifyInitializeRequest -> fromMonnifyInitializeResponse
 *        (returns transactionReference + checkoutUrl, no bank details)
 *   2. POST /api/v1/merchant/bank-transfer/init-payment
 *        toMonnifyBankTransferRequest -> fromMonnifyBankTransferResponse
 *        (returns the dynamic virtual account the customer pays into)
 *
 * Normalized provider contract (every provider adapter MUST return this shape):
 *
 *   initializePayment:
 *     { success, providerReference, providerStatus, paymentInstructions,
 *       checkoutUrl, rawResponse }
 *
 *   initializeBankTransfer:
 *     { type, accountNumber, accountName, bankName, bankCode,
 *       expiresAt, ussdPayment, amount, fee, totalPayable,
 *       providerReference, providerPaymentReference, rawResponse }
 *
 *   verifyPayment:
 *     { success, providerReference, paymentReference,
 *       status,           // C-TEX: PENDING|SUCCESS|FAILED|EXPIRED|CANCELLED
 *       providerStatus,   // original Monnify status
 *       amount,           // naira
 *       currency,
 *       paymentMethod,
 *       paidAt,
 *       rawResponse }
 */

/** Monnify's documented maximum validity of a dynamic account: 2400s (40 minutes). */
const MAX_ACCOUNT_DURATION_SECONDS = 2400;

/**
 * Max tolerated difference between Monnify's `requestTime` and our clock.
 * Beyond this we distrust the timestamp and start the validity window from
 * local processing time instead.
 */
const MAX_REQUEST_TIME_SKEW_MS = 5 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function providerError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const invalidRequest = (message) =>
  providerError("INVALID_PROVIDER_REQUEST", message);

const malformed = (message) =>
  providerError("PROVIDER_RESPONSE_MALFORMED", message);

/** Naira (number|string) -> kobo (integer). Null when absent/invalid. */
function nairaToKobo(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/**
 * Validates the Monnify envelope and returns responseBody.
 * Monnify wraps every response as:
 *   { requestSuccessful, responseMessage, responseCode, responseBody }
 */
function unwrapBody(monnifyResponse, label) {
  if (!monnifyResponse || typeof monnifyResponse !== "object") {
    throw malformed(`Monnify ${label} response is empty or invalid`);
  }

  if (monnifyResponse.requestSuccessful === false) {
    throw malformed(
      `Monnify ${label} request was unsuccessful: ${
        monnifyResponse.responseMessage || "unknown error"
      }`
    );
  }

  const body = monnifyResponse.responseBody;

  if (!body || typeof body !== "object") {
    throw malformed(`Monnify ${label} response is missing responseBody`);
  }

  return body;
}

/**
 * Resolves the validity of the virtual account in seconds.
 *
 * Monnify's bank-transfer response returns `accountDurationSeconds`.
 * (`accountDuration` is accepted as a legacy fallback.)
 * A duration is never invented: if the provider omits it or returns
 * something unusable, the response is treated as malformed.
 */
function resolveAccountDurationSeconds(body) {
  const candidates = [body.accountDurationSeconds, body.accountDuration];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") {
      continue;
    }

    const seconds = Number(candidate);

    if (
      Number.isFinite(seconds) &&
      Number.isInteger(seconds) &&
      seconds > 0 &&
      seconds <= MAX_ACCOUNT_DURATION_SECONDS
    ) {
      return seconds;
    }
  }

  throw malformed(
    "Monnify bank-transfer response is missing a valid account duration"
  );
}

/**
 * Picks the start of the account validity window.
 *
 * Prefers Monnify's `requestTime` when it is present, parseable and close to
 * our clock. Otherwise (missing, unparseable, or skewed beyond tolerance —
 * e.g. a zone-less timestamp read in the wrong timezone) it falls back to the
 * local processing time. Falling back never extends validity beyond what the
 * provider granted, because the duration is counted from a time no earlier
 * than the real request.
 */
function resolveWindowStart(requestTimeRaw) {
  const now = new Date();

  if (!requestTimeRaw) return now;

  const parsed = new Date(requestTimeRaw);
  if (Number.isNaN(parsed.getTime())) return now;

  if (Math.abs(parsed.getTime() - now.getTime()) > MAX_REQUEST_TIME_SKEW_MS) {
    return now;
  }

  return parsed;
}

/* -------------------------------------------------------------------------- */
/* Step 1: Initialize Transaction                                             */
/* -------------------------------------------------------------------------- */

/**
 * Maps C-TEX PAY PaymentContext -> Monnify Initialize Transaction request.
 *
 * `amount` MUST be in naira (same unit as Payment.amount).
 * Example: 25000 -> NGN 25,000.
 */
export function toMonnifyInitializeRequest(paymentContext) {
  const {
    paymentReference,
    amount,           // naira number
    currency,
    customer,
    description,
    metadata,
    redirectUrl,
  } = paymentContext || {};

  if (!paymentReference) {
    throw invalidRequest(
      "Payment reference is required for Monnify initialization"
    );
  }

  const amountNaira = Number(amount);
  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    throw invalidRequest("Payment amount must be a positive number");
  }

  if (!customer?.email) {
    throw invalidRequest(
      "Customer email is required for Monnify payment initialization"
    );
  }

  if (!customer?.name) {
    throw invalidRequest(
      "Customer name is required for Monnify payment initialization"
    );
  }

  if (!currency) {
    throw invalidRequest(
      "Currency is required for Monnify payment initialization"
    );
  }

  if (!envConfig.MONNIFY_CONTRACT_CODE) {
    throw providerError(
      "PROVIDER_CONFIGURATION_ERROR",
      "Monnify contract code is not configured"
    );
  }

  const request = {
    amount: Number(amountNaira.toFixed(2)), // Monnify expects a decimal naira
    customerName: customer.name,
    customerEmail: customer.email,
    paymentReference,
    paymentDescription: description || "Payment",
    currencyCode: currency,
    contractCode: envConfig.MONNIFY_CONTRACT_CODE,

    // Stage 7 currently supports account transfer only.
    paymentMethods: ["ACCOUNT_TRANSFER"],
  };

  // Monnify's field name is `metaData` (capital D). Only sent when non-empty.
  if (metadata && Object.keys(metadata).length > 0) {
    request.metaData = metadata;
  }

  if (redirectUrl) {
    request.redirectUrl = redirectUrl;
  }

  return request;
}

/**
 * Maps Monnify Initialize Transaction response -> normalized ProviderResult.
 *
 * This response does NOT contain the dynamic bank-transfer account, so no
 * paymentInstructions are created here. They come from step 2.
 */
export function fromMonnifyInitializeResponse(monnifyResponse) {
  const body = unwrapBody(monnifyResponse, "initialize");

  if (!body.transactionReference) {
    throw malformed("Monnify response missing transactionReference");
  }

  return {
    success: true,

    providerReference: body.transactionReference,

    // C-TEX normalized status — always PENDING after initialization.
    status: "PENDING",

    providerStatus: "PENDING",

    // Populated from fromMonnifyBankTransferResponse().
    paymentInstructions: null,

    // Kept for future payment methods such as CARD or mixed checkout.
    checkoutUrl: body.checkoutUrl || null,

    rawResponse: {
      transactionReference: body.transactionReference,
      paymentReference: body.paymentReference || null,
      checkoutUrl: body.checkoutUrl || null,
      merchantName: body.merchantName || null,
      enabledPaymentMethod: body.enabledPaymentMethod || [],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Step 2: Pay with Bank Transfer                                             */
/* -------------------------------------------------------------------------- */

/**
 * Builds the body for POST /api/v1/merchant/bank-transfer/init-payment.
 * bankCode is optional; when provided Monnify also returns a USSD string.
 */
export function toMonnifyBankTransferRequest({
  transactionReference,
  bankCode,
} = {}) {
  if (!transactionReference) {
    throw invalidRequest(
      "transactionReference is required for Monnify bank transfer"
    );
  }

  const request = { transactionReference };

  if (bankCode) {
    request.bankCode = String(bankCode);
  }

  return request;
}

/**
 * Maps Monnify "Pay with Bank Transfer" response
 * -> C-TEX PAY normalized bank-transfer instructions.
 *
 * Documented responseBody fields:
 *   accountNumber, accountName, bankName, bankCode (number),
 *   accountDurationSeconds, ussdPayment, requestTime,
 *   transactionReference, paymentReference, amount, fee, totalPayable
 */
export function fromMonnifyBankTransferResponse(monnifyResponse) {
  const body = unwrapBody(monnifyResponse, "bank-transfer");

  if (!body.accountNumber) {
    throw malformed("Monnify bank-transfer response missing accountNumber");
  }

  if (!body.accountName) {
    throw malformed("Monnify bank-transfer response missing accountName");
  }

  if (!body.bankName) {
    throw malformed("Monnify bank-transfer response missing bankName");
  }

  const durationSeconds = resolveAccountDurationSeconds(body);
  const windowStart = resolveWindowStart(body.requestTime);

  const expiresAt = new Date(windowStart.getTime() + durationSeconds * 1000);

  if (expiresAt.getTime() <= Date.now()) {
    throw malformed("Monnify returned an already expired transfer account");
  }

  return {
    type: "ACCOUNT_TRANSFER",

    accountNumber: String(body.accountNumber),

    accountName: body.accountName,

    bankName: body.bankName,

    // Monnify returns bankCode as a number; normalize to string.
    bankCode:
      body.bankCode !== undefined && body.bankCode !== null
        ? String(body.bankCode)
        : null,

    expiresAt,

    ussdPayment: body.ussdPayment || null,

    // Amounts normalized to kobo for reconciliation/debugging.
    amount: nairaToKobo(body.amount),
    fee: nairaToKobo(body.fee),
    totalPayable: nairaToKobo(body.totalPayable),

    // Useful for reconciliation/debugging.
    providerReference: body.transactionReference || null,
    providerPaymentReference: body.paymentReference || null,

    rawResponse: body,
  };
}

/* -------------------------------------------------------------------------- */
/* Verification                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Maps C-TEX verification context -> Monnify query parameters.
 * Monnify accepts either paymentReference or transactionReference.
 * We prefer paymentReference (our own reference) when available.
 */
export function toMonnifyVerifyRequest({ paymentReference, providerReference }) {
  if (paymentReference) {
    return { paymentReference };
  }
  if (providerReference) {
    return { transactionReference: providerReference };
  }
  throw providerError(
    "PROVIDER_VALIDATION_ERROR",
    "Missing both paymentReference and providerReference"
  );
}

/**
 * Maps Monnify verification response -> C-TEX normalized format.
 *
 * Returns the NORMALIZED provider contract consumed by the service layer:
 *
 *   {
 *     success: true,
 *     providerReference,        // MNFY|...
 *     paymentReference,         // CTEXPAY_...
 *     status,                   // C-TEX: PENDING|SUCCESS|FAILED|EXPIRED|CANCELLED
 *     providerStatus,           // original Monnify status (PAID, PENDING, ...)
 *     amount,                   // naira (same unit as Payment.amount)
 *     currency,                 // NGN
 *     paymentMethod,            // ACCOUNT_TRANSFER, CARD, ...
 *     paidAt,                   // Date or null
 *     rawResponse,              // sanitized provider body
 *   }
 *
 * Monnify response shape (from /api/v2/merchant/transactions/query):
 * {
 *   requestSuccessful: true,
 *   responseMessage: "success",
 *   responseBody: {
 *     transactionReference: "MNFY|...",
 *     paymentReference: "CTX_pay_...",
 *     amountPaid: "25000.00",       // naira
 *     totalPayable: "25000.00",
 *     settlementAmount: "24875.00",
 *     paymentStatus: "PAID",         // PAID | PARTIALLY_PAID | PENDING | OVERPAID | FAILED | EXPIRED | REVERSED
 *     currency: "NGN",
 *     paymentMethod: "ACCOUNT_TRANSFER",
 *     paidOn: "2026-09-28T02:15:30.000Z"
 *   }
 * }
 */
export function fromMonnifyVerifyResponse(monnifyResponse) {
  const body = monnifyResponse?.responseBody;

  if (!body || !body.paymentStatus) {
    const err = new Error(
      "Monnify verification response missing paymentStatus"
    );
    err.code = "PROVIDER_RESPONSE_MALFORMED";
    throw err;
  }

  const amountPaidNaira = Number(body.amountPaid);
  if (!Number.isFinite(amountPaidNaira)) {
    const err = new Error(
      "Monnify verification response has invalid amountPaid"
    );
    err.code = "PROVIDER_RESPONSE_MALFORMED";
    throw err;
  }

  // CRITICAL: convert naira → kobo so this value is directly comparable
  // with Payment.amount, LedgerEntry.amount, and everything else in C-TEX.
  const amountPaidKobo = Math.round(amountPaidNaira * 100);

  return {
    success: true,
    providerReference: body.transactionReference || null,
    paymentReference: body.paymentReference || null,
    providerStatus: body.paymentStatus,
    status: mapMonnifyStatusToCtex(body.paymentStatus),
    amount: amountPaidKobo,                 // ← kobo, always
    amountPaid: amountPaidKobo,             // ← keep alias for safety
    currency: body.currency || "NGN",
    paymentMethod: body.paymentMethod || null,
    paidAt: body.paidOn ? new Date(body.paidOn) : null,
    rawResponse: body,
  };
}

/**
 * Maps Monnify paymentStatus -> C-TEX status enum.
 *
 * Monnify: PAID | PARTIALLY_PAID | PENDING | OVERPAID | FAILED | REVERSED | EXPIRED
 * C-TEX:   PENDING | SUCCESS | FAILED | EXPIRED | CANCELLED
 *
 * Unknown statuses default to PENDING — never to SUCCESS — to prevent
 * a provider change from silently confirming a payment.
 */
function mapMonnifyStatusToCtex(monnifyStatus) {
  switch (monnifyStatus) {
    case "PAID":
      return "SUCCESS";
    case "OVERPAID":
      return "SUCCESS";                 // business rule: accept overpayment
    case "PARTIALLY_PAID":
      return "PENDING";                 // stays pending — underpayment path
    case "PENDING":
      return "PENDING";
    case "FAILED":
    case "REVERSED":
      return "FAILED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}