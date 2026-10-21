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
    throw providerError("PROVIDER_NOT_CONFIGURED", "Xixapay API credentials are not configured");
  }
  if (requireBusiness && !envConfig.XIXAPAY_BUSINESS_ID) {
    throw providerError("PROVIDER_NOT_CONFIGURED", "XIXAPAY_BUSINESS_ID is not configured");
  }
}

function assertSuccessfulEnvelope(response, label) {
  if (!response || typeof response !== "object") {
    throw providerError("PROVIDER_RESPONSE_MALFORMED", `Xixapay ${label} response is malformed`);
  }
  if (String(response.status || "").toLowerCase() !== "success") {
    throw providerError("PROVIDER_REJECTED", response.message || `Xixapay ${label} was rejected`, response);
  }
}

/** Xixapay bank disbursement adapter; monetary inputs from C-TEX are kobo. */
class XixapayPayoutAdapter {
  async getBanks() {
    assertPayoutConfiguration();
    const response = await xixapayRequest("/api/get/banks", { method: "GET" });
    assertSuccessfulEnvelope(response, "bank list");
    if (!Array.isArray(response.data)) {
      throw providerError("PROVIDER_RESPONSE_MALFORMED", "Xixapay bank list has no data array");
    }
    return response.data
      .filter((bank) => bank?.bankName && bank?.bankCode != null)
      .map((bank) => ({ name: String(bank.bankName), code: String(bank.bankCode) }));
  }

  async validateBankAccount({ accountNumber, bankCode }) {
    assertPayoutConfiguration();
    if (!/^\d{10}$/.test(String(accountNumber || "")) || !String(bankCode || "").trim()) {
      throw providerError("INVALID_BANK_ACCOUNT", "A bank and 10-digit account number are required");
    }
    const response = await xixapayRequest("/api/verify/bank", {
      method: "POST",
      body: { bank: String(bankCode), accountNumber: String(accountNumber) },
    });
    assertSuccessfulEnvelope(response, "bank verification");
    const accountName = response.AccountName || response.accountName;
    if (!accountName || typeof accountName !== "string") {
      throw providerError("PROVIDER_RESPONSE_MALFORMED", "Xixapay bank verification response is missing AccountName");
    }
    return {
      accountName: accountName.trim(),
      accountNumber: String(accountNumber),
      bankCode: String(bankCode),
      bankName: response.BankName || response.bankName || null,
      rawResponse: response,
    };
  }

  async initiatePayout({ amountKobo, reference, narration, bankCode, accountNumber }) {
    assertPayoutConfiguration({ requireBusiness: true });
    if (!Number.isSafeInteger(Number(amountKobo)) || Number(amountKobo) <= 0) {
      throw providerError("INVALID_PAYOUT_AMOUNT", "Payout amount must be positive integer kobo");
    }
    if (!/^\d{10}$/.test(String(accountNumber || "")) || !String(bankCode || "").trim()) {
      throw providerError("INVALID_BANK_ACCOUNT", "A bank and 10-digit account number are required");
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
      response = await xixapayRequest("/api/v1/transfer", { method: "POST", body: requestBody });
    } catch (error) {
      // The provider documents status=failed as a definitive rejection.
      // Network errors and other HTTP errors remain ambiguous and must retain
      // the existing payout reservation for reconciliation.
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
      return { providerReference: response.reference || reference, providerStatus: "FAILED", rawResponse: response };
    }
    if (status !== "success") {
      throw providerError("PROVIDER_RESPONSE_MALFORMED", "Xixapay transfer response has no recognized status", response);
    }
    if (!response.reference || typeof response.reference !== "string") {
      // Transfer may have been queued, but without its provider reference we
      // cannot safely identify it later. Keep the reservation in UNKNOWN.
      throw providerError("PROVIDER_RESPONSE_MALFORMED", "Xixapay transfer response is missing its reference", response);
    }
    return {
      providerReference: response.reference,
      providerStatus: "SUCCESS",
      rawResponse: response,
    };
  }
}

export default XixapayPayoutAdapter;
