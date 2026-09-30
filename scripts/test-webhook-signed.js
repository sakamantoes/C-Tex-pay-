// scripts/test-webhook-signed.js
import crypto from "crypto";
import envConfig from "../src/config/constant.js";

// Default to localhost — skips localtunnel entirely
const WEBHOOK_URL =
  process.argv[2] || "http://localhost:3000/api/v1/webhooks/monnify";

// -----------------------------------------------
// Change these to test different scenarios
// -----------------------------------------------
const SCENARIO = process.argv[3] || "unsupported";

const scenarios = {
  // 1) Unsupported event → 200 Acknowledged (no payment touched)
  unsupported: {
    eventType: "TEST_EVENT",
    eventData: {
      paymentReference: "CTEX-WEBHOOK-TEST",
      transactionReference: "MNFY|TEST|" + Date.now(),
    },
  },

  // 2) Real successful transaction — replace paymentReference with a real one
  success: {
    eventType: "SUCCESSFUL_TRANSACTION",
    eventData: {
      paymentReference: process.env.TEST_PAYMENT_REF || "PASTE_REAL_PAYMENT_REF_HERE",
      transactionReference: "MNFY|14|REPLACE_WITH_REAL|000000",
      paymentStatus: "PAID",
      amountPaid: "2000.00",
      currency: "NGN",
      paymentMethod: "ACCOUNT_TRANSFER",
    },
  },
};

const payload = scenarios[SCENARIO] || scenarios.unsupported;

const rawBody = JSON.stringify(payload);
const signature = crypto
  .createHmac("sha512", envConfig.MONNIFY_SECRET_KEY)
  .update(rawBody)
  .digest("hex");

console.log("--- Monnify Webhook Test ---");
console.log("URL:", WEBHOOK_URL);
console.log("Scenario:", SCENARIO);
console.log("Signature:", signature);
console.log("");

const res = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "monnify-signature": signature,
  },
  body: rawBody,
});

console.log("Status:", res.status);
console.log("Body:", await res.text());