import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateMerchantUrl,
  isAllowedReturnUrl,
} from "../utils/urlValidator.js";

const development = { nodeEnv: "development", developmentPort: "5173" };
const production = { nodeEnv: "production", developmentPort: "5173" };

test("accepts configured HTTPS production merchant URLs", () => {
  const result = validateMerchantUrl(
    "https://www.ctex.online/success",
    production,
  );
  assert.deepEqual(result, {
    valid: true,
    url: "https://www.ctex.online/success",
  });
});

test("accepts configured localhost URLs only on the development frontend port", () => {
  assert.equal(
    validateMerchantUrl("http://localhost:5173/success", development).valid,
    true,
  );
  assert.equal(
    validateMerchantUrl("https://localhost:5173/success", development).valid,
    true,
  );
  assert.equal(
    validateMerchantUrl("http://127.0.0.1:5173/success", development).valid,
    true,
  );
  assert.equal(
    validateMerchantUrl("http://[::1]:5173/success", development).valid,
    true,
  );
});

test("rejects unconfigured localhost ports and localhost without a configured port", () => {
  assert.deepEqual(
    validateMerchantUrl("http://localhost:5174/success", development),
    { valid: false, reason: "DEVELOPMENT_PORT_MISMATCH" },
  );
  assert.deepEqual(
    validateMerchantUrl("http://localhost:5173/success", {
      nodeEnv: "development",
      developmentPort: null,
    }),
    { valid: false, reason: "DEVELOPMENT_PORT_NOT_CONFIGURED" },
  );
});

test("rejects localhost in every production scheme", () => {
  for (const url of [
    "http://localhost:5173/success",
    "https://localhost:5173/success",
    "https://127.0.0.1:5173/success",
    "https://[::1]:5173/success",
  ]) {
    assert.deepEqual(validateMerchantUrl(url, production), {
      valid: false,
      reason: "LOOPBACK_NOT_ALLOWED",
    });
  }
});

test("requires HTTPS for public merchant URLs outside development", () => {
  assert.deepEqual(
    validateMerchantUrl("http://merchant.example/success", production),
    { valid: false, reason: "HTTPS_REQUIRED" },
  );
  assert.deepEqual(
    validateMerchantUrl("http://merchant.example/success", development),
    { valid: false, reason: "HTTP_NOT_ALLOWED" },
  );
});

test("rejects malformed URLs and unsupported protocols", () => {
  assert.deepEqual(validateMerchantUrl("not-a-url", development), {
    valid: false,
    reason: "MALFORMED",
  });
  assert.deepEqual(validateMerchantUrl("javascript:alert(1)", development), {
    valid: false,
    reason: "FORBIDDEN_PROTOCOL",
  });
  assert.deepEqual(validateMerchantUrl("data:text/html,hello", development), {
    valid: false,
    reason: "FORBIDDEN_PROTOCOL",
  });
});

test("treats only exact loopback hostnames as local exceptions", () => {
  assert.deepEqual(
    validateMerchantUrl("https://user:pass@merchant.example/hook", development),
    { valid: false, reason: "CREDENTIALS_NOT_ALLOWED" },
  );
  assert.deepEqual(
    validateMerchantUrl("http://localhost.evil.example:5173/success", development),
    { valid: false, reason: "HTTP_NOT_ALLOWED" },
  );
  assert.deepEqual(
    validateMerchantUrl("https://localhost.evil.example:5173/success", development),
    { valid: true, url: "https://localhost.evil.example:5173/success" },
  );
});

test("requires an exact configured merchant URL match", () => {
  const allowed = ["http://localhost:5173/success"];
  assert.equal(
    isAllowedReturnUrl("http://localhost:5173/success", allowed),
    true,
  );
  assert.equal(
    isAllowedReturnUrl("http://localhost:5174/success", allowed),
    false,
  );
  assert.equal(isAllowedReturnUrl("http://localhost:5173/other", []), false);
  assert.equal(isAllowedReturnUrl("not-a-url", allowed), false);
});
