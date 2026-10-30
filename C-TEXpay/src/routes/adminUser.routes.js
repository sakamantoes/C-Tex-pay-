import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  requirePlatformPermission,
} from "../middleware/platformAdmin.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  adminListUsers,
  adminGetUser,
  adminSetUserStatus,
  adminSetUserRole,
  adminForceLogoutUser,
} from "../controller/adminUser.controller.js";
import {
  adminListUsersQuerySchema,
  userIdParamSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  forceLogoutSchema,
} from "../validation/admin.validation.js";

const router = Router();

router.get(
  "/",
  protect,
  requirePlatformPermission("users.read_all"),
  validate(adminListUsersQuerySchema, "query"),
  adminListUsers
);

router.get(
  "/:id",
  protect,
  requirePlatformPermission("users.read_all"),
  validate(userIdParamSchema, "params"),
  (req, res, next) => {
    req.params.userId = req.params.id;
    next();
  },
  adminGetUser
);

router.patch(
  "/:id/status",
  protect,
  requirePlatformPermission("users.manage"),
  validate(userIdParamSchema, "params"),
  validate(updateUserStatusSchema),
  (req, res, next) => {
    req.params.userId = req.params.id;
    next();
  },
  adminSetUserStatus
);

router.patch(
  "/:id/role",
  protect,
  requirePlatformPermission("users.manage"),
  validate(userIdParamSchema, "params"),
  validate(updateUserRoleSchema),
  (req, res, next) => {
    req.params.userId = req.params.id;
    next();
  },
  adminSetUserRole
);

router.post(
  "/:id/force-logout",
  protect,
  requirePlatformPermission("users.manage"),
  validate(userIdParamSchema, "params"),
  validate(forceLogoutSchema),
  (req, res, next) => {
    req.params.userId = req.params.id;
    next();
  },
  adminForceLogoutUser
);

export default router;