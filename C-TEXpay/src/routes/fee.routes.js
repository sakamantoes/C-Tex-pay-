import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requirePlatformRole } from "../middleware/platformRole.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createFeeConfig,
  listFeeConfigs,
  getFeeConfig,
  updateFeeConfig,
  updateFeeConfigStatus,
  getMyEffectiveFees,
} from "../controller/fee.controller.js";
import {
  createFeeConfigSchema,
  updateFeeConfigSchema,
  feeConfigStatusSchema,
  feeConfigIdParamSchema,
  listFeeConfigsQuerySchema,
} from "../validation/fee.validation.js";

const router = Router();

// Platform fee configurations are never managed through merchant RBAC.

router.post(
  "/",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  validate(createFeeConfigSchema),
  createFeeConfig
);

router.get(
  "/",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  validate(listFeeConfigsQuerySchema, "query"),
  listFeeConfigs
);

router.get(
  "/effective",
  protect,
  requireMerchant,
  requirePermission("fees.read"),
  getMyEffectiveFees
);

router.get(
  "/:id",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  validate(feeConfigIdParamSchema, "params"),
  getFeeConfig
);

router.patch(
  "/:id",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  validate(feeConfigIdParamSchema, "params"),
  validate(updateFeeConfigSchema),
  updateFeeConfig
);

router.patch(
  "/:id/status",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  validate(feeConfigIdParamSchema, "params"),
  validate(feeConfigStatusSchema),
  updateFeeConfigStatus
);

export default router;