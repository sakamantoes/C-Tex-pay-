import { validateApiKey } from "../service/apiKey.service.js";
import { ApiKeyUsage } from "../models/index.js";

export const authenticateApiKey = async (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header required",
      });
    }

    // Check format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format. Use: Bearer <API_KEY>",
      });
    }

    const rawKey = parts[1];

    // Basic format check
    if (!rawKey.startsWith("ctex_")) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key format",
      });
    }

    // Validate the key
    const validationResult = await validateApiKey(rawKey);

    if (!validationResult.valid) {
      return res.status(401).json({
        success: false,
        message: validationResult.error || "Invalid API key",
      });
    }

    // Attach to request
    req.apiKey = validationResult.apiKey;
    req.merchant = validationResult.merchant;
    req.isApiAuthenticated = true;

    // Store for usage tracking later
    req._apiKeyId = validationResult.apiKey.id;
    req._merchantId = validationResult.merchant.id;

    next();
  } catch (error) {
    console.error("API Key authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Middleware to record usage after request completes
export const recordApiKeyUsage = () => {
  return async (req, res, next) => {
    const startTime = Date.now();
    req._startTime = startTime;

    res.on("finish", () => {
      if (req._apiKeyId && req._merchantId) {
        const responseTime = Date.now() - startTime;

        ApiKeyUsage.create({
          apiKeyId: req._apiKeyId,
          merchantId: req._merchantId,
          requestId: req.requestId || "unknown",
          method: req.method,
          endpoint: req.originalUrl || req.url,
          statusCode: res.statusCode,
          ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
          userAgent: req.headers["user-agent"],
          responseTime,
        }).catch((err) => {
          console.error("Failed to record API usage:", err);
        });
      }
    });

    next();
  };
};