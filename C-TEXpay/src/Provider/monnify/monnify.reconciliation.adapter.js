import { monnifyRequest } from "./monnify.client.js";
import {
  fromMonnifyVerifyResponse,
} from "./monnify.mapper.js";

/**
 * Monnify Reconciliation Adapter
 *
 * Provides queryable access to Monnify transaction data.
 * Does NOT have a bulk reconciliation endpoint — we query by
 * provider reference (per-transaction). Bulk reconciliation
 * iterates over C-TEX records and queries Monnify for each.
 *
 * All HTTP calls go through the existing monnifyRequest() client,
 * so auth, tokens, timeouts, and error normalization are shared.
 */
class MonnifyReconciliationAdapter {
  /**
   * Query Monnify for a single transaction by C-TEX provider reference
   * or by paymentReference. Returns normalized response or a
   * { notFound: true } sentinel.
   */
  async queryPayment({ paymentReference, providerReference }) {
    const params = {};
    if (paymentReference) params.paymentReference = paymentReference;
    else if (providerReference) params.transactionReference = providerReference;
    else {
      const err = new Error("No reference provided");
      err.code = "INVALID_ARGUMENT";
      throw err;
    }

    const qs = new URLSearchParams(params).toString();
    const path = `/api/v2/merchant/transactions/query?${qs}`;

    try {
      const response = await monnifyRequest(path, { method: "GET" });
      return {
        notFound: false,
        normalized: fromMonnifyVerifyResponse(response),
      };
    } catch (error) {
      /*
       * Monnify returns 404 in the error path when a transaction
       * does not exist. We distinguish that from network/server errors
       * so the reconciliation service can tell "not found" from
       * "provider unavailable."
       */
      if (error.code === "PROVIDER_REJECTED" && error.httpStatus === 404) {
        return { notFound: true };
      }
      throw error;
    }
  }

  /**
   * Query payout status. Uses the same adapter as getPayoutStatus
   * but returns a notFound sentinel on 404.
   */
 async queryPayout({ reference }) {
  const qs = new URLSearchParams({ reference }).toString();
  const path = `/api/v2/disbursements/single/summary?${qs}`;

  try {
    const response = await monnifyRequest(path, { method: "GET" });
    const body = response?.responseBody || null;

    if (!body) {
      return { notFound: false, normalized: null };
    }

    // Monnify returns `amount` in naira (major units, decimal).
    // C-TEX stores everything in kobo (integer minor units).
    // Convert once here so downstream comparison is unit-consistent.
    const amountNaira = Number(body.amount);
    const amountKobo = Number.isFinite(amountNaira)
      ? Math.round(amountNaira * 100)
      : null;

    return {
      notFound: false,
      normalized: {
        providerReference: body.reference || reference,
        providerStatus: body.status || "PENDING",
        amount: amountKobo,          // kobo
        currency: body.currency || "NGN",
        rawResponse: body,
      },
    };
  } catch (error) {
    if (error.code === "PROVIDER_REJECTED" && error.httpStatus === 404) {
      return { notFound: true };
    }
    throw error;
  }
}
}

export default MonnifyReconciliationAdapter;