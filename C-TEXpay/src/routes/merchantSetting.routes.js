import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  getMerchantSettingsController,
  updateMerchantSettingsController,
} from "../controller/merchantSetting.controller.js";
import { updateMerchantSettingsSchema } from "../validation/merchantSetting.validation.js";

const router = Router();

router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("settings.read"),
  getMerchantSettingsController,
);

router.patch(
  "/",
  protect,
  requireMerchant,
  requirePermission("settings.update"),
  validate(updateMerchantSettingsSchema),
  updateMerchantSettingsController,
);

export default router;
