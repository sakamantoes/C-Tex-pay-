import envConfig from "../config/constant.js";
import MonnifyProvider from "./monnify/monnify.provider.js";
import MonnifyPayoutAdapter from "./monnify/monnify.payout.adapter.js";
import XixapayProvider from "./xixapay/xixapay.provider.js";
import XixapayPayoutAdapter from "./xixapay/xixapay.payout.adapter.js";

/**
 * Provider Factory
 *
 * Centralizes provider selection. Server-side controlled.
 * Add new providers here — merchant API contract remains unchanged.
 */

const PROVIDERS = {
  MONNIFY: "MONNIFY",
  XIXAPAY: "XIXAPAY",
};

/**
 * Returns the configured provider for this environment.
 * Provider selection is server-side only, never client-supplied.
 */
export function getPaymentProvider() {
  const activeProvider = (
    envConfig.PAYMENT_PROVIDER || "MONNIFY"
  ).toUpperCase();

  switch (activeProvider) {
    case PROVIDERS.MONNIFY:
      return new MonnifyProvider();
    case PROVIDERS.XIXAPAY:
      return new XixapayProvider();
    default:
      throw new Error(`Unsupported payment provider: ${activeProvider}`);
  }
}

/**
 * Returns the payout adapter for the selected payout provider. Payouts are
 * selected independently from collection payments and stored per payout.
 */
export function getPayoutProvider(providerName = envConfig.PAYOUT_PROVIDER) {
  const activeProvider = String(providerName || "MONNIFY").toUpperCase();

  switch (activeProvider) {
    case "MONNIFY":
      return new MonnifyPayoutAdapter();
    case "XIXAPAY":
      return new XixapayPayoutAdapter();
    default:
      throw new Error(
        `Unsupported payout provider: ${activeProvider}`
      );
  }
}

export { PROVIDERS };
