import envConfig from "../../config/constant.js";
import { xixapayRequest } from "./xixapay.client.js";
import {
  toXixapayCreateVirtualAccountRequest,
  fromXixapayCreateVirtualAccountResponse,
  fromXixapayVerifyResponse,
  XIXAPAY_BANK_CODES,
} from "./xixapay.mapper.js";

/**
 * Xixapay Provider Adapter
 *
 * Implements the C-TEX PaymentProvider contract:
 *   - initializePayment(context)
 *   - initializeBankTransfer(context)
 *   - verifyPayment({ paymentReference, providerReference })
 *
 * Xixapay's dynamic virtual account flow differs from Monnify:
 *   - Monnify: init-transaction → init-bank-transfer (two calls)
 *   - Xixapay: createVirtualAccount does both in one call
 *
 * To satisfy the C-TEX interface, this adapter:
 *   - initializePayment: validates inputs and returns a synthetic
 *     providerReference (the C-TEX payment reference we send as
 *     externalReference to Xixapay). No HTTP call.
 *   - initializeBankTransfer: performs the real createVirtualAccount
 *     call and returns the account details.
 *
 * This keeps the C-TEX service provider-agnostic.
 */
class XixapayProvider {
  constructor() {
    this.businessId = envConfig.XIXAPAY_BUSINESS_ID || null;
    this.bankCodes = this._resolveBankCodes();
    this.callbackUrl = envConfig.XIXAPAY_CALLBACK_URL || null;
    this.defaultExpiryMinutes =
      envConfig.XIXAPAY_ACCOUNT_EXPIRY_MINUTES || 30;
  }

  _resolveBankCodes() {
    const configured =
      envConfig.XIXAPAY_DEFAULT_BANK_CODE || XIXAPAY_BANK_CODES.PALMPAY;
    return [configured];
  }

  /**
   * initializePayment — pre-flight check and reference allocation.
   *
   * Xixapay does not have a separate "initialize transaction" step.
   * We return the C-TEX payment reference as the providerReference and
   * defer the real HTTP call to initializeBankTransfer.
   */
  async initializePayment(paymentContext) {
    if (!paymentContext?.paymentReference) {
      const err = new Error(
        "paymentReference is required for Xixapay initialization"
      );
      err.code = "PROVIDER_VALIDATION_ERROR";
      throw err;
    }
    if (!this.businessId) {
      const err = new Error(
        "XIXAPAY_BUSINESS_ID is not configured"
      );
      err.code = "PROVIDER_NOT_CONFIGURED";
      throw err;
    }

    return {
      success: true,
      provider: "XIXAPAY",
      providerReference: paymentContext.paymentReference,
      paymentReference: paymentContext.paymentReference,
      providerStatus: "PENDING",
      status: "PENDING",
      rawResponse: null,
    };
  }

  /**
   * initializeBankTransfer — the real Xixapay call.
   *
   * Sends createVirtualAccount with accountType: "dynamic" and returns
   * the generated bank account.
   */
  async initializeBankTransfer(context) {
    const {
      transactionReference,
      paymentReference,
      amount,
      customer,
      metadata,
    } = context;

    if (!transactionReference && !paymentReference) {
      const err = new Error(
        "Xixapay requires either transactionReference or paymentReference"
      );
      err.code = "PROVIDER_VALIDATION_ERROR";
      throw err;
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      const err = new Error(
        "A positive amount (in naira) is required for Xixapay"
      );
      err.code = "PROVIDER_VALIDATION_ERROR";
      throw err;
    }

    const requestBody = toXixapayCreateVirtualAccountRequest({
      paymentReference: paymentReference || transactionReference,
      amount: Number(amount), // naira
      customer,
      businessId: this.businessId,
      bankCodes: this.bankCodes,
      callbackUrl: this.callbackUrl,
    });

    const xixapayResponse = await xixapayRequest(
      "/api/v1/createVirtualAccount",
      { method: "POST", body: requestBody }
    );

    const normalized = fromXixapayCreateVirtualAccountResponse(xixapayResponse);

    /*
     * Xixapay does not return an expiry timestamp. We compute one
     * deterministically from the configured TTL so the C-TEX service
     * can enforce payment lifecycle rules.
     */
    const expiresAt = new Date(
      Date.now() + this.defaultExpiryMinutes * 60 * 1000
    );

    return {
      success: true,
      accountNumber: normalized.accountNumber,
      accountName: normalized.accountName,
      bankName: normalized.bankName,
      bankCode: normalized.bankCode,
      providerAccountId: normalized.providerAccountId,
      providerCustomerId: normalized.providerCustomerId,
      expiresAt,
      ussdPayment: null, // Xixapay dynamic accounts have no USSD fallback
      providerStatus: "PENDING",
      rawResponse: normalized.rawResponse,
    };
  }

  /**
   * verifyPayment — Xixapay has no public status endpoint.
   *
   * The C-TEX verification service catches this error and returns a
   * controlled "pending — awaiting webhook" response. Payment status is
   * only ever confirmed via the incoming webhook.
   */
  async verifyPayment() {
    return fromXixapayVerifyResponse();
  }
}

export default XixapayProvider;