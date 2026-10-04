import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
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

/*
|--------------------------------------------------------------------------
| Admin routes (platform-wide pricing)
|--------------------------------------------------------------------------
| These use requirePermission against the merchant's role. Only users
| whose role has fees.manage can hit them. The platform-wide config
| is still scoped to "the authenticated merchant's admin context" —
| in your current RBAC, that's how admin actions flow. If you later
| add a dedicated admin realm, move these to /admin/fees.
*/

router.post(
  "/",
  protect,
  requireMerchant,
  requirePermission("fees.manage"),
  validate(createFeeConfigSchema),
  createFeeConfig
);

router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("fees.read"),
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
  requireMerchant,
  requirePermission("fees.read"),
  validate(feeConfigIdParamSchema, "params"),
  getFeeConfig
);

router.patch(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("fees.manage"),
  validate(feeConfigIdParamSchema, "params"),
  validate(updateFeeConfigSchema),
  updateFeeConfig
);

router.patch(
  "/:id/status",
  protect,
  requireMerchant,
  requirePermission("fees.manage"),
  validate(feeConfigIdParamSchema, "params"),
  validate(feeConfigStatusSchema),
  updateFeeConfigStatus
);

export default router;