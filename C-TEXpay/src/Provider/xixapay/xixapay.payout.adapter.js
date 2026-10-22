import envConfig from "../../config/constant.js";
import { xixapayRequest } from "./xixapay.client.js";

function providerError(code, message, providerResponse = undefined) {
  const error = new Error(message);
  error.code = code;
  if (providerResponse !== undefined) error.providerResponse = providerResponse;
  return error;
}

function assertPayoutConfiguration({ requireBusiness = false } = {}) {
  if (!envConfig.XIXAPAY_API_KEY || !envConfig.XIXAPAY_API_SECRET) {
    throw providerError(
      "PROVIDER_NOT_CONFIGURED",
      "Xixapay API credentials are not configured"
    );
  }
  if (requireBusiness && !envConfig.XIXAPAY_BUSINESS_ID) {
    throw providerError(
      "PROVIDER_NOT_CONFIGURED",
      "XIXAPAY_BUSINESS_ID is not configured"
    );
  }
}

function assertSuccessfulEnvelope(response, label) {
  if (!response || typeof response !== "object") {
    throw providerError(
      "PROVIDER_RESPONSE_MALFORMED",
      `Xixapay ${label} response is malformed`
    );
  }
  if (String(response.status || "").toLowerCase() !== "success") {
    throw providerError(
      "PROVIDER_REJECTED",
      response.message || `Xixapay ${label} was rejected`,
      response
    );
  }
}

/*
 * Xixapay returns inconsistent naming across endpoints:
 *   banks:  bank_name, bank_code   (snake_case, BARE ARRAY response)
 *   verify: AccountName, BankName  (PascalCase, status envelope)
 *   transfer: status, reference    (lowercase, status envelope)
 *
 * Normalize defensively at the adapter boundary.
 */
function pick(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

/*
 * Extract the bank list from whatever shape Xixapay returns.
 *
 * The live /api/get/banks endpoint returns a bare JSON array:
 *   [ { bank_name, bank_code, slug, logo }, ... ]
 *
 * We also tolerate an envelope form in case it changes:
 *   { status: "success", data: [ ... ] }
 *   { status: "success", banks: [ ... ] }
 *
 * An envelope that explicitly reports a non-success status is rejected.
 */
function extractBankList(response) {
  if (Array.isArray(response)) return response;

  if (response && typeof response === "object") {
    if (response.status !== undefined) {
      assertSuccessfulEnvelope(response, "bank list");
    }
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.banks)) return response.banks;
  }

  throw providerError(
    "PROVIDER_RESPONSE_MALFORMED",
    "Xixapay bank list response is not a recognized shape",
    response && typeof response === "object" ? response : undefined
  );
}

/*
 * Bank-list hygiene: Xixapay returns a few unusable rows:
 *   - bank_code: "NOT find in NIP"    → not payable over NIP
 *   - bank_code: "test"               → test stub
 *   - bank_name: "testbank1"          → test stub
 * Filter these so merchants never see or select them.
 */
const INVALID_CODE_PATTERNS = [/^NOT find/i, /^test$/i];
const INVALID_NAME_PATTERNS = [
  /^test\s*aa+/i,
  /^test\s*pion/i,
  /^testbank/i,
  /^test\d+/i,
  /^testend$/i,
];

function isValidBankCode(code) {
  const s = String(code ?? "").trim();
  if (!s) return false;
  if (INVALID_CODE_PATTERNS.some((p) => p.test(s))) return false;
  return /^\d{3,7}$/.test(s);
}

function isValidBankName(name) {
  const s = String(name ?? "").trim();
  if (!s) return false;
  if (INVALID_NAME_PATTERNS.some((p) => p.test(s))) return false;
  return true;
}

/** Xixapay bank disbursement adapter; monetary inputs from C-TEX are kobo. */
class XixapayPayoutAdapter {
  async getBanks() {
    assertPayoutConfiguration();
    const response = await xixapayRequest("/api/get/banks", { method: "GET" });
    const list = extractBankList(response);

    return list
      .map((bank) => {
        const name = pick(bank?.bank_name, bank?.bankName);
        const code = pick(bank?.bank_code, bank?.bankCode);
        if (!isValidBankName(name) || !isValidBankCode(code)) return null;
        return { name: String(name).trim(), code: String(code).trim() };
      })
      .filter(Boolean);
  }

  async validateBankAccount({ accountNumber, bankCode }) {
    assertPayoutConfiguration();
    if (
      !/^\d{10}$/.test(String(accountNumber || "")) ||
      !String(bankCode || "").trim()
    ) {
      throw providerError(
        "INVALID_BANK_ACCOUNT",
        "A bank and 10-digit account number are required"
      );
    }
    const response = await xixapayRequest("/api/verify/bank", {
      method: "POST",
      body: { bank: String(bankCode), accountNumber: String(accountNumber) },
    });
    assertSuccessfulEnvelope(response, "bank verification");

    const accountName = pick(
      response.AccountName,
      response.accountName,
      response.account_name
    );
    if (!accountName || typeof accountName !== "string") {
      throw providerError(
        "PROVIDER_RESPONSE_MALFORMED",
        "Xixapay bank verification response is missing AccountName"
      );
    }

    return {
      accountName: accountName.trim(),
      accountNumber: String(accountNumber),
      bankCode: String(bankCode),
      bankName: pick(
        response.BankName,
        response.bankName,
        response.bank_name
      ),
      rawResponse: response,
    };
  }

  async initiatePayout({ amountKobo, reference, narration, bankCode, accountNumber }) {
    assertPayoutConfiguration({ requireBusiness: true });
    if (!Number.isSafeInteger(Number(amountKobo)) || Number(amountKobo) <= 0) {
      throw providerError(
        "INVALID_PAYOUT_AMOUNT",
        "Payout amount must be positive integer kobo"
      );
    }
    if (
      !/^\d{10}$/.test(String(accountNumber || "")) ||
      !String(bankCode || "").trim()
    ) {
      throw providerError(
        "INVALID_BANK_ACCOUNT",
        "A bank and 10-digit account number are required"
      );
    }

    const requestBody = {
      businessId: envConfig.XIXAPAY_BUSINESS_ID,
      amount: Number(amountKobo) / 100,
      bank: String(bankCode),
      accountNumber: String(accountNumber),
      narration: narration || "Wallet withdrawal",
    };

    let response;
    try {
      response = await xixapayRequest("/api/v1/transfer", {
        method: "POST",
        body: requestBody,
      });
    } catch (error) {
      const body = error.providerResponse;
      if (String(body?.status || "").toLowerCase() === "failed") {
        return {
          providerReference: body.reference || reference,
          providerStatus: "FAILED",
          rawResponse: body,
        };
      }
      throw error;
    }

    const status = String(response?.status || "").toLowerCase();
    if (status === "failed") {
      return {
        providerReference: response.reference || reference,
        providerStatus: "FAILED",
        rawResponse: response,
      };
    }
    if (status !== "success") {
      throw providerError(
        "PROVIDER_RESPONSE_MALFORMED",
        "Xixapay transfer response has no recognized status",
        response
      );
    }
    if (!response.reference || typeof response.reference !== "string") {
      throw providerError(
        "PROVIDER_RESPONSE_MALFORMED",
        "Xixapay transfer response is missing its reference",
        response
      );
    }
    return {
      providerReference: response.reference,
      providerStatus: "SUCCESS",
      rawResponse: response,
    };
  }
}

export default XixapayPayoutAdapter;