import { MerchantSetting } from "../models/index.js";
import { validateMerchantUrl } from "../utils/urlValidator.js";

/* =========================================================
 * ERRORS
 * ======================================================= */

export class MerchantSettingError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/* =========================================================
 * DEFAULTS
 * ======================================================= */

const DEFAULT_SETTINGS = {
  notifyPaymentSuccessInApp: true,
  notifyPaymentSuccessEmail: true,
  notificationEmail: null,
};

const REDIRECT_URL_FIELDS = [
  "successRedirectUrl",
  "failureRedirectUrl",
  "cancelRedirectUrl",
];

/* =========================================================
 * SERIALIZER
 * ======================================================= */

function toPublicSettings(setting) {
  if (!setting) return null;
  const d = setting.toJSON ? setting.toJSON() : setting;
  return {
    id: d.id,
    merchantId: d.merchantId,

    // Notification prefs
    notifyPaymentSuccessInApp: d.notifyPaymentSuccessInApp,
    notifyPaymentSuccessEmail: d.notifyPaymentSuccessEmail,
    notificationEmail: d.notificationEmail || null,

    // Redirect URLs
    successRedirectUrl: d.successRedirectUrl || null,
    failureRedirectUrl: d.failureRedirectUrl || null,
    cancelRedirectUrl: d.cancelRedirectUrl || null,

    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/* =========================================================
 * SINGLETON ACCESSOR
 * ======================================================= */

/**
 * Get or create the singleton setting row for the merchant.
 * Safe to call with a transaction for atomic flows.
 */
async function getOrCreateSetting(merchantId, transaction = null) {
  const [setting] = await MerchantSetting.findOrCreate({
    where: { merchantId },
    defaults: { merchantId, ...DEFAULT_SETTINGS },
    transaction,
  });
  return setting;
}

/* =========================================================
 * READ
 * ======================================================= */

export async function getMerchantSettings({ merchantId }) {
  const setting = await getOrCreateSetting(merchantId);
  return toPublicSettings(setting);
}

/* =========================================================
 * UPDATE — NOTIFICATION PREFERENCES ONLY
 * ======================================================= */

/**
 * Update notification preferences only.
 * Redirect URLs are handled by updateMerchantRedirectUrls.
 */
export async function updateMerchantSettings({ merchantId, updates }) {
  const setting = await getOrCreateSetting(merchantId);

  for (const field of Object.keys(DEFAULT_SETTINGS)) {
    if (updates[field] !== undefined) {
      setting[field] = updates[field];
    }
  }

  await setting.save();
  return toPublicSettings(setting);
}

/* =========================================================
 * UPDATE — REDIRECT URLS
 * ======================================================= */

/**
 * Update one or more of the merchant's redirect URLs.
 *
 * Fields set to "" (empty string) or null are cleared.
 * Fields omitted from the payload are left untouched.
 * Malformed URLs are rejected with a specific error.
 */
export async function updateMerchantRedirectUrls({ merchantId, updates }) {
  const setting = await getOrCreateSetting(merchantId);

  const patch = {};

  for (const field of REDIRECT_URL_FIELDS) {
    if (!(field in updates)) continue;

    const raw = updates[field];

    // Explicit clear
    if (raw === null || raw === undefined || raw === "") {
      patch[field] = null;
      continue;
    }

    const result = validateMerchantUrl(raw);
    if (!result.valid) {
      throw new MerchantSettingError(
        `Invalid URL for ${field}: ${humanReason(result.reason)}`,
        "INVALID_URL",
        400
      );
    }

    patch[field] = result.url;
  }

  if (Object.keys(patch).length === 0) {
    throw new MerchantSettingError(
      "No URL fields to update",
      "NO_UPDATES",
      400
    );
  }

  await setting.update(patch);
  return toPublicSettings(setting);
}

/* =========================================================
 * HELPERS
 * ======================================================= */

function humanReason(reason) {
  switch (reason) {
    case "EMPTY":
      return "URL is required";
    case "MALFORMED":
      return "URL is not well-formed";
    case "FORBIDDEN_PROTOCOL":
      return "URL uses an unsupported protocol";
    case "HTTPS_REQUIRED":
      return "URL must use HTTPS";
    case "HTTP_NOT_ALLOWED":
      return "URL must use HTTPS in production";
    case "CREDENTIALS_NOT_ALLOWED":
      return "URL must not contain credentials";
    case "LOOPBACK_NOT_ALLOWED":
      return "Localhost URLs are not allowed outside development";
    case "DEVELOPMENT_PORT_NOT_CONFIGURED":
      return "Localhost URLs require a configured development frontend port";
    case "DEVELOPMENT_PORT_MISMATCH":
      return "Localhost URL must use the configured development frontend port";
    case "TOO_LONG":
      return "URL is too long";
    default:
      return "URL is not valid";
  }
}

/* =========================================================
 * REDIRECT LOOKUP (used by checkout flow)
 * ======================================================= */

/**
 * Return the merchant's configured redirect URLs.
 * Used by the checkout flow when a payment reaches a terminal state.
 *
 * Returns an empty object when no setting row exists.
 */
export async function getRedirectUrlsForMerchant({ merchantId }) {
  const setting = await MerchantSetting.findOne({
    where: { merchantId },
    attributes: REDIRECT_URL_FIELDS,
  });
  if (!setting) return {};
  return {
    success: setting.successRedirectUrl || null,
    failure: setting.failureRedirectUrl || null,
    cancel: setting.cancelRedirectUrl || null,
  };
}
