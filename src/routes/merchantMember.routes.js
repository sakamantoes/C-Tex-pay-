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
  inviteMember,
  acceptMemberInvitation,
  getMyNotifications,
  markNotificationRead,
   deleteNotification,  
     deleteAllNotifications, 
} from "../controller/merchantMember.controller.js";
import {
  memberIdParamSchema,
  assignRoleToMemberSchema,
  assignRoleToMemberParamSchema,
  inviteMemberSchema,
  acceptMemberInvitationSchema,
} from "../validation/merchantMember.validation.js";
import { z } from "zod";

const router = Router();

router.get("/notifications", protect, getMyNotifications);

router.patch(
  "/notifications/:id/read",
  protect,
  validate(z.object({ id: z.string().uuid("Invalid notification ID format") }), "params"),
  markNotificationRead,
);

// Send an invitation to join the merchant
router.post(
  "/invite",
  protect,
  requireMerchant,
  requirePermission("team.manage"),
  validate(inviteMemberSchema),
  inviteMember,
);


// delete a single notification
router.delete(
  "/notifications/:id",
  protect,
  validate(
    z.object({ id: z.string().uuid("Invalid notification ID format") }),
    "params"
  ),
  deleteNotification
)


router.delete("/notifications", protect, deleteAllNotifications);

// Accept an invitation as the authenticated invited user
router.post(
  "/invitations/accept",
  protect,
  validate(acceptMemberInvitationSchema),
  acceptMemberInvitation,
);

router.post(
  "/invitations/:id/accept",
  protect,
  validate(z.object({ id: z.string().uuid("Invalid invitation ID format") }), "params"),
  acceptMemberInvitation,
);

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

// Assign role to member using roleId in the URL
router.post(
  "/:id/roles/:roleId",
  protect,
  requireMerchant,
  requirePermission("team.manage"),
  validate(assignRoleToMemberParamSchema, "params"),
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