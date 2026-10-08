import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createPayoutController,
  validateBankAccountController,
  listMyPayouts,
  getMyPayout,
} from "../controller/payout.controller.js";
import {
  createPayoutSchema,
  validateBankAccountSchema,
  payoutIdParamSchema,
  listPayoutsQuerySchema,
} from "../validation/payout.validation.js";

const router = Router();

router.post(
  "/",
  protect,
  requireMerchant,
  requirePermission("payouts.create"),
  validate(createPayoutSchema),
  createPayoutController
);

router.post(
  "/validate-bank-account",
  protect,
  requireMerchant,
  requirePermission("payouts.create"),
  validate(validateBankAccountSchema),
  validateBankAccountController
);

router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("payouts.read"),
  validate(listPayoutsQuerySchema, "query"),
  listMyPayouts
);

router.get(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("payouts.read"),
  validate(payoutIdParamSchema, "params"),
  getMyPayout
);

export default router;