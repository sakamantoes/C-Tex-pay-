import envConfig from "../../config/constant.js";

/**
 * Monnify Request/Response Mapper
 *
 * Converts between C-TEX PAY internal format and Monnify API format.
 * Provider-specific field names remain isolated in this file.
 *
 * Money: C-TEX PAY stores NGN in kobo (integers). Monnify uses naira (decimals).
 *
 * Bank-transfer flow:
 *   1. POST /api/v1/merchant/transactions/init-transaction
 *        toMonnifyInitializeRequest -> fromMonnifyInitializeResponse
 *        (returns transactionReference + checkoutUrl, no bank details)
 *   2. POST /api/v1/merchant/bank-transfer/init-payment
 *        toMonnifyBankTransferRequest -> fromMonnifyBankTransferResponse
 *        (returns the dynamic virtual account the customer pays into)
 */

/** Monnify's documented validity of a dynamic account: 2400s (40 minutes). */
const MAX_ACCOUNT_DURATION_SECONDS = 2400;

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
 * Resolves the remaining validity of the virtual account in seconds.
 *
 * Monnify's bank-transfer response returns `accountDurationSeconds`.
 * (`accountDuration` is accepted as a legacy fallback.)
 * If neither is usable we fall back to the documented 40-minute window
 * rather than failing a payment whose account was already generated.
 */
function resolveAccountDurationSeconds(body) {
  const candidates = [body.accountDurationSeconds, body.accountDuration];

  for (const candidate of candidates) {
    const seconds = Number(candidate);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(Math.floor(seconds), MAX_ACCOUNT_DURATION_SECONDS);
    }
  }

  return MAX_ACCOUNT_DURATION_SECONDS;
}

/* -------------------------------------------------------------------------- */
/* Step 1: Initialize Transaction                                             */
/* -------------------------------------------------------------------------- */

/**
 * Maps C-TEX PAY PaymentContext -> Monnify Initialize Transaction request.
 *
 * Example: 25000 kobo -> 250 NGN.
 */
export function toMonnifyInitializeRequest(paymentContext) {
  const {
    paymentReference,
    amount,
    currency,
    customer,
    description,
    metadata,
    redirectUrl,
  } = paymentContext || {};

  if (!paymentReference) {
    throw invalidRequest("Payment reference is required for Monnify initialization");
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw invalidRequest(
      "Payment amount must be a positive integer in the smallest currency unit"
    );
  }

  if (!customer?.email) {
    throw invalidRequest("Customer email is required for Monnify payment initialization");
  }

  if (!customer?.name) {
    throw invalidRequest("Customer name is required for Monnify payment initialization");
  }

  if (!currency) {
    throw invalidRequest("Currency is required for Monnify payment initialization");
  }

  if (!envConfig.MONNIFY_CONTRACT_CODE) {
    throw providerError(
      "PROVIDER_CONFIGURATION_ERROR",
      "Monnify contract code is not configured"
    );
  }

  const request = {
    amount: Number((amount / 100).toFixed(2)),
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
export function toMonnifyBankTransferRequest({ transactionReference, bankCode } = {}) {
  if (!transactionReference) {
    throw invalidRequest("transactionReference is required for Monnify bank transfer");
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
  const expiresAt = new Date(Date.now() + durationSeconds * 1000);

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

    // Amounts normalized to kobo.
    amount: nairaToKobo(body.amount),
    fee: nairaToKobo(body.fee),
    totalPayable: nairaToKobo(body.totalPayable),

    // Useful for reconciliation/debugging.
    providerReference: body.transactionReference || null,
    providerPaymentReference: body.paymentReference || null,
  };
}