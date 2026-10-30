import { User, Permission, Role, MerchantMember } from "../models/index.js";

/**
 * requirePlatformRole(...roles)
 *
 * Verifies the authenticated user's system role (User.role) is one of the
 * allowed platform roles. Does NOT require merchant membership.
 *
 * Used for platform-level admin APIs (/admin/users, /admin/merchants).
 */
export function requirePlatformRole(...roles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Requires one of: ${roles.join(", ")}`,
      });
    }
    next();
  };
}

/**
 * requirePlatformPermission(permissionKey)
 *
 * Grants access if the authenticated user has the permission key via:
 *   1. SUPER_ADMIN role → bypasses permission check (implicit all-access)
 *   2. Their merchant membership roles (if any)
 *
 * Does NOT require merchant membership to succeed — the point is that a
 * Super Admin with no merchant membership can still call platform APIs.
 */
export function requirePlatformPermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // SUPER_ADMIN bypasses all permission checks.
      if (user.role === "SUPER_ADMIN") {
        return next();
      }

      // Otherwise require ADMIN role AND the specific permission.
      if (user.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Platform admin access required",
        });
      }

      // Look for the permission via any active merchant membership this
      // admin happens to hold. If none exists, deny.
      const memberships = await MerchantMember.findAll({
        where: { userId: user.id, status: "ACTIVE" },
        include: [
          {
            model: Role,
            as: "roles",
            through: { attributes: [] },
            include: [
              {
                model: Permission,
                as: "permissions",
                through: { attributes: [] },
                where: { key: permissionKey },
                required: false,
              },
            ],
          },
        ],
      });

      const hasPermission = memberships.some((m) =>
        (m.roles || []).some((r) =>
          (r.permissions || []).some((p) => p.key === permissionKey)
        )
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permissionKey}`,
        });
      }

      next();
    } catch (error) {
      console.error("Platform permission check failed", {
        userId: req.user?.id,
        permissionKey,
        name: error?.name,
        message: error?.message,
      });
      return res.status(500).json({
        success: false,
        message: "Permission check failed",
      });
    }
  };
}