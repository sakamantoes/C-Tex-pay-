import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { MerchantSetting, Payment } from "../models/index.js";
import envConfig from "../config/constant.js";
import { loadCheckoutByToken } from "../service/checkout.service.js";
import { generateCheckoutToken } from "../utils/checkoutToken.js";

const originalPaymentFindOne = Payment.findOne;
const originalSettingFindOne = MerchantSetting.findOne;
const originalNodeEnv = envConfig.NODE_ENV;
const originalFrontendUrl = envConfig.FRONTEND_URL;

let paymentRecord;
let redirectSettings;

beforeEach(() => {
  envConfig.NODE_ENV = "development";
  envConfig.FRONTEND_URL = "http://localhost:5173/";
  redirectSettings = {
    successRedirectUrl: "http://localhost:5173/success",
    failureRedirectUrl: "http://localhost:5173/failure",
    cancelRedirectUrl: "http://localhost:5173/cancel",
  };
  paymentRecord = {
    paymentReference: "CTX_test_checkout_return",
    merchantId: "merchant-test-id",
    status: "PENDING",
    amount: 10000,
    currency: "NGN",
    paymentMethod: "ACCOUNT_TRANSFER",
    description: "Test checkout",
    merchantReference: null,
    paymentInstructions: null,
    expiresAt: null,
    createdAt: null,
    updatedAt: null,
    metadata: { returnUrl: redirectSettings.successRedirectUrl },
  };

  Payment.findOne = async () => paymentRecord;
  MerchantSetting.findOne = async () => redirectSettings;
});

afterEach(() => {
  Payment.findOne = originalPaymentFindOne;
  MerchantSetting.findOne = originalSettingFindOne;
  envConfig.NODE_ENV = originalNodeEnv;
  envConfig.FRONTEND_URL = originalFrontendUrl;
});

test("does not expose a return URL while payment is still pending", async () => {
  const result = await loadCheckoutByToken({
    token: generateCheckoutToken(paymentRecord.paymentReference),
  });

  assert.equal(result.status, "PENDING");
  assert.equal("redirectUrl" in result, false);
});

test("adds an allowlisted development return URL only after terminal status", async () => {
  paymentRecord.status = "SUCCESS";
  const result = await loadCheckoutByToken({
    token: generateCheckoutToken(paymentRecord.paymentReference),
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal(
    result.redirectUrl,
    "http://localhost:5173/success?paymentReference=CTX_test_checkout_return&status=success",
  );
});

test("reads returnUrl from legacy JSON-string metadata", async () => {
  paymentRecord.status = "SUCCESS";
  paymentRecord.metadata = JSON.stringify({
    returnUrl: redirectSettings.successRedirectUrl,
  });

  const result = await loadCheckoutByToken({
    token: generateCheckoutToken(paymentRecord.paymentReference),
  });

  assert.equal(
    result.redirectUrl,
    "http://localhost:5173/success?paymentReference=CTX_test_checkout_return&status=success",
  );
});

test("does not redirect production customers to stored localhost URLs", async () => {
  envConfig.NODE_ENV = "production";
  paymentRecord.status = "SUCCESS";

  const result = await loadCheckoutByToken({
    token: generateCheckoutToken(paymentRecord.paymentReference),
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal("redirectUrl" in result, false);
});

test("does not use a per-payment URL removed from the merchant allowlist", async () => {
  paymentRecord.status = "SUCCESS";
  redirectSettings.successRedirectUrl = "http://localhost:5173/other";

  const result = await loadCheckoutByToken({
    token: generateCheckoutToken(paymentRecord.paymentReference),
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal("redirectUrl" in result, false);
});
