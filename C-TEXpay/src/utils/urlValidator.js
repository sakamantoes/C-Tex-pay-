import envConfig from "../config/constant.js";

const FORBIDDEN_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "file:",
  "ftp:",
  "mailto:",
]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizedHostname(url) {
  return url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function validPort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535
    ? String(port)
    : null;
}

/**
 * Development loopback is limited to the port used by the configured
 * development frontend. No loopback port is allowed when FRONTEND_URL is
 * absent, points at a public host, or omits its port.
 */
function configuredDevelopmentPort(frontendUrl = envConfig.FRONTEND_URL) {
  if (!frontendUrl) return null;
  try {
    const configured = new URL(frontendUrl);
    if (!LOOPBACK_HOSTS.has(normalizedHostname(configured))) return null;
    return validPort(configured.port);
  } catch {
    return null;
  }
}

/**
 * Validate a merchant URL.
 *
 * Production requires HTTPS and forbids loopback destinations. Development
 * permits loopback only on the configured frontend port; public hosts still
 * require HTTPS. User-info credentials and unsupported URL schemes are never
 * accepted.
 */
export function validateMerchantUrl(
  raw,
  {
    nodeEnv = envConfig.NODE_ENV,
    developmentPort = configuredDevelopmentPort(),
  } = {},
) {
  if (raw === null || raw === undefined || raw === "") {
    return { valid: false, reason: "EMPTY" };
  }

  if (typeof raw !== "string") {
    return { valid: false, reason: "NOT_A_STRING" };
  }

  const trimmed = raw.trim();
  if (trimmed.length > 500) {
    return { valid: false, reason: "TOO_LONG" };
  }

  const lower = trimmed.toLowerCase();
  for (const protocol of FORBIDDEN_PROTOCOLS) {
    if (lower.startsWith(protocol)) {
      return { valid: false, reason: "FORBIDDEN_PROTOCOL" };
    }
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: "MALFORMED" };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: "CREDENTIALS_NOT_ALLOWED" };
  }

  const hostname = normalizedHostname(parsed);
  const isLoopback = LOOPBACK_HOSTS.has(hostname);
  const isDevelopment = nodeEnv === "development";

  if (!isDevelopment) {
    if (isLoopback) {
      return { valid: false, reason: "LOOPBACK_NOT_ALLOWED" };
    }
    if (parsed.protocol !== "https:") {
      return { valid: false, reason: "HTTPS_REQUIRED" };
    }
  } else if (isLoopback) {
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, reason: "UNSUPPORTED_PROTOCOL" };
    }

    const expectedPort = validPort(developmentPort);
    if (!expectedPort) {
      return { valid: false, reason: "DEVELOPMENT_PORT_NOT_CONFIGURED" };
    }
    if (parsed.port !== expectedPort) {
      return { valid: false, reason: "DEVELOPMENT_PORT_MISMATCH" };
    }
  } else if (parsed.protocol !== "https:") {
    return { valid: false, reason: "HTTP_NOT_ALLOWED" };
  }

  return { valid: true, url: parsed.toString() };
}

/** Check that a candidate URL exactly matches a configured merchant URL. */
export function isAllowedReturnUrl(candidateUrl, allowedUrls) {
  if (!candidateUrl) return false;
  if (!Array.isArray(allowedUrls) || allowedUrls.length === 0) return false;

  let normalized;
  try {
    normalized = new URL(candidateUrl).toString();
  } catch {
    return false;
  }

  return allowedUrls.some((allowed) => {
    if (!allowed) return false;
    try {
      return new URL(allowed).toString() === normalized;
    } catch {
      return false;
    }
  });
}
