
import { Op } from "sequelize";
import sequelize from "../config/database.js";

import {
  User,
  Merchant,
  MerchantMember,
  UserSession,
  RefreshToken,
  AdminAuditLog,
} from "../models/index.js";

/* =========================================================
 * ERRORS
 * ======================================================= */

export class AdminUserError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.name = "AdminUserError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/* =========================================================
 * CONSTANTS
 * ======================================================= */

const USER_PUBLIC_ATTRIBUTES = [
  "id",
  "firstName",
  "lastName",
  "email",
  "phone",
  "role",
  "status",
  "emailVerified",
  "phoneVerified",
  "lastLoginAt",
  "failedLoginAttempts",
  "lockedUntil",
  "createdAt",
  "updatedAt",
];

const ALLOWED_USER_SORT_FIELDS = new Set([
  "createdAt",
  "lastLoginAt",
  "email",
  "firstName",
]);

const RESTRICTED_ROLES = ["ADMIN", "SUPER_ADMIN"];

/* =========================================================
 * HELPERS
 * ======================================================= */

function ensureEligibleUser(user) {
  if (!user || RESTRICTED_ROLES.includes(user.role)) {
    return null;
  }

  return user;
}

/* =========================================================
 * LIST USERS
 * ======================================================= */

export async function listAdminUsers({
  page = 1,
  limit = 20,
  search = null,
  role = null,
  status = null,
  emailVerified = null,
  createdFrom = null,
  createdTo = null,
  sortBy = "createdAt",
  sortDir = "DESC",
} = {}) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(
    Math.max(parseInt(limit, 10) || 20, 1),
    100
  );

  const offset = (safePage - 1) * safeLimit;

  // ADMIN and SUPER_ADMIN must never appear in this endpoint.
  const where = {
    role: {
      [Op.notIn]: RESTRICTED_ROLES,
    },
  };

  // Reject attempts to filter for restricted roles.
  if (role && RESTRICTED_ROLES.includes(role)) {
    return {
      users: [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalItems: 0,
        totalPages: 0,
      },
    };
  }

  if (role) {
    where.role = role;
  }

  // Keep the restricted-role exclusion even when a role filter is supplied.
  where.role = {
    [Op.notIn]: RESTRICTED_ROLES,
    ...(role ? { [Op.eq]: role } : {}),
  };

  if (status) {
    where.status = status;
  }

  if (emailVerified === "true") {
    where.emailVerified = true;
  }

  if (emailVerified === "false") {
    where.emailVerified = false;
  }

  if (search) {
    const escaped = String(search)
      .replace(/[\\%_]/g, "\\$&")
      .trim();

    if (escaped) {
      const term = `%${escaped}%`;

      where[Op.or] = [
        { firstName: { [Op.like]: term } },
        { lastName: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { phone: { [Op.like]: term } },
      ];
    }
  }

  if (createdFrom || createdTo) {
    where.createdAt = {};

    if (createdFrom) {
      where.createdAt[Op.gte] = new Date(createdFrom);
    }

    if (createdTo) {
      where.createdAt[Op.lte] = new Date(createdTo);
    }
  }

  const safeSortBy = ALLOWED_USER_SORT_FIELDS.has(sortBy)
    ? sortBy
    : "createdAt";

  const safeSortDir =
    String(sortDir || "DESC").toUpperCase() === "ASC"
      ? "ASC"
      : "DESC";

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: USER_PUBLIC_ATTRIBUTES,
    order: [[safeSortBy, safeSortDir]],
    limit: safeLimit,
    offset,
  });

  return {
    users: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems: count,
      totalPages: Math.ceil(count / safeLimit),
    },
  };
}

/* =========================================================
 * USER DETAIL
 * ======================================================= */

export async function getAdminUser(userId) {
  const user = await User.findByPk(userId, {
    attributes: USER_PUBLIC_ATTRIBUTES,
    include: [
      {
        model: MerchantMember,
        as: "merchantMemberships",
        required: false,
        include: [
          {
            model: Merchant,
            as: "merchant",
            attributes: ["id", "merchantCode", "status"],
            required: false,
          },
        ],
      },
    ],
  });

  // Do not expose ADMIN or SUPER_ADMIN accounts.
  if (!ensureEligibleUser(user)) {
    return null;
  }

  const [activeSessions, activeRefreshTokens] =
    await Promise.all([
      UserSession.count({
        where: {
          userId,
          expiresAt: { [Op.gt]: new Date() },
        },
      }),

      RefreshToken.count({
        where: {
          userId,
          expiresAt: { [Op.gt]: new Date() },
        },
      }),
    ]);

  return {
    user,
    sessions: {
      activeCount: activeSessions,
      activeRefreshTokens,
    },
  };
}

