import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  getMerchantBalanceAdmin,
  createAdminAdjustment,
} from "../controller/ledger.controller.js";
import {
  merchantIdParamSchema,
  adminAdjustmentSchema,
} from "../validation/ledger.validation.js";

const router = Router();

router.get(
  "/merchants/:merchantId/balance",
  protect,
  requireMerchant,
  requirePermission("ledger.read_all"),
  validate(merchantIdParamSchema, "params"),
  getMerchantBalanceAdmin
);

router.post(
  "/adjustments",
  protect,
  requireMerchant,
  requirePermission("ledger.adjust"),
  validate(adminAdjustmentSchema),
  createAdminAdjustment
);

export default router;