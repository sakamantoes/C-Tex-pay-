
import {
  listAdminUsers,
  getAdminUser,
  setAdminUserStatus,
  setAdminUserRole,
  forceLogoutAdminUser,
} from "../service/adminUser.service.js";

/* =========================================================
 * LIST USERS
 * ======================================================= */

export async function adminListUsers(req, res) {
  try {
    const result = await listAdminUsers(req.query);

    return res.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Admin user list failed", {
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to list users",
    });
  }
}

/* =========================================================
 * USER DETAIL
 * ======================================================= */

export async function adminGetUser(req, res) {
  try {
    const result = await getAdminUser(req.params.userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Admin user detail failed", {
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user",
    });
  }
}

/* =========================================================
 * UPDATE STATUS
 * ======================================================= */

export async function adminSetUserStatus(req, res) {
  try {
    const result = await setAdminUserStatus({
      userId: req.params.userId,
      status: req.body.status,
      reason: req.body.reason,
      actorUserId: req.user.id,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: {
        id: result.user.id,
        status: result.user.status,
      },
      changed: result.changed,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    console.error("Admin user status update failed", {
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to update user status",
    });
  }
}

/* =========================================================
 * UPDATE ROLE
 * ======================================================= */

export async function adminSetUserRole(req, res) {
  try {
    const result = await setAdminUserRole({
      userId: req.params.userId,
      role: req.body.role,
      reason: req.body.reason,
      actorUserId: req.user.id,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: {
        id: result.user.id,
        role: result.user.role,
      },
      changed: result.changed,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    console.error("Admin user role update failed", {
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to update user role",
    });
  }
}

/* =========================================================
 * FORCE LOGOUT
 * ======================================================= */

export async function adminForceLogoutUser(req, res) {
  try {
    const result = await forceLogoutAdminUser({
      userId: req.params.userId,
      reason: req.body.reason,
      actorUserId: req.user.id,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: {
        id: result.user.id,
        sessionsRevoked: result.sessionsRevoked,
        tokensRevoked: result.tokensRevoked,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }

    console.error("Admin force-logout failed", {
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to force logout user",
    });
  }
}
