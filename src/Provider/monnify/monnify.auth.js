import env from "../../config/constant.js";

/**
 * Monnify Authentication & Token Management
 * 
 * Monnify uses OAuth 2.0:
 *   1. POST /api/v1/auth/login with Basic auth (apiKey:secretKey base64)
 *   2. Response contains accessToken with expiresIn
 *   3. Subsequent requests use Bearer token
 * 
 * Token is cached in-memory and reused until near-expiry.
 * Concurrent refresh races are prevented with a shared promise.
 */

let cachedToken = null;
let tokenExpiresAt = 0;
let refreshPromise = null;

const TOKEN_SAFETY_MARGIN_MS = 60 * 1000; // Refresh 60s before expiry

/**
 * Returns a valid Bearer token, refreshing if necessary.
 */
export async function getAccessToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt - TOKEN_SAFETY_MARGIN_MS) {
    return cachedToken;
  }

  // Prevent concurrent refresh storms
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const basicAuth = Buffer.from(
        `${env.MONNIFY_API_KEY}:${env.MONNIFY_SECRET_KEY}`
      ).toString("base64");

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        env.MONNIFY_TIMEOUT_MS
      );

      const response = await fetch(
        `${env.MONNIFY_BASE_URL}/api/v1/auth/login`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = new Error("Monnify authentication failed");
        err.code = "PROVIDER_AUTH_FAILED";
        err.httpStatus = response.status;
        throw err;
      }

      const body = await response.json();

      if (!body?.responseBody?.accessToken) {
        const err = new Error("Malformed Monnify auth response");
        err.code = "PROVIDER_RESPONSE_MALFORMED";
        throw err;
      }

      cachedToken = body.responseBody.accessToken;
      const expiresInMs =
        (body.responseBody.expiresIn || 3600) * 1000;
      tokenExpiresAt = now + expiresInMs;

      return cachedToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Clears cached token — call this on 401 to force a refresh.
 */
export function clearAccessToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}