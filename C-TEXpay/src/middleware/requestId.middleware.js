import { randomBytes } from "crypto";

/**
 * Generate or use existing request ID
 */
export const requestId = (req, res, next) => {
  // Check if client provided request ID
  let requestId = req.headers["x-request-id"];

  // Validate format (alphanumeric with underscores and hyphens)
  if (requestId && !/^[a-zA-Z0-9_-]{8,64}$/.test(requestId)) {
    requestId = null;
  }

  // Generate if not provided or invalid
  if (!requestId) {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString("hex");
    requestId = `req_${timestamp}_${random}`;
  }

  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
};