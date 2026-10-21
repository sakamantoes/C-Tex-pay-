import test from "node:test";
import assert from "node:assert/strict";
import envConfig from "../../config/constant.js";
import XixapayPayoutAdapter from "../../Provider/xixapay/xixapay.payout.adapter.js";
import { getPayoutProvider } from "../../Provider/provider.factory.js";

async function withFetch(handler, run) {
  const previousFetch = globalThis.fetch;
  const previous = {
    apiKey: envConfig.XIXAPAY_API_KEY,
    apiSecret: envConfig.XIXAPAY_API_SECRET,
    businessId: envConfig.XIXAPAY_BUSINESS_ID,
  };
  envConfig.XIXAPAY_API_KEY = "test-api-key";
  envConfig.XIXAPAY_API_SECRET = "test-api-secret";
  envConfig.XIXAPAY_BUSINESS_ID = "test-business-id";
  globalThis.fetch = handler;
  try { await run(); }
  finally {
    globalThis.fetch = previousFetch;
    envConfig.XIXAPAY_API_KEY = previous.apiKey;
    envConfig.XIXAPAY_API_SECRET = previous.apiSecret;
    envConfig.XIXAPAY_BUSINESS_ID = previous.businessId;
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("Xixapay payout provider is selectable independently", () => {
  assert.ok(getPayoutProvider("XIXAPAY") instanceof XixapayPayoutAdapter);
});

test("Xixapay payout adapter maps provider bank directory", async () => {
  await withFetch(async (url, options) => {
    assert.equal(String(url), "https://api.xixapay.com/api/get/banks");
    assert.equal(options.method, "GET");
    return jsonResponse({ status: "success", data: [{ bankName: "GTBank", bankCode: "058" }] });
  }, async () => {
    assert.deepEqual(await new XixapayPayoutAdapter().getBanks(), [{ name: "GTBank", code: "058" }]);
  });
});

test("Xixapay account verification maps documented account and bank name fields", async () => {
  await withFetch(async (url, options) => {
    assert.equal(String(url), "https://api.xixapay.com/api/verify/bank");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { bank: "058", accountNumber: "0123456789" });
    return jsonResponse({ status: "success", AccountName: "JOHN DOE", BankName: "GTBank" });
  }, async () => {
    const result = await new XixapayPayoutAdapter().validateBankAccount({ bankCode: "058", accountNumber: "0123456789" });
    assert.equal(result.accountName, "JOHN DOE");
    assert.equal(result.bankName, "GTBank");
  });
});

test("Xixapay payout sends NGN amount and only documented transfer fields", async () => {
  await withFetch(async (url, options) => {
    assert.equal(String(url), "https://api.xixapay.com/api/v1/transfer");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["api-key"], "test-api-key");
    assert.equal(options.headers.Authorization, "Bearer test-api-secret");
    assert.deepEqual(JSON.parse(options.body), {
      businessId: "test-business-id",
      amount: 25000,
      bank: "058",
      accountNumber: "0123456789",
      narration: "Wallet withdrawal",
    });
    return jsonResponse({ status: "success", message: "Transfer queued successfully", reference: "XIXA_123" });
  }, async () => {
    const result = await new XixapayPayoutAdapter().initiatePayout({
      amountKobo: 2_500_000,
      reference: "local-payout-id",
      bankCode: "058",
      accountNumber: "0123456789",
    });
    assert.equal(result.providerReference, "XIXA_123");
    assert.equal(result.providerStatus, "SUCCESS");
  });
});

test("documented Xixapay failed response is definitive while status lookup stays unsupported", async () => {
  await withFetch(async () => jsonResponse({ status: "failed", message: "Insufficient wallet balance" }), async () => {
    const adapter = new XixapayPayoutAdapter();
    const result = await adapter.initiatePayout({
      amountKobo: 2_500_000,
      reference: "local-payout-id",
      bankCode: "058",
      accountNumber: "0123456789",
    });
    assert.equal(result.providerStatus, "FAILED");
    assert.equal(typeof adapter.getPayoutStatus, "undefined");
  });
});
