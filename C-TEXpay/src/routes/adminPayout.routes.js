import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  adminListPayouts,
  adminGetPayout,
  adminRefreshPayout,
  adminReversePayout,
} from "../controller/payout.controller.js";
import {
  payoutIdParamSchema,
  listPayoutsQuerySchema,
} from "../validation/payout.validation.js";

const router = Router();

router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("payouts.read_all"),
  validate(listPayoutsQuerySchema, "query"),
  adminListPayouts
);

router.get(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("payouts.read_all"),
  validate(payoutIdParamSchema, "params"),
  adminGetPayout
);

router.post(
  "/:id/refresh",
  protect,
  requireMerchant,
  requirePermission("payouts.manage"),
  validate(payoutIdParamSchema, "params"),
  adminRefreshPayout
);

router.post(
  "/:id/reverse",
  protect,
  requireMerchant,
  requirePermission("payouts.manage"),
  validate(payoutIdParamSchema, "params"),
  adminReversePayout
);

export default router;