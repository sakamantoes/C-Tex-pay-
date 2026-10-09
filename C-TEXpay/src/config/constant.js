import dotenv from "dotenv";
dotenv.config();

const envConfig = {
  //database config
  PORT: process.env.PORT || 5000,
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: process.env.DB_PORT,


//auth config
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,

  //for redirict
  FRONTEND_URL: process.env.FRONTEND_URL,

  //socket config
  SOCKET_CORS_ORIGINS: process.env.SOCKET_CORS_ORIGINS,
  API_KEY_ENCRYPTION_KEY:
    process.env.API_KEY_ENCRYPTION_KEY ||
    process.env.JWT_ACCESS_SECRET ||
    "change-me-in-production-please-use-a-strong-secret",

  // mailing for development
  NODE_ENV: process.env.NODE_ENV || "development",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  MAIL_FROM: process.env.MAIL_FROM,

  // mailing for production
  RESEND_API_KEY: process.env.RESEND_API_KEY,

  //payment init config
  PAYMENT_PENDING_TTL_MINUTES: process.env.PAYMENT_PENDING_TTL_MINUTES,
  PAYMENT_REFERENCE_PREFIX: process.env.PAYMENT_REFERENCE_PREFIX,

  //monnify init config
  MONNIFY_BASE_URL:process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com",
  MONNIFY_API_KEY: process.env.MONNIFY_API_KEY,
  MONNIFY_SECRET_KEY: process.env.MONNIFY_SECRET_KEY,
  MONNIFY_CONTRACT_CODE: process.env.MONNIFY_CONTRACT_CODE,
  MONNIFY_TIMEOUT_MS: parseInt(process.env.MONNIFY_TIMEOUT_MS || "30000", 10),

  //provider selector config
   PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "MONNIFY",
   MONNIFY_TRANSFER_BANK_CODE: process.env.MONNIFY_TRANSFER_BANK_CODE || null,

   //Monnfy webhook
    MONNIFY_SKIP_SIGNATURE_VERIFICATION:
    process.env.MONNIFY_SKIP_SIGNATURE_VERIFICATION === "true",
  MONNIFY_WEBHOOK_MAX_BYTES:
    parseInt(process.env.MONNIFY_WEBHOOK_MAX_BYTES || "262144", 10),

  // Merchant webhook configuration
  MERCHANT_WEBHOOK_SECRET_KEY:
    process.env.MERCHANT_WEBHOOK_SECRET_KEY ||
    process.env.API_KEY_ENCRYPTION_KEY ||
    process.env.JWT_ACCESS_SECRET ||
    "change-me-in-production-please-use-a-strong-secret",
  MERCHANT_WEBHOOK_TIMEOUT_MS:
    parseInt(process.env.MERCHANT_WEBHOOK_TIMEOUT_MS || "10000", 10),
  MERCHANT_WEBHOOK_MAX_RETRIES:
    parseInt(process.env.MERCHANT_WEBHOOK_MAX_RETRIES || "5", 10),
  MERCHANT_WEBHOOK_RETRY_BASE_MS:
    parseInt(process.env.MERCHANT_WEBHOOK_RETRY_BASE_MS || "5000", 10),
  MERCHANT_WEBHOOK_ALLOW_LOCAL:
    process.env.MERCHANT_WEBHOOK_ALLOW_LOCAL === "true",

    // Stage 14 — Payouts
PAYOUT_MIN_AMOUNT: parseInt(process.env.PAYOUT_MIN_AMOUNT || "10000", 10),     // ₦100 default
PAYOUT_MAX_AMOUNT: parseInt(process.env.PAYOUT_MAX_AMOUNT || "500000000", 10), // ₦5M default
MONNIFY_PAYOUT_SOURCE_ACCOUNT: process.env.MONNIFY_PAYOUT_SOURCE_ACCOUNT,
MONNIFY_PAYOUT_ASYNC: process.env.MONNIFY_PAYOUT_ASYNC === "true",

// Stage X2 — Xixapay Provider
XIXAPAY_BASE_URL: process.env.XIXAPAY_BASE_URL || "https://api.xixapay.com",
XIXAPAY_API_KEY: process.env.XIXAPAY_API_KEY || null,
XIXAPAY_API_SECRET: process.env.XIXAPAY_API_SECRET || null,
XIXAPAY_BUSINESS_ID: process.env.XIXAPAY_BUSINESS_ID || null,
XIXAPAY_DEFAULT_BANK_CODE: process.env.XIXAPAY_DEFAULT_BANK_CODE || "20867",
XIXAPAY_CALLBACK_URL: process.env.XIXAPAY_CALLBACK_URL || null,
XIXAPAY_ACCOUNT_EXPIRY_MINUTES: parseInt(
  process.env.XIXAPAY_ACCOUNT_EXPIRY_MINUTES || "30",
  10
),
XIXAPAY_TIMEOUT_MS: parseInt(process.env.XIXAPAY_TIMEOUT_MS || "30000", 10),

// Webhook
XIXAPAY_WEBHOOK_SECRET: process.env.XIXAPAY_WEBHOOK_SECRET || null,
};

export default envConfig;
