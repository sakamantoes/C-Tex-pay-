import api from "./api";

/*
|--------------------------------------------------------------------------
| ROLE SERVICE
|--------------------------------------------------------------------------
| Base: /api/v1/roles
| All routes require: protect + requireMerchant + requirePermission(...)
|--------------------------------------------------------------------------
*/

export const roleService = {
  /**
   * Create a new role
   * POST /roles
   * Required permission: roles.manage
   */
  createRole: async ({ name, description }) => {
    const { data } = await api.post("/roles", { name, description });
    return data;
  },

  /**
   * Get all roles for the current merchant
   * GET /roles
   * Required permission: roles.read
   */
  getRoles: async () => {
    const { data } = await api.get("/roles");
    return data;
  },

  /**
   * Get a single role by ID
   * GET /roles/:id
   * Required permission: roles.read
   */
  getRole: async (roleId) => {
    const { data } = await api.get(`/roles/${roleId}`);
    return data;
  },

  /**
   * Update a role
   * PATCH /roles/:id
   * Required permission: roles.manage
   */
  updateRole: async (roleId, { name, description }) => {
    const { data } = await api.patch(`/roles/${roleId}`, {
      name,
      description,
    });
    return data;
  },

  /**
   * Delete a role
   * DELETE /roles/:id
   * Required permission: roles.manage
   */
  deleteRole: async (roleId) => {
    const { data } = await api.delete(`/roles/${roleId}`);
    return data;
  },

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS
  |--------------------------------------------------------------------------
  */

  /**
   * Assign a permission to a role (URL-param variant)
   * POST /roles/:id/permissions/:permissionId
   * Required permission: roles.manage
   */
  assignPermissionByParam: async (roleId, permissionId) => {
    if (!roleId || !permissionId) {
      throw new Error("Role and permission IDs are required");
    }
    const { data } = await api.post(
      `/roles/${encodeURIComponent(roleId)}/permissions/${encodeURIComponent(permissionId)}`
    );
    return data;
  },

  /**
   * Assign a permission to a role (body variant — recommended)
   * POST /roles/:id/permissions
   * Required permission: roles.manage
   *
   * @param {string} roleId
   * @param {string} permissionId
   */
  assignPermission: async (roleId, permissionId) => {
    if (!roleId || !permissionId) {
      throw new Error("Role and permission IDs are required");
    }
    const { data } = await api.post(
      `/roles/${encodeURIComponent(roleId)}/permissions`,
      { permissionId }
    );
    return data;
  },

  /**
   * Remove a permission from a role
   * DELETE /roles/:id/permissions/:permissionId
   * Required permission: roles.manage
   */
  removePermission: async (roleId, permissionId) => {
    if (!roleId || !permissionId) {
      throw new Error("Role and permission IDs are required");
    }
    const { data } = await api.delete(
      `/roles/${encodeURIComponent(roleId)}/permissions/${encodeURIComponent(permissionId)}`,
      // The current controller reads this value from the URL, while the
      // request validator expects it in the body. Supplying both keeps the
      // client compatible with the complete API contract.
      { data: { permissionId } }
    );
    return data;
  },
};

export default roleService;
