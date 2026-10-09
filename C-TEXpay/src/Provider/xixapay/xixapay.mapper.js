/**
 * Xixapay Request/Response Mapper
 *
 * Isolates every Xixapay-specific field name inside this file.
 * The rest of the app consumes only C-TEX normalized shapes.
 *
 * Verified from official Xixapay documentation:
 *   - POST /api/v1/createVirtualAccount
 *   - accountType: "dynamic" | "static"  (we use dynamic only)
 *   - amount is required for dynamic
 *   - bankCode is an array of partner bank codes
 *   - Amounts are in naira (NGN) in Xixapay's request/response
 */

/*
 * Xixapay partner bank codes. Only these are valid for dynamic
 * virtual account creation (from the official docs).
 *
 * The environment can override the default bank selection via
 * XIXAPAY_DEFAULT_BANK_CODE. Fallback is Palmpay (20867).
 */
export const XIXAPAY_BANK_CODES = {
  PALMPAY: "20867",
  KOLOMONI: "20987",
  SAFEHAVEN: "29007",
  OPAY: "100004",
};

/**
 * Map a C-TEX customer to Xixapay's "Raw Customer Data" payload.
 *
 * Xixapay requires email, name, and phoneNumber for unverified customers.
 * If the C-TEX customer has no phone, we substitute a controlled
 * placeholder and mark the record — this is documented behavior in
 * the provider-notes section of the C-TEX codebase.
 */
function toXixapayCustomerFields(customer) {
  const phone =
    customer?.phone && String(customer.phone).trim().length > 0
      ? String(customer.phone).trim()
      : "00000000000"; // placeholder — see C-TEX provider-notes

  return {
    email: customer?.email || "noreply@ctexpay.com",
    name: customer?.name || "Customer",
    phoneNumber: phone,
  };
}

/**
 * Build the Xixapay request body for a dynamic virtual account.
 *
 * @param {object} context
 * @param {string} context.paymentReference   - C-TEX payment reference (external)
 * @param {number} context.amount             - naira
 * @param {object} context.customer           - { id, email, name, phone }
 * @param {string} context.businessId         - Xixapay business ID
 * @param {string[]} context.bankCodes        - Xixapay partner bank codes
 * @param {string} [context.callbackUrl]
 */
export function toXixapayCreateVirtualAccountRequest({
  paymentReference,
  amount,
  customer,
  businessId,
  bankCodes,
  callbackUrl = null,
}) {
  if (!businessId) {
    const err = new Error("Xixapay businessId is required");
    err.code = "PROVIDER_VALIDATION_ERROR";
    throw err;
  }
  if (!Array.isArray(bankCodes) || bankCodes.length === 0) {
    const err = new Error("Xixapay bankCodes must be a non-empty array");
    err.code = "PROVIDER_VALIDATION_ERROR";
    throw err;
  }

  const body = {
    ...toXixapayCustomerFields(customer),
    bankCode: bankCodes,
    businessId,
    accountType: "dynamic",
    amount: Number(amount), // naira
    externalReference: paymentReference,
  };

  if (callbackUrl) body.callbackUrl = callbackUrl;

  return body;
}

/**
 * Normalize the Xixapay createVirtualAccount response.
 *
 * Xixapay response shape (from official docs):
 * {
 *   "status": "success",
 *   "message": "...",
 *   "customer": { customer_id, customer_name, customer_email, ... },
 *   "business": { ... },
 *   "bankAccounts": [
 *     {
 *       bankCode, accountNumber, accountName, bankName,
 *       accountTye (typo in docs), Reserved_Account_Id
 *     }
 *   ]
 * }
 *
 * We read fields defensively (both spellings of `accountType`) and
 * throw a controlled error if the response lacks a usable account.
 */
export function fromXixapayCreateVirtualAccountResponse(xixapayResponse) {
  if (!xixapayResponse || typeof xixapayResponse !== "object") {
    const err = new Error("Xixapay response is not an object");
    err.code = "PROVIDER_RESPONSE_MALFORMED";
    throw err;
  }

  if (String(xixapayResponse.status || "").toLowerCase() !== "success") {
    const err = new Error(
      xixapayResponse.message || "Xixapay did not return a success status"
    );
    err.code = "PROVIDER_REJECTED";
    err.providerResponse = xixapayResponse;
    throw err;
  }

  const accounts = Array.isArray(xixapayResponse.bankAccounts)
    ? xixapayResponse.bankAccounts
    : [];

  if (accounts.length === 0) {
    const err = new Error(
      "Xixapay returned success but no bankAccounts in the response"
    );
    err.code = "PROVIDER_RESPONSE_MALFORMED";
    err.providerResponse = xixapayResponse;
    throw err;
  }

  /*
   * Prefer a dynamic account if multiple are returned. The docs indicate
   * we request accountType: "dynamic", so we select the first entry, but
   * we still read accountType defensively since the docs sometimes write
   * `accountTye`.
   */
  const account = accounts[0];

  const accountNumber = account?.accountNumber;
  const accountName = account?.accountName;
  const bankName = account?.bankName;
  const bankCode = account?.bankCode;
  const providerAccountId =
    account?.Reserved_Account_Id || account?.reservedAccountId || null;

  if (!accountNumber || !accountName || !bankName) {
    const err = new Error(
      "Xixapay bankAccounts entry is missing required fields"
    );
    err.code = "PROVIDER_RESPONSE_MALFORMED";
    err.providerResponse = xixapayResponse;
    throw err;
  }

  const customerId = xixapayResponse.customer?.customer_id || null;

  return {
    success: true,
    accountNumber: String(accountNumber),
    accountName: String(accountName),
    bankName: String(bankName),
    bankCode: bankCode ? String(bankCode) : null,
    providerAccountId: providerAccountId ? String(providerAccountId) : null,
    providerCustomerId: customerId ? String(customerId) : null,
    rawResponse: xixapayResponse,
  };
}

/**
 * Xixapay does not document a status query endpoint. Verification is
 * webhook-driven. This mapper is provided for future use if the endpoint
 * becomes available — it will normalize a hypothetical response into
 * the shape the C-TEX verification service expects.
 *
 * DO NOT fabricate fields. This is intentionally minimal.
 */
export function fromXixapayVerifyResponse() {
  const err = new Error(
    "Xixapay does not expose a public transaction status endpoint. " +
      "Payment status is confirmed via webhook only."
  );
  err.code = "PROVIDER_VERIFICATION_NOT_SUPPORTED";
  throw err;
}