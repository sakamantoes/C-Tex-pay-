import envConfig from "../../config/constant.js";
import { getAccessToken, clearAccessToken } from "./monnify.auth.js";

/**
 * Monnify HTTP Client
 * 
 * Responsibilities:
 *   - Base URL + timeout
 *   - Authorization header injection
 *   - Response handling
 *   - Error normalization
 *   - Retry on 401 (token refresh)
 * 
 * Does NOT contain payment business logic.
 */

export async function monnifyRequest(path, options = {}) {
  const {
    method = "GET",
    body = null,
    headers = {},
    retryOnUnauthorized = true,
  } = options;

  const token = await getAccessToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    envConfig.MONNIFY_TIMEOUT_MS
  );

  let response;
  try {
    response = await fetch(`${envConfig.MONNIFY_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      const e = new Error("Monnify request timed out");
      e.code = "PROVIDER_TIMEOUT";
      throw e;
    }

    const e = new Error("Monnify network error");
    e.code = "PROVIDER_NETWORK_ERROR";
    throw e;
  }

  clearTimeout(timeoutId);

  // Handle 401 — token may have expired or been revoked
  if (response.status === 401 && retryOnUnauthorized) {
    clearAccessToken();
    return monnifyRequest(path, { ...options, retryOnUnauthorized: false });
  }

  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const err = new Error(
      responseBody?.responseMessage || "Monnify request failed"
    );
    err.code = "PROVIDER_REJECTED";
    err.httpStatus = response.status;
    err.providerResponse = responseBody;
    throw err;
  }

  return responseBody;
}