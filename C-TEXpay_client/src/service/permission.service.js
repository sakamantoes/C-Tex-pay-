import api from "./api";

/*
|--------------------------------------------------------------------------
| PERMISSION SERVICE
|--------------------------------------------------------------------------
| Base: /api/v1/permissions
| All routes require: protect + requireMerchant
|--------------------------------------------------------------------------
*/

export const permissionService = {
  /**
   * Get all permissions available in the system.
   * GET /permissions
   *
   * Returns the full permission catalogue (id, key, name, resource, action).
   * Used to populate the role permission drawer.
   */
  getPermissions: async () => {
    const { data } = await api.get("/permissions");
    return data;
  },
};

export default permissionService;