import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  requireMerchant,
  requireMerchantOwner,
} from "../middleware/merchant.middleware.js";
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
  requireMerchantOwner,
  validate(createApiKeySchema),
  createApiKey
);

// Get all API keys
router.get(
  "/",
  protect,
  requireMerchant,
  validate(getApiKeysQuerySchema, "query"),
  getApiKeys
);

// Get single API key
router.get(
  "/:id",
  protect,
  requireMerchant,
  validate(apiKeyIdParamSchema, "params"),
  getApiKey
);

// Get API key permissions
router.get(
  "/:id/permissions",
  protect,
  requireMerchant,
  validate(apiKeyIdParamSchema, "params"),
  getApiKeyPermissions
);

// Add permission to API key
router.post(
  "/:id/permissions/:permissionId",
  protect,
  requireMerchant,
  requireMerchantOwner,
  validate(apiKeyPermissionParamSchema, "params"),
  addApiKeyPermission
);

// Remove permission from API key
router.delete(
  "/:id/permissions/:permissionId",
  protect,
  requireMerchant,
  requireMerchantOwner,
  validate(apiKeyPermissionParamSchema, "params"),
  removeApiKeyPermission
);

// Rotate API key
router.post(
  "/:id/rotate",
  protect,
  requireMerchant,
  requireMerchantOwner,
  validate(apiKeyIdParamSchema, "params"),
  rotateApiKey
);

// Revoke API key
router.post(
  "/:id/revoke",
  protect,
  requireMerchant,
  requireMerchantOwner,
  validate(apiKeyIdParamSchema, "params"),
  revokeApiKey
);

// Get API key usage
router.get(
  "/:id/usage",
  protect,
  requireMerchant,
  validate(apiKeyIdParamSchema, "params"),
  validate(usageQuerySchema, "query"),
  getApiKeyUsage
);

// ============ PUBLIC API ROUTES (API Key Auth) ============

// Test endpoint for API key authentication
router.get(
  "/test/api-key",
  authenticateApiKey,
  recordApiKeyUsage(),
  requireApiKeyPermission("transactions.read"),
  testApiKey
);

export default router;