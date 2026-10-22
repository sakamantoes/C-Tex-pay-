import envConfig from "../../config/constant.js";

/**
 * Xixapay HTTP Client
 *
 * Responsibilities:
 *   - Base URL and timeout
 *   - Authentication headers (api-key + Bearer)
 *   - Response parsing
 *   - Error normalization
 *   - Structured diagnostic logging (no secrets leaked)
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
 * Log a rejection without leaking secrets.
 *
 * We log:
 *   - the request path and method
 *   - HTTP status
 *   - the response body's `status` and `message` fields
 *   - the response body's top-level keys (but not the full body, which
 *     can contain user data on some endpoints)
 *
 * We never log:
 *   - the api-key header
 *   - the Authorization header
 *   - the full response body verbatim
 */
function logRejection(kind, path, method, httpStatus, body) {
  const safeBody =
    body && typeof body === "object"
      ? {
          status: body.status ?? undefined,
          message: body.message ?? undefined,
          error: body.error ?? undefined,
          keys: Object.keys(body),
        }
      : body;

  console.error(`Xixapay ${kind}`, {
    path,
    method,
    httpStatus,
    body: safeBody,
  });
}

/**
 * Low-level request helper for Xixapay.
 *
 * @param {string} path           - e.g. "/api/get/banks"
 * @param {object} [options]
 * @param {string} [options.method="GET"]
 * @param {object} [options.body] - JSON-serialized if provided
 * @returns {Promise<object>} Parsed JSON response
 */
export async function xixapayRequest(path, options = {}) {
  assertConfigured();

  const { method = "GET", body = null, headers = {} } = options;

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
      console.error("Xixapay timeout", { path, method });
      throw err;
    }
    const err = new Error("Xixapay network error");
    err.code = "PROVIDER_NETWORK_ERROR";
    console.error("Xixapay network error", {
      path,
      method,
      errorName: error.name,
      errorMessage: error.message,
    });
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
   * Non-2xx responses.
   */
  if (!response.ok) {
    const err = new Error(
      responseBody?.message || `Xixapay HTTP ${response.status}`
    );
    err.code = "PROVIDER_REJECTED";
    err.httpStatus = response.status;
    err.providerResponse = responseBody;
    logRejection("non-2xx rejection", path, method, response.status, responseBody);
    throw err;
  }

  /*
   * HTTP 200 with body-level failure. Some Xixapay endpoints return
   * `{ status: "failed", message: "..." }` with a 200 status code.
   */
  if (
    responseBody &&
    typeof responseBody === "object" &&
    responseBody.status &&
    ["failed", "error"].includes(String(responseBody.status).toLowerCase())
  ) {
    const err = new Error(
      responseBody.message || "Xixapay rejected the request"
    );
    err.code = "PROVIDER_REJECTED";
    err.httpStatus = response.status;
    err.providerResponse = responseBody;
    logRejection(
      "body-level rejection",
      path,
      method,
      response.status,
      responseBody
    );
    throw err;
  }

  return responseBody;
}