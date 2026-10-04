import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/auth.middleware.js";
import {
  requireMerchant,
  requireMerchantOwner,
} from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createMerchantWebhook,
  deleteMerchantWebhook,
  getMerchantWebhook,
  listMerchantWebhooks,
  rotateMerchantWebhookSecretController,
  updateMerchantWebhook,
  listMerchantWebhookEventsController,
  getMerchantWebhookEventController,
  revealMerchantWebhookSecretController,
} from "../controller/merchantWebhook.controller.js";
import {
  createMerchantWebhookSchema,
  updateMerchantWebhookSchema,
  merchantWebhookIdParamSchema,
  merchantWebhookEventIdParamSchema,
  merchantWebhookEventsQuerySchema,
  revealMerchantWebhookSecretSchema,
} from "../validation/merchantWebhook.validation.js";

const router = Router();
const secretRevealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many secret reveal attempts. Try again later." },
});

router.post(
  "/",
  protect,
  requireMerchant,
  requirePermission("webhooks.manage"),
  validate(createMerchantWebhookSchema),
  createMerchantWebhook,
);

router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("webhooks.read"),
  listMerchantWebhooks,
);

router.get(
  "/events",
  protect,
  requireMerchant,
  requirePermission("webhooks.read"),
  validate(merchantWebhookEventsQuerySchema, "query"),
  listMerchantWebhookEventsController,
);

router.get(
  "/events/:id",
  protect,
  requireMerchant,
  requirePermission("webhooks.read"),
 validate(merchantWebhookEventIdParamSchema, "params"), 
  getMerchantWebhookEventController,
);

router.get(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("webhooks.read"),
  validate(merchantWebhookIdParamSchema, "params"),
  getMerchantWebhook,
);

router.patch(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("webhooks.manage"),
  validate(merchantWebhookIdParamSchema, "params"),
  validate(updateMerchantWebhookSchema),
  updateMerchantWebhook,
);

router.post(
  "/:id/rotate-secret",
  protect,
  requireMerchant,
  requirePermission("webhooks.manage"),
  validate(merchantWebhookIdParamSchema, "params"),
  rotateMerchantWebhookSecretController,
);

router.post(
  "/:id/reveal-secret",
  protect,
  requireMerchant,
  requirePermission("webhooks.manage"),
  requireMerchantOwner,
  secretRevealLimiter,
  validate(merchantWebhookIdParamSchema, "params"),
  validate(revealMerchantWebhookSecretSchema),
  revealMerchantWebhookSecretController,
);

router.delete(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("webhooks.manage"),
  validate(merchantWebhookIdParamSchema, "params"),
  deleteMerchantWebhook,
);

export default router;
