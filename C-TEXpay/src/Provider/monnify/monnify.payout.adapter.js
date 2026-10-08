import { monnifyRequest } from "./monnify.client.js";
import envConfig from "../../config/constant.js";

/**
 * Monnify Payout Adapter
 *
 * Wraps the Monnify disbursement API documented at:
 *   - POST /api/v2/disbursements/account/validate   (bank name enquiry)
 *   - POST /api/v2/disbursements/single             (single transfer)
 *   - GET  /api/v2/disbursements/single/summary     (status query)
 *
 * Key facts (verified against official Monnify docs, March 2026):
 *   - destinationAccountName is REQUIRED and must match a fuzzy check
 *   - single transfers may require OTP unless whitelisted by Monnify
 *   - `async: true` in the body means only webhook delivers final status
 *   - reference is your idempotency key on the Monnify side
 *
 * Amounts are in naira (major units) — C-TEX internally stores kobo,
 * so the adapter converts kobo → naira on the way out.
 */

class MonnifyPayoutAdapter {
  /**
   * Bank account name enquiry.
   * Returns { accountName } on success, throws ProviderError on failure.
   */
 async validateBankAccount({ accountNumber, bankCode }) {
  // Monnify's v2 account validation uses GET with query parameters
  const qs = new URLSearchParams({
    accountNumber: String(accountNumber),
    bankCode: String(bankCode),
  }).toString();

  const monnifyResponse = await monnifyRequest(
    `/api/v2/disbursements/account/validate?${qs}`,
    {
      method: "GET",  // ✅ Correct - v2 endpoint uses GET
    }
  );

  const body = monnifyResponse?.responseBody;
  if (!body?.accountName) {
    const err = new Error(
      "Monnify bank validation response missing accountName"
    );
    err.code = "PROVIDER_RESPONSE_MALFORMED";
    throw err;
  }

  return {
    accountName: String(body.accountName),
    accountNumber: String(body.accountNumber || accountNumber),
    bankCode: String(body.bankCode || bankCode),
    rawResponse: body,
  };
}

  /**
   * Initiate a single disbursement.
   * Amount is in kobo; converted to naira for Monnify.
   */
  async initiatePayout({
    amountKobo,
    reference,
    narration,
    bankCode,
    accountNumber,
    accountName,
    currency = "NGN",
    sourceAccountNumber,
    async = false,
  }) {
    if (!sourceAccountNumber) {
      throw Object.assign(
        new Error(
          "sourceAccountNumber is required — check MONNIFY_PAYOUT_SOURCE_ACCOUNT"
        ),
        { code: "PAYOUT_SOURCE_ACCOUNT_MISSING" }
      );
    }

    const monnifyResponse = await monnifyRequest(
      "/api/v2/disbursements/single",
      {
        method: "POST",
        body: {
          amount: Number(amountKobo) / 100,
          reference,
          narration: narration || "C-TEX PAY payout",
          destinationBankCode: String(bankCode),
          destinationAccountNumber: String(accountNumber),
          destinationAccountName: String(accountName),
          currency,
          sourceAccountNumber: String(sourceAccountNumber),
          async: Boolean(async),
        },
      }
    );

    const body = monnifyResponse?.responseBody;
    if (!body) {
      const err = new Error(
        "Monnify payout response missing responseBody"
      );
      err.code = "PROVIDER_RESPONSE_MALFORMED";
      throw err;
    }

    return {
      providerReference: String(body.reference || reference),
      providerStatus: String(body.status || "PENDING"),
      amount: body.amount ?? null,
      rawResponse: body,
    };
  }

  /**
   * Query the status of a disbursement by reference.
   */
  async getPayoutStatus({ reference }) {
    const qs = new URLSearchParams({ reference }).toString();
    const monnifyResponse = await monnifyRequest(
      `/api/v2/disbursements/single/summary?${qs}`,
      { method: "GET" }
    );

    const body = monnifyResponse?.responseBody;
    if (!body) {
      const err = new Error(
        "Monnify payout status response missing responseBody"
      );
      err.code = "PROVIDER_RESPONSE_MALFORMED";
      throw err;
    }

    return {
      providerReference: String(body.reference || reference),
      providerStatus: String(body.status || "PENDING"),
      failureCode: body.failureReasonCode || null,
      failureMessage: body.failureReason || null,
      rawResponse: body,
    };
  }
}

export default MonnifyPayoutAdapter;