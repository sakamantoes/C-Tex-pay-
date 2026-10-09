import envConfig from "../../config/constant.js";

/**
 * Xixapay HTTP Client
 *
 * Responsibilities:
 *   - Base URL and timeout
 *   - Authentication headers (api-key + Bearer)
 *   - Response parsing
 *   - Error normalization
 *
 * Does NOT contain business logic. The provider adapter uses this.
 *
 * Verified from official Xixapay documentation:
 *   - Base URL: https://api.xixapay.com
 *   - Headers: `api-key: <KEY>`, `Authorization: Bearer <SECRET>`
 *   - Content-Type: application/json
 */

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Check that Xixapay credentials exist before trying to call the API.
 * Throws a clear, non-secret-leaking error.
 */
function assertConfigured() {
  if (!envConfig.XIXAPAY_API_KEY || !envConfig.XIXAPAY_API_SECRET) {
    const err = new Error(
      "Xixapay is not configured. Set XIXAPAY_API_KEY and XIXAPAY_API_SECRET."
    );
    err.code = "PROVIDER_NOT_CONFIGURED";
    throw err;
  }
}

/**
 * Low-level request helper for Xixapay.
 *
 * @param {string} path           - e.g. "/api/v1/createVirtualAccount"
 * @param {object} [options]
 * @param {string} [options.method="GET"]
 * @param {object} [options.body] - JSON-serialized if provided
 * @returns {Promise<object>} Parsed JSON response
 */
export async function xixapayRequest(path, options = {}) {
  assertConfigured();

  const {
    method = "GET",
    body = null,
    headers = {},
  } = options;

  const baseUrl = (
    envConfig.XIXAPAY_BASE_URL || "https://api.xixapay.com"
  ).replace(/\/$/, "");

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    envConfig.XIXAPAY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS
  );

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "api-key": envConfig.XIXAPAY_API_KEY,
        Authorization: `Bearer ${envConfig.XIXAPAY_API_SECRET}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      const err = new Error("Xixapay request timed out");
      err.code = "PROVIDER_TIMEOUT";
      throw err;
    }
    const err = new Error("Xixapay network error");
    err.code = "PROVIDER_NETWORK_ERROR";
    throw err;
  }

  clearTimeout(timeoutId);

  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  /*
   * Xixapay returns HTTP 200 with a JSON `status` field on success
   * (see "Successful Response" examples in the docs). Non-2xx responses
   * carry a structured error per the Error Codes table.
   */
  if (!response.ok) {
    const err = new Error(
      responseBody?.message || `Xixapay HTTP ${response.status}`
    );
    err.code = "PROVIDER_REJECTED";
    err.httpStatus = response.status;
    err.providerResponse = responseBody;
    throw err;
  }

  /*
   * Some Xixapay responses use HTTP 200 with status: "failed" in the body.
   * Normalize those to PROVIDER_REJECTED so callers handle them uniformly.
   */
  if (
    responseBody &&
    typeof responseBody === "object" &&
    responseBody.status &&
    ["failed", "error"].includes(String(responseBody.status).toLowerCase())
  ) {
    const err = new Error(responseBody.message || "Xixapay rejected the request");
    err.code = "PROVIDER_REJECTED";
    err.httpStatus = response.status;
    err.providerResponse = responseBody;
    throw err;
  }

  return responseBody;
}