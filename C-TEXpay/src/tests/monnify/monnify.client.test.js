import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import envConfig from "../../config/constant.js";
import { clearAccessToken } from "../../Provider/monnify/monnify.auth.js";
import { monnifyRequest } from "../../Provider/monnify/monnify.client.js";
import { toMonnifyInitializeRequest } from "../../Provider/monnify/monnify.mapper.js";

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;

beforeEach(() => {
  clearAccessToken();
  envConfig.MONNIFY_BASE_URL = "https://sandbox.monnify.com";
  envConfig.MONNIFY_TIMEOUT_MS = 1000;
  envConfig.MONNIFY_CONTRACT_CODE = "TEST-CONTRACT";
  console.error = () => {};
  console.info = () => {};
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
  console.info = originalConsoleInfo;
  clearAccessToken();
});

function mockFetchForResponse(responseFactory) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (String(url).endsWith("/api/v1/auth/login")) {
      return new Response(
        JSON.stringify({
          responseBody: { accessToken: "test-access-token", expiresIn: 3600 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return responseFactory();
  };
  return calls;
}

test("preserves diagnostic details for an HTML Cloudflare 403", async () => {
  const logs = [];
  console.info = (...args) => logs.push(args);
  console.error = (...args) => logs.push(args);
  const calls = mockFetchForResponse(
    () =>
      new Response(
        "<html><body>blocked test@example.com ray</body></html>",
        {
          status: 403,
          headers: {
            "content-type": "text/html; charset=UTF-8",
            "cf-ray": "abc123-LHR",
          },
        },
      ),
  );

  await assert.rejects(monnifyRequest("/api/v1/merchant/transactions/init-transaction", {
    method: "POST",
    body: { amount: 20 },
  }), (error) => {
    assert.equal(error.httpStatus, 403);
    assert.equal(error.providerResponse, "<html><body>blocked test@example.com ray</body></html>");
    return true;
  });
  assert.equal(calls[1].options.headers.Authorization, "Bearer test-access-token");
  const diagnosticText = JSON.stringify(logs);
  assert.match(diagnosticText, /abc123-LHR/);
  assert.match(diagnosticText, /text\/html/);
  assert.match(diagnosticText, /\[REDACTED_EMAIL\]/);
  assert.doesNotMatch(diagnosticText, /test@example\.com|test-access-token/);
});

test("preserves JSON error bodies for non-2xx responses", async () => {
  mockFetchForResponse(
    () =>
      new Response(JSON.stringify({ responseMessage: "Invalid contract" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
  );

  await assert.rejects(monnifyRequest("/api/v1/merchant/transactions/init-transaction", {
    method: "POST",
    body: { amount: 20 },
  }), (error) => {
    assert.equal(error.message, "Invalid contract");
    assert.deepEqual(error.providerResponse, { responseMessage: "Invalid contract" });
    return true;
  });
});

test("preserves an empty response body and status for non-2xx responses", async () => {
  mockFetchForResponse(() => new Response(null, { status: 403 }));

  await assert.rejects(monnifyRequest("/api/v1/merchant/transactions/init-transaction", {
    method: "POST",
    body: { amount: 20 },
  }), (error) => {
    assert.equal(error.httpStatus, 403);
    assert.equal(error.providerResponse, null);
    return true;
  });
});

test("keeps the C-TEX returnUrl out of Monnify redirect and metadata fields", () => {
  const request = toMonnifyInitializeRequest({
    paymentReference: "test-reference",
    amount: 20,
    currency: "NGN",
    customer: { name: "Test Customer", email: "test@example.com" },
    metadata: { orderId: "order-1", returnUrl: "https://merchant.test/done" },
  });

  assert.deepEqual(request.metadata, { orderId: "order-1" });
  assert.equal("redirectUrl" in request, false);
  assert.equal("metaData" in request, false);
});

test("preserves an explicit Monnify redirectUrl independently", () => {
  const request = toMonnifyInitializeRequest({
    paymentReference: "test-reference",
    amount: 20,
    currency: "NGN",
    customer: { name: "Test Customer", email: "test@example.com" },
    redirectUrl: "https://provider-callback.test/monnify",
    metadata: { returnUrl: "https://merchant.test/done" },
  });

  assert.equal(request.redirectUrl, "https://provider-callback.test/monnify");
  assert.equal("returnUrl" in (request.metadata || {}), false);
});

test("omits optional redirectUrl and metadata when no returnUrl is supplied", () => {
  const request = toMonnifyInitializeRequest({
    paymentReference: "test-reference",
    amount: 20,
    currency: "NGN",
    customer: { name: "Test Customer", email: "test@example.com" },
    metadata: null,
  });

  assert.equal("redirectUrl" in request, false);
  assert.equal("metadata" in request, false);
});
