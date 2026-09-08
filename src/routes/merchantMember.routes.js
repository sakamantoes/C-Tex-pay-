import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  getMembers,
  getMember,
  assignRoleToMember,
  removeRoleFromMember,
  removeMember,
} from "../controller/merchantMember.controller.js";
import {
  memberIdParamSchema,
  assignRoleToMemberSchema,
} from "../validation/merchantMember.validation.js";

const router = Router();

// Get all members
router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("team.read"),
  getMembers
);

// Get single member
router.get(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("team.read"),
  validate(memberIdParamSchema, "params"),
  getMember
);

// Assign role to member
router.post(
  "/:id/roles",
  protect,
  requireMerchant,
  requirePermission("team.manage"),
  validate(memberIdParamSchema, "params"),
  validate(assignRoleToMemberSchema),
  assignRoleToMember
);

// Remove role from member
router.delete(
  "/:id/roles/:roleId",
  protect,
  requireMerchant,
  requirePermission("team.manage"),
  validate(memberIdParamSchema, "params"),
  removeRoleFromMember
);

// Remove member from merchant
router.delete(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("team.manage"),
  validate(memberIdParamSchema, "params"),
  removeMember
);

export default router;