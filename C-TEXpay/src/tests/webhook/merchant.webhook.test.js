import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import {
  generateWebhookSecret,
  encryptWebhookSecret,
  createWebhookSignature,
  validateWebhookUrl,
  buildMerchantWebhookPayload,
  getMerchantWebhookEvent,
  listMerchantWebhookEvents,
} from "../../service/merchantWebhook.service.js";
import { revealMerchantWebhookSecretController } from "../../controller/merchantWebhook.controller.js";
import { MerchantWebhookConfig, MerchantWebhookEvent } from "../../models/index.js";

test("generateWebhookSecret creates a secure random secret", () => {
  const secret = generateWebhookSecret();
  assert.equal(typeof secret, "string");
  assert.ok(secret.length >= 32);
  assert.ok(!/\s/.test(secret));
});

test("createWebhookSignature uses HMAC-SHA256 and matches payload", () => {
  const secret = "test-secret-1234567890";
  const payload = { id: "evt_123", type: "payment.success", data: { paymentReference: "CTX_123" } };
  const body = JSON.stringify(payload);
  const signature = createWebhookSignature({ payload, secret });
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

  assert.equal(signature, `sha256=${expected}`);
});

test("validateWebhookUrl rejects dangerous internal destinations", () => {
  assert.throws(() => validateWebhookUrl("http://localhost:3000/api/hook"), /localhost|internal/i);
  assert.throws(() => validateWebhookUrl("http://127.0.0.1:8080/hook"), /private|internal/i);
  assert.throws(() => validateWebhookUrl("file:///tmp/test"), /https/i);
});

test("validateWebhookUrl accepts a secure public HTTPS URL", () => {
  const url = "https://merchant.example.com/webhooks/ctex";
  assert.equal(validateWebhookUrl(url), url);
});

test("buildMerchantWebhookPayload produces a stable merchant event contract", () => {
  const payload = buildMerchantWebhookPayload({
    eventId: "evt_123",
    payment: {
      paymentReference: "CTX_20261002_ABC123",
      merchantReference: "ORDER-99",
      amount: 200000,
      currency: "NGN",
      status: "SUCCESS",
      paymentMethod: "ACCOUNT_TRANSFER",
    },
  });

  assert.equal(payload.id, "evt_123");
  assert.equal(payload.type, "payment.success");
  assert.equal(payload.data.paymentReference, "CTX_20261002_ABC123");
  assert.equal(payload.data.currency, "NGN");
  assert.equal(payload.data.status, "SUCCESS");
  assert.ok(payload.createdAt);
});

test("event list is bounded and both event responses exclude secret fields", async () => {
  const originalFindOne = MerchantWebhookEvent.findOne;
  const originalFindAndCountAll = MerchantWebhookEvent.findAndCountAll;

  const calls = [];
  MerchantWebhookEvent.findOne = async (options) => {
    calls.push({ type: "findOne", options });
    return null;
  };
  MerchantWebhookEvent.findAndCountAll = async (options) => {
    calls.push({ type: "findAndCountAll", options });
    return { count: 0, rows: [] };
  };

  try {
    await getMerchantWebhookEvent({ merchantId: "merchant-123", eventId: "evt_ABC123" });
    await listMerchantWebhookEvents({ merchantId: "merchant-123" });

    for (const call of calls) {
      const configInclude = call.options.include?.find((item) => item.as === "config");
      assert.ok(configInclude, `Expected config include for ${call.type}`);
      if (call.type === "findOne") {
        assert.deepEqual(configInclude.attributes.exclude, ["secretEncrypted", "secretHash"]);
      } else {
        assert.deepEqual(configInclude.attributes, ["id", "url", "enabled", "description"]);
        assert.deepEqual(call.options.where, { merchantId: "merchant-123" });
        assert.equal(call.options.limit, 20);
        assert.equal(call.options.offset, 0);
        assert.deepEqual(call.options.attributes.includes("payload"), false);
      }
    }
  } finally {
    MerchantWebhookEvent.findOne = originalFindOne;
    MerchantWebhookEvent.findAndCountAll = originalFindAndCountAll;
  }
});

test("webhook secret reveal requires the account password and remains merchant-scoped", async () => {
  const originalFindOne = MerchantWebhookConfig.findOne;
  const secret = "webhook-signing-secret-for-test";
  const hash = await bcrypt.hash("valid-password", 4);
  let lookup;
  MerchantWebhookConfig.findOne = async (options) => {
    lookup = options;
    return { id: "config-1", secretEncrypted: encryptWebhookSecret(secret) };
  };

  const invoke = async (password) => {
    const response = {
      statusCode: 200,
      body: null,
      status(statusCode) { this.statusCode = statusCode; return this; },
      json(body) { this.body = body; return this; },
    };
    await revealMerchantWebhookSecretController({
      body: { password },
      user: { password: hash },
      merchant: { id: "merchant-1" },
      params: { id: "config-1" },
      requestId: "request-1",
    }, response);
    return response;
  };

  try {
    const invalid = await invoke("wrong-password");
    assert.equal(invalid.statusCode, 401);

    const valid = await invoke("valid-password");
    assert.equal(valid.statusCode, 200);
    assert.equal(valid.body.data.secret, secret);
    assert.deepEqual(lookup.where, { merchantId: "merchant-1", id: "config-1" });
    assert.deepEqual(lookup.attributes, ["id", "secretEncrypted"]);
  } finally {
    MerchantWebhookConfig.findOne = originalFindOne;
  }
});
