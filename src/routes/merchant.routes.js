import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  createMerchant,
  getMyMerchant,
  updateMyMerchant,
  getBusinessProfile,
  updateBusinessProfile,
  getMyMembership,
} from "../controller/merchant.controller.js";
import {
  createMerchantSchema,
  updateMerchantSchema,
  updateBusinessProfileSchema,
} from "../validation/merchant.validation.js";

const router = Router();

// Create a new merchant (no merchant required yet)
router.post(
  "/",
  protect,
  validate(createMerchantSchema),
  createMerchant
);

// Get current user's merchant
router.get(
  "/me",
  protect,
  requireMerchant,
  getMyMerchant
);

// Update merchant
router.patch(
  "/me",
  protect,
  requireMerchant,
  requirePermission("merchants.update"),
  validate(updateMerchantSchema),
  updateMyMerchant
);

// Get business profile
router.get(
  "/me/business",
  protect,
  requireMerchant,
  getBusinessProfile
);

// Update business profile
router.patch(
  "/me/business",
  protect,
  requireMerchant,
  requirePermission("merchants.update"),
  validate(updateBusinessProfileSchema),
  updateBusinessProfile
);

// Get my membership details
router.get(
  "/me/membership",
  protect,
  requireMerchant,
  getMyMembership
);

export default router;