import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  getSettings,
  updateSettings,
  updateUrls,
} from "../controller/merchantSetting.controller.js";
import {
  updateMerchantSettingsSchema,
  updateMerchantUrlsSchema,
} from "../validation/merchantSetting.validation.js";

const router = Router();

router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("settings.read"),
  getSettings
);

router.patch(
  "/",
  protect,
  requireMerchant,
  requirePermission("settings.update"),
  validate(updateMerchantSettingsSchema),
  updateSettings
);

router.patch(
  "/urls",
  protect,
  requireMerchant,
  requirePermission("settings.update"),
  validate(updateMerchantUrlsSchema),
  updateUrls
);

export default router;