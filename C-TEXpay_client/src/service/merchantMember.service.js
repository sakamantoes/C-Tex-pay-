import api from "./api";

/*
|--------------------------------------------------------------------------
| MERCHANT MEMBER SERVICE
|--------------------------------------------------------------------------
| Base: /api/v1/merchant-members
|
| Dashboard routes require: protect + requireMerchant + requirePermission(...)
| User-scoped routes (notifications, invitations) require only: protect
|--------------------------------------------------------------------------
*/

export const merchantMemberService = {
  /*
  |--------------------------------------------------------------------------
  | INVITATIONS (team.manage)
  |--------------------------------------------------------------------------
  */

  /**
   * Send an invitation to join the current merchant.
   * POST /merchant-members/invite
   * Required permission: team.manage
   *
   * @param {Object} payload
   * @param {string} payload.email
   * @param {string} payload.roleId - initial role required by the API
   */
  inviteMember: async ({ email, roleId }) => {
    if (!email?.trim() || !roleId) {
      throw new Error("Email and role ID are required");
    }

    const body = { email: email.trim().toLowerCase(), roleId };

    const { data } = await api.post("/merchant-members/invite", body);
    return data;
  },

  /**
   * Accept an invitation as the authenticated invited user (body-token variant).
   * POST /merchant-members/invitations/accept
   *
   * @param {Object} payload
   * @param {string} payload.token
   */
  acceptMemberInvitation: async ({ token }) => {
    if (!token) throw new Error("Invitation token is required");

    const { data } = await api.post("/merchant-members/invitations/accept", {
      token,
    });
    return data;
  },

  /**
   * Accept an invitation as the authenticated invited user (URL-param variant).
   * POST /merchant-members/invitations/:id/accept
   *
   * @param {string} invitationId
   */
  acceptInvitationById: async (invitationId) => {
    if (!invitationId) throw new Error("Invitation ID is required");

    const { data } = await api.post(
      `/merchant-members/invitations/${encodeURIComponent(invitationId)}/accept`
    );
    return data;
  },

  /*
  |--------------------------------------------------------------------------
  | MEMBERS (team.read / team.manage)
  |--------------------------------------------------------------------------
  */

  /**
   * Get all members of the current merchant.
   * GET /merchant-members
   * Required permission: team.read
   */
  getMembers: async () => {
    const { data } = await api.get("/merchant-members");
    return data;
  },

  /**
   * Get a single member by ID.
   * GET /merchant-members/:id
   * Required permission: team.read
   */
  getMember: async (memberId) => {
    if (!memberId) throw new Error("Member ID is required");

    const { data } = await api.get(
      `/merchant-members/${encodeURIComponent(memberId)}`
    );
    return data;
  },

  /*
  |--------------------------------------------------------------------------
  | ROLES ON MEMBERS (team.manage)
  |--------------------------------------------------------------------------
  */

  /**
   * Assign a role to a member (body variant — recommended).
   * POST /merchant-members/:id/roles
   * Required permission: team.manage
   *
   * @param {string} memberId
   * @param {string} roleId
   */
  assignRole: async (memberId, roleId) => {
    if (!memberId || !roleId) {
      throw new Error("Member and role IDs are required");
    }

    const { data } = await api.post(
      `/merchant-members/${encodeURIComponent(memberId)}/roles`,
      { roleId }
    );
    return data;
  },

  /**
   * Assign a role to a member (URL-param variant).
   * POST /merchant-members/:id/roles/:roleId
   * Required permission: team.manage
   *
   * @param {string} memberId
   * @param {string} roleId
   */
  assignRoleByParam: async (memberId, roleId) => {
    if (!memberId || !roleId) {
      throw new Error("Member and role IDs are required");
    }

    const { data } = await api.post(
      `/merchant-members/${encodeURIComponent(memberId)}/roles/${encodeURIComponent(roleId)}`
    );
    return data;
  },

  /**
   * Remove a role from a member.
   * DELETE /merchant-members/:id/roles/:roleId
   * Required permission: team.manage
   *
   * @param {string} memberId
   * @param {string} roleId
   */
  removeRole: async (memberId, roleId) => {
    if (!memberId || !roleId) {
      throw new Error("Member and role IDs are required");
    }

    const { data } = await api.delete(
      `/merchant-members/${encodeURIComponent(memberId)}/roles/${encodeURIComponent(roleId)}`
    );
    return data;
  },

  /**
   * Remove a member from the merchant (soft delete → status: REMOVED).
   * DELETE /merchant-members/:id
   * Required permission: team.manage
   *
   * @param {string} memberId
   */
  removeMember: async (memberId) => {
    if (!memberId) throw new Error("Member ID is required");

    const { data } = await api.delete(
      `/merchant-members/${encodeURIComponent(memberId)}`
    );
    return data;
  },

  /*
  |--------------------------------------------------------------------------
  | NOTIFICATIONS (user-scoped — no merchant required)
  |--------------------------------------------------------------------------
  */

  /**
   * Get notifications for the authenticated user.
   * GET /merchant-members/notifications
   */
  getMyNotifications: async () => {
    const { data } = await api.get("/merchant-members/notifications");
    return data;
  },

    /**
   * Delete a notification (owner = the authenticated user).
   * DELETE /merchant-members/notifications/:id
   *
   * @param {string} notificationId
   */
  deleteNotification: async (notificationId) => {
    if (!notificationId) throw new Error("Notification ID is required");

    const { data } = await api.delete(
      `/merchant-members/notifications/${encodeURIComponent(notificationId)}`
    );
    return data;
  },

    /**
   * Delete ALL notifications for the authenticated user.
   * DELETE /merchant-members/notifications
   */
  deleteAllNotifications: async () => {
    const { data } = await api.delete("/merchant-members/notifications");
    return data;
  },

  /**
   * Mark a notification as read.
   * PATCH /merchant-members/notifications/:id/read
   *
   * @param {string} notificationId
   */
  markNotificationRead: async (notificationId) => {
    if (!notificationId) throw new Error("Notification ID is required");

    const { data } = await api.patch(
      `/merchant-members/notifications/${encodeURIComponent(notificationId)}/read`
    );
    return data;
  },

  markAllNotificationsRead: async () => {
    const { data } = await api.patch("/merchant-members/notifications/read-all");
    return data;
  },
};

export default merchantMemberService;
