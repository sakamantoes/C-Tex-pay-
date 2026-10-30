
import api from "./api";

const adminUserService = {
  /**
   * GET /api/v1/admin/users
   */
  listUsers: async (params = {}) => {
    const clean = {};

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        clean[key] = value;
      }
    }

    const { data } = await api.get("/admin/users", {
      params: clean,
    });

    return {
      users: Array.isArray(data.data) ? data.data : [],
      pagination: data.pagination || {
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 0,
      },
    };
  },

  /**
   * GET /api/v1/admin/users/:userId
   */
  getUser: async (userId) => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { data } = await api.get(
      `/admin/users/${encodeURIComponent(userId)}`
    );

    return data.data;
  },

  /**
   * PATCH /api/v1/admin/users/:userId/status
   */
  setUserStatus: async (userId, status, reason) => {
    if (!userId || !status) {
      throw new Error("User ID and status are required");
    }

    if (!reason || reason.trim().length < 8) {
      throw new Error("Reason must contain at least 8 characters");
    }

    const { data } = await api.patch(
      `/admin/users/${encodeURIComponent(userId)}/status`,
      {
        status,
        reason: reason.trim(),
      }
    );

    return data;
  },

  /**
   * PATCH /api/v1/admin/users/:userId/role
   */
  setUserRole: async (userId, role, reason) => {
    if (!userId || !role) {
      throw new Error("User ID and role are required");
    }

    if (!reason || reason.trim().length < 8) {
      throw new Error("Reason must contain at least 8 characters");
    }

    const { data } = await api.patch(
      `/admin/users/${encodeURIComponent(userId)}/role`,
      {
        role,
        reason: reason.trim(),
      }
    );

    return data;
  },

  /**
   * POST /api/v1/admin/users/:userId/force-logout
   */
  forceLogout: async (userId, reason) => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!reason || reason.trim().length < 8) {
      throw new Error("Reason must contain at least 8 characters");
    }

    const { data } = await api.post(
      `/admin/users/${encodeURIComponent(userId)}/force-logout`,
      {
        reason: reason.trim(),
      }
    );

    return data;
  },
};

export default adminUserService;

export { adminUserService };
