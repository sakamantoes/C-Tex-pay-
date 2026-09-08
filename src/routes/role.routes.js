import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
  assignPermissionToRole,
  removePermissionFromRole,
} from "../controller/role.controller.js";
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
  assignPermissionSchema,
} from "../validation/role.validation.js";

const router = Router();

// Create role
router.post(
  "/",
  protect,
  requireMerchant,
  requirePermission("roles.manage"),
  validate(createRoleSchema),
  createRole
);

// Get all roles
router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("roles.read"),
  getRoles
);

// Get single role
router.get(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("roles.read"),
  validate(roleIdParamSchema, "params"),
  getRole
);

// Update role
router.patch(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("roles.manage"),
  validate(roleIdParamSchema, "params"),
  validate(updateRoleSchema),
  updateRole
);

// Delete role
router.delete(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("roles.manage"),
  validate(roleIdParamSchema, "params"),
  deleteRole
);

// Assign permission to role
router.post(
  "/:id/permissions/:permissionId",
  protect,
  requireMerchant,
  requirePermission("roles.manage"),
  validate(roleIdParamSchema, "params"),
  validate(assignPermissionSchema, "params"),
  assignPermissionToRole
);

// Remove permission from role
router.delete(
  "/:id/permissions/:permissionId",
  protect,
  requireMerchant,
  requirePermission("roles.manage"),
  validate(roleIdParamSchema, "params"),
  validate(assignPermissionSchema, "params"),
  removePermissionFromRole
);

export default router;