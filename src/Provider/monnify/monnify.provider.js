import { monnifyRequest } from "./monnify.client.js";
import {
  toMonnifyInitializeRequest,
  fromMonnifyInitializeResponse,
  fromMonnifyBankTransferResponse,
} from "./monnify.mapper.js";


/**
 * Monnify Provider Adapter
 * 
 * Implements the PaymentProvider contract.
 * Payment service calls this — never touches Monnify HTTP directly.
 */

class MonnifyProvider {
  /**
   * Initialize a bank transfer payment with Monnify.
   * 
   * @param {object} paymentContext - C-TEX PAY internal format
   * @returns {Promise<object>} Normalized ProviderResult
   */
  async initializePayment(paymentContext) {
    const requestBody = toMonnifyInitializeRequest(paymentContext);

    const monnifyResponse = await monnifyRequest(
      "/api/v1/merchant/transactions/init-transaction",
      {
        method: "POST",
        body: requestBody,
      }
    );

    return fromMonnifyInitializeResponse(monnifyResponse);
  }

   async initializeBankTransfer({ transactionReference, bankCode = null }) {
    const requestBody = { transactionReference };
    if (bankCode) {
      requestBody.bankCode = bankCode; // also returns USSD string for that bank
    }

    const monnifyResponse = await monnifyRequest(
      "/api/v1/merchant/bank-transfer/init-payment",
      { method: "POST", body: requestBody }
    );

    return fromMonnifyBankTransferResponse(monnifyResponse);
  }

}

export default MonnifyProvider;