import { MerchantMember, Role, Permission } from "../models/index.js";
import { Op } from "sequelize";

export const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const merchantMember = req.merchantMember;

      if (!merchantMember) {
        return res.status(403).json({
          success: false,
          message: "Merchant membership required",
        });
      }

      // Load member's roles with permissions
      const memberWithRoles = await MerchantMember.findByPk(
        merchantMember.id,
        {
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
                },
              ],
            },
          ],
        }
      );

      if (!memberWithRoles) {
        return res.status(403).json({
          success: false,
          message: "Member not found",
        });
      }

      // Check if any role has the required permission
      let hasPermission = false;
      for (const role of memberWithRoles.roles) {
        if (role.permissions && role.permissions.length > 0) {
          const found = role.permissions.some(
            (perm) => perm.key === permissionKey
          );
          if (found) {
            hasPermission = true;
            break;
          }
        }
      }

      // Check for wildcard permission (resource.*)
      if (!hasPermission) {
        const resource = permissionKey.split(".")[0];
        const wildcardKey = `${resource}.*`;
        for (const role of memberWithRoles.roles) {
          if (role.permissions && role.permissions.length > 0) {
            const found = role.permissions.some(
              (perm) => perm.key === wildcardKey
            );
            if (found) {
              hasPermission = true;
              break;
            }
          }
        }
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permissionKey}`,
        });
      }

      // Store permissions in request for potential use
      req.userPermissions = memberWithRoles.roles.reduce((acc, role) => {
        if (role.permissions) {
          acc.push(...role.permissions.map((p) => p.key));
        }
        return acc;
      }, []);

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};

export const requireAnyPermission = (permissionKeys) => {
  return async (req, res, next) => {
    try {
      const merchantMember = req.merchantMember;

      if (!merchantMember) {
        return res.status(403).json({
          success: false,
          message: "Merchant membership required",
        });
      }

      const memberWithRoles = await MerchantMember.findByPk(
        merchantMember.id,
        {
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
                },
              ],
            },
          ],
        }
      );

      if (!memberWithRoles) {
        return res.status(403).json({
          success: false,
          message: "Member not found",
        });
      }

      let hasPermission = false;
      for (const role of memberWithRoles.roles) {
        if (role.permissions) {
          const found = role.permissions.some((perm) =>
            permissionKeys.includes(perm.key)
          );
          if (found) {
            hasPermission = true;
            break;
          }
        }
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
        });
      }

      req.userPermissions = memberWithRoles.roles.reduce((acc, role) => {
        if (role.permissions) {
          acc.push(...role.permissions.map((p) => p.key));
        }
        return acc;
      }, []);

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};