/* =========================================================
 * UPDATE STATUS
 * ======================================================= */

export async function setAdminUserStatus({
  userId,
  status,
  reason,
  actorUserId,
}) {
  if (!reason || reason.trim().length < 8) {
    throw new AdminUserError(
      "A change reason of at least 8 characters is required",
      "REASON_REQUIRED",
      400
    );
  }

  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!ensureEligibleUser(user)) {
      return null;
    }

    if (user.id === actorUserId) {
      throw new AdminUserError(
        "You cannot change your own status",
        "SELF_ACTION_FORBIDDEN",
        403
      );
    }

    const changed = user.status !== status;

    if (!changed) {
      return { user, changed: false };
    }

    const beforeValue = {
      status: user.status,
      emailVerified: user.emailVerified,
    };

    const updates = { status };

    if (status === "ACTIVE" && !user.emailVerified) {
      updates.emailVerified = true;
    }

    await user.update(updates, { transaction: t });

    if (["SUSPENDED", "INACTIVE"].includes(status)) {
      await UserSession.destroy({
        where: { userId },
        transaction: t,
      });

      await RefreshToken.destroy({
        where: { userId },
        transaction: t,
      });
    }

    await AdminAuditLog.create(
      {
        actorUserId,
        action: "USER_STATUS_UPDATED",
        resourceType: "USER",
        resourceId: userId,
        outcome: "SUCCESS",
        reason: reason.trim(),
        beforeValue,
        afterValue: {
          status,
          emailVerified:
            updates.emailVerified ?? user.emailVerified,
        },
      },
      { transaction: t }
    );

    return { user, changed: true };
  });
}

/* =========================================================
 * UPDATE ROLE
 * ======================================================= */

export async function setAdminUserRole({
  userId,
  role,
  reason,
  actorUserId,
}) {
  if (!reason || reason.trim().length < 8) {
    throw new AdminUserError(
      "A change reason of at least 8 characters is required",
      "REASON_REQUIRED",
      400
    );
  }

  // This endpoint manages ordinary USER/MERCHANT accounts only.
  if (RESTRICTED_ROLES.includes(role)) {
    throw new AdminUserError(
      "This endpoint cannot assign ADMIN or SUPER_ADMIN roles",
      "RESTRICTED_ROLE",
      403
    );
  }

  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!ensureEligibleUser(user)) {
      return null;
    }

    if (user.id === actorUserId) {
      throw new AdminUserError(
        "You cannot change your own role",
        "SELF_ACTION_FORBIDDEN",
        403
      );
    }

    const changed = user.role !== role;

    if (!changed) {
      return { user, changed: false };
    }

    const beforeValue = { role: user.role };

    await user.update({ role }, { transaction: t });

    await AdminAuditLog.create(
      {
        actorUserId,
        action: "USER_ROLE_UPDATED",
        resourceType: "USER",
        resourceId: userId,
        outcome: "SUCCESS",
        reason: reason.trim(),
        beforeValue,
        afterValue: { role },
      },
      { transaction: t }
    );

    return { user, changed: true };
  });
}

/* =========================================================
 * FORCE LOGOUT
 * ======================================================= */

export async function forceLogoutAdminUser({
  userId,
  reason,
  actorUserId,
}) {
  if (!reason || reason.trim().length < 8) {
    throw new AdminUserError(
      "A change reason of at least 8 characters is required",
      "REASON_REQUIRED",
      400
    );
  }

  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!ensureEligibleUser(user)) {
      return null;
    }

    if (user.id === actorUserId) {
      throw new AdminUserError(
        "You cannot force logout yourself",
        "SELF_ACTION_FORBIDDEN",
        403
      );
    }

    const sessions = await UserSession.destroy({
      where: { userId },
      transaction: t,
    });

    const tokens = await RefreshToken.destroy({
      where: { userId },
      transaction: t,
    });

    await AdminAuditLog.create(
      {
        actorUserId,
        action: "USER_FORCE_LOGOUT",
        resourceType: "USER",
        resourceId: userId,
        outcome: "SUCCESS",
        reason: reason.trim(),
        beforeValue: null,
        afterValue: {
          sessionsRevoked: sessions,
          tokensRevoked: tokens,
        },
      },
      { transaction: t }
    );

    return {
      user,
      sessionsRevoked: sessions,
      tokensRevoked: tokens,
    };
  });
}
