import { Router } from "express";
import { validate } from "../middleware/validate.middleware.js";
import {
  getPublicLink,
  publicCheckout,
  publicPaymentStatus,
} from "../controller/paymentLink.controller.js";
import {
  publicCheckoutSchema,
  paymentLinkSlugParamSchema,
  publicPaymentRefParamSchema,
} from "../validation/paymentLink.validation.js";

const router = Router();

/**
 * Public Payment Link routes.
 *
 * No merchant API key, no JWT required. Rate limiting is applied
 * at the app.js level for the /api/v1/public/* prefix.
 */

router.get(
  "/:slug",
  validate(paymentLinkSlugParamSchema, "params"),
  getPublicLink
);

router.post(
  "/:slug/checkout",
  validate(paymentLinkSlugParamSchema, "params"),
  validate(publicCheckoutSchema),
  publicCheckout
);

router.get(
  "/:slug/payments/:paymentReference",
  validate(publicPaymentRefParamSchema, "params"),
  publicPaymentStatus
);

export default router;