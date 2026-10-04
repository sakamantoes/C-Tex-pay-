import { monnifyRequest } from "./monnify.client.js";
import {
  toMonnifyInitializeRequest,
  fromMonnifyInitializeResponse,
  fromMonnifyBankTransferResponse,
  toMonnifyVerifyRequest,
  fromMonnifyVerifyResponse,
} from "./monnify.mapper.js";

/**
 * Monnify Provider Adapter
 *
 * Implements the C-TEX PAY PaymentProvider contract:
 *   - initializePayment(context)
 *   - initializeBankTransfer({ transactionReference, bankCode })
 *   - verifyPayment({ paymentReference, providerReference })
 *
 * The payment service consumes ONLY the normalized return shapes.
 * Monnify-specific field names never leave this folder.
 *
 * Monnify remains an internal provider.
 * Merchants and customers interact with C-TEX PAY.
 */

class MonnifyProvider {
  /**
   * Initialize a payment with Monnify.
   *
   * @param {object} paymentContext
   * @returns {Promise<object>} Normalized provider result
   */
  async initializePayment(paymentContext) {
    const requestBody = toMonnifyInitializeRequest(paymentContext);

    const monnifyResponse = await monnifyRequest(
      "/api/v1/merchant/transactions/init-transaction",
      { method: "POST", body: requestBody }
    );

    return fromMonnifyInitializeResponse(monnifyResponse);
  }

  /**
   * Initialize bank transfer instructions for an existing Monnify
   * transaction.
   *
   * @param {object} context
   * @param {string} context.transactionReference
   * @param {string|null} [context.bankCode]
   * @returns {Promise<object>} Normalized bank-transfer result
   */
  async initializeBankTransfer({ transactionReference, bankCode = null }) {
    if (
      typeof transactionReference !== "string" ||
      !transactionReference.trim()
    ) {
      const err = new Error(
        "A valid Monnify transactionReference is required."
      );
      err.code = "PROVIDER_VALIDATION_ERROR";
      throw err;
    }

    const requestBody = { transactionReference };
    if (bankCode) requestBody.bankCode = bankCode;

    const monnifyResponse = await monnifyRequest(
      "/api/v1/merchant/bank-transfer/init-payment",
      { method: "POST", body: requestBody }
    );

    return fromMonnifyBankTransferResponse(monnifyResponse);
  }

  /**
   * Verify a payment directly with Monnify.
   *
   * Uses the Monnify transaction query endpoint. The mapper converts
   * C-TEX PAY references into the query parameters expected by Monnify.
   *
   * @param {object} context
   * @param {string} [context.paymentReference]
   * @param {string} [context.providerReference]
   * @returns {Promise<object>} Normalized verification result
   */
  async verifyPayment({ paymentReference, providerReference }) {
    if (!paymentReference && !providerReference) {
      const err = new Error(
        "Either paymentReference or providerReference is required."
      );
      err.code = "PROVIDER_VALIDATION_ERROR";
      throw err;
    }

    const params = toMonnifyVerifyRequest({
      paymentReference,
      providerReference,
    });

    const queryString = new URLSearchParams(params).toString();
    const path = `/api/v2/merchant/transactions/query?${queryString}`;

    const monnifyResponse = await monnifyRequest(path, { method: "GET" });

    return fromMonnifyVerifyResponse(monnifyResponse);
  }
}

export default MonnifyProvider;