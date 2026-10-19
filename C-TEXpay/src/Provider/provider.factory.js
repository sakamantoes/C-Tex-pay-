import envConfig from "../config/constant.js";
import MonnifyProvider from "./monnify/monnify.provider.js";
import MonnifyPayoutAdapter from "./monnify/monnify.payout.adapter.js";
import XixapayProvider from "./xixapay/xixapay.provider.js";

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
 * Returns the payout adapter for the active provider.
 * Mirrors getPaymentProvider() so payout and payment use the same
 * server-side provider selection.
 *
 * Xixapay payouts are not implemented in this stage (see scope notes).
 */
export function getPayoutProvider() {
  const activeProvider = String(envConfig.PAYOUT_PROVIDER || "").toUpperCase();

  switch (activeProvider) {
    case "MONNIFY":
      return new MonnifyPayoutAdapter();
    case "XIXAPAY":
      throw new Error(
        "Xixapay bank payouts are not supported by the configured integration. Set PAYOUT_PROVIDER=MONNIFY to use Monnify disbursements."
      );
    default:
      throw new Error(
        `Unsupported payout provider: ${activeProvider}`
      );
  }
}

export { PROVIDERS };
