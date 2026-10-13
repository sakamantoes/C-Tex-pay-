import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createLink,
  listLinks,
  getLink,
  updateLink,
  deactivateLink,
} from "../controller/paymentLink.controller.js";
import {
  createPaymentLinkSchema,
  updatePaymentLinkSchema,
  paymentLinkIdParamSchema,
  listPaymentLinksQuerySchema,
} from "../validation/paymentLink.validation.js";

const router = Router();

router.post(
  "/",
  protect,
  requireMerchant,
  requirePermission("payment_links.create"),
  validate(createPaymentLinkSchema),
  createLink
);

router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("payment_links.read"),
  validate(listPaymentLinksQuerySchema, "query"),
  listLinks
);

router.get(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("payment_links.read"),
  validate(paymentLinkIdParamSchema, "params"),
  getLink
);

router.patch(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("payment_links.update"),
  validate(paymentLinkIdParamSchema, "params"),
  validate(updatePaymentLinkSchema),
  updateLink
);

router.delete(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("payment_links.delete"),
  validate(paymentLinkIdParamSchema, "params"),
  deactivateLink
);

export default router;