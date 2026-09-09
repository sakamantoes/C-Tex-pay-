import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  authenticateApiKey,
  recordApiKeyUsage,
} from "../middleware/apiKeyAuth.middleware.js";
import { requireApiKeyPermission } from "../middleware/apiKeyPermission.middleware.js";
import {
  createApiKey,
  getApiKeys,
  getApiKey,
  getApiKeyPermissions,
  addApiKeyPermission,
  removeApiKeyPermission,
  rotateApiKey,
  revokeApiKey,
  getApiKeyUsage,
  testApiKey,
} from "../controller/apiKey.controller.js";
import {
  createApiKeySchema,
  apiKeyIdParamSchema,
  apiKeyPermissionParamSchema,
  getApiKeysQuerySchema,
  usageQuerySchema,
} from "../validation/apiKey.validation.js";

const router = Router();

// ============ DASHBOARD ROUTES (JWT Auth) ============

// Create API key
router.post(
  "/",
  protect,
  requireMerchant,
  requirePermission("api_keys.create"),
  validate(createApiKeySchema),
  createApiKey
);

// Get all API keys
router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("api_keys.read"),
  validate(getApiKeysQuerySchema, "query"),
  getApiKeys
);

// Get single API key
router.get(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("api_keys.read"),
  validate(apiKeyIdParamSchema, "params"),
  getApiKey
);

// Get API key permissions
router.get(
  "/:id/permissions",
  protect,
  requireMerchant,
  requirePermission("api_keys.read"),
  validate(apiKeyIdParamSchema, "params"),
  getApiKeyPermissions
);

// Add permission to API key
router.post(
  "/:id/permissions/:permissionId",
  protect,
  requireMerchant,
  requirePermission("api_keys.create"),
  validate(apiKeyPermissionParamSchema, "params"),
  addApiKeyPermission
);

// Remove permission from API key
router.delete(
  "/:id/permissions/:permissionId",
  protect,
  requireMerchant,
  requirePermission("api_keys.revoke"),
  validate(apiKeyPermissionParamSchema, "params"),
  removeApiKeyPermission
);

// Rotate API key
router.post(
  "/:id/rotate",
  protect,
  requireMerchant,
  requirePermission("api_keys.create"),
  validate(apiKeyIdParamSchema, "params"),
  rotateApiKey
);

// Revoke API key
router.post(
  "/:id/revoke",
  protect,
  requireMerchant,
  requirePermission("api_keys.revoke"),
  validate(apiKeyIdParamSchema, "params"),
  revokeApiKey
);

// Get API key usage
router.get(
  "/:id/usage",
  protect,
  requireMerchant,
  requirePermission("api_keys.read"),
  validate(apiKeyIdParamSchema, "params"),
  validate(usageQuerySchema, "query"),
  getApiKeyUsage
);

// ============ PUBLIC API ROUTES (API Key Auth) ============

// Test endpoint for API key authentication
router.get(
  "/test/api-key",
  authenticateApiKey,
  recordApiKeyUsage(Date.now()),
  requireApiKeyPermission("transactions.read"),
  testApiKey
);

export default router;