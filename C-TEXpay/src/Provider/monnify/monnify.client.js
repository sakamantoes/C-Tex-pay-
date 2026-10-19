import envConfig from "../../config/constant.js";
import { getAccessToken, clearAccessToken } from "./monnify.auth.js";

/**
 * Monnify HTTP Client
 *
 * Responsibilities:
 *   - Base URL + timeout
 *   - Authorization header injection
 *   - User-Agent header (required by Monnify/Cloudflare — Node's default
 *     fetch UA is flagged as a bot and returns bare 403 responses)
 *   - Response handling
 *   - Error normalization
 *   - Retry on 401 (token refresh)
 *
 * Does NOT contain payment business logic.
 */

const USER_AGENT = "C-TEXPAY/1.0 (+https://ctexpay.com)";
const MAX_DIAGNOSTIC_BODY_LENGTH = 1200;

function redactDiagnosticText(value) {
  let text = String(value);
  try {
    const parsed = JSON.parse(text);
    const redactFields = (item) => {
      if (Array.isArray(item)) return item.map(redactFields);
      if (!item || typeof item !== "object") return item;
      return Object.fromEntries(
        Object.entries(item).map(([key, child]) => [
          key,
          /email|name|phone|token|secret|password|authorization|api.?key|reference|url|metadata|customer|account/i.test(key)
            ? "[REDACTED]"
            : redactFields(child),
        ]),
      );
    };
    text = JSON.stringify(redactFields(parsed));
  } catch {
    // Keep non-JSON responses such as Cloudflare HTML for diagnostics.
  }

  return text
    .replace(/([\w.+-]+)@([\w.-]+\.[A-Za-z]{2,})/g, "[REDACTED_EMAIL]")
    .replace(/\b(Bearer|Basic)\s+[^\s"'<>]+/gi, "$1 [REDACTED]")
    .replace(/(\"[\w]*(?:accessToken|token|secret|password|authorization|apiKey|email|customerName|phoneNumber)[\w]*\"\s*:\s*)\"[^\"]*\"/gi, '$1"[REDACTED]"')
    .slice(0, MAX_DIAGNOSTIC_BODY_LENGTH);
}

function summarizeRequestBody(body) {
  if (!body || typeof body !== "object") return null;
  return {
    amount: body.amount,
    currencyCode: body.currencyCode,
    paymentMethods: body.paymentMethods,
    metadataField: body.metaData ? "metaData" : body.metadata ? "metadata" : null,
    metadataKeys: Object.keys(body.metaData || body.metadata || {}),
    hasRedirectUrl: Boolean(body.redirectUrl),
    hasReturnUrl: Boolean(body.redirectUrl),
    customerName: "[REDACTED]",
    customerEmail: "[REDACTED]",
    paymentReference: "[REDACTED]",
    contractCode: "[REDACTED]",
  };
}

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

  const url = `${envConfig.MONNIFY_BASE_URL}${path}`;
  const requestHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": USER_AGENT,
    ...headers,
  };

  console.info("Monnify request", {
    url,
    method,
    headers: {
      "Content-Type": requestHeaders["Content-Type"],
      Accept: requestHeaders.Accept,
      "User-Agent": requestHeaders["User-Agent"],
    },
    body: summarizeRequestBody(body),
  });

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
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

  const responseContentType = response.headers.get("content-type") || null;
  let responseText = "";
  try {
    responseText = await response.text();
  } catch {
    // Keep the status and headers if the response stream itself is unreadable.
  }

  let responseBody = null;
  if (responseText.trim()) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  const responseDiagnostics = {
    httpStatus: response.status,
    contentType: responseContentType,
    responseBody: responseText
      ? redactDiagnosticText(responseText)
      : "[empty]",
    cloudflareRayId: response.headers.get("cf-ray"),
  };
  (response.ok ? console.info : console.error)(
    "Monnify response",
    responseDiagnostics,
  );

  if (!response.ok) {
    const err = new Error(
      (typeof responseBody === "object" && responseBody?.responseMessage) ||
        (typeof responseBody === "object" && responseBody?.error) ||
        `Monnify request failed (HTTP ${response.status})`
    );
    err.code = "PROVIDER_REJECTED";
    err.httpStatus = response.status;
    err.providerResponse = responseBody;
    throw err;
  }

  if (typeof responseBody !== "object" || responseBody === null) {
    const err = new Error("Monnify returned an empty or invalid response body");
    err.code = "PROVIDER_RESPONSE_MALFORMED";
    err.httpStatus = response.status;
    err.providerResponse = responseBody;
    throw err;
  }

  return responseBody;
}
