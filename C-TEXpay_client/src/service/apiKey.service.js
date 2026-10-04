import api from "./api";

/*
|--------------------------------------------------------------------------
| API KEY SERVICE
|--------------------------------------------------------------------------
| Base: /api/v1/api-keys
| All routes require: protect + requireMerchant
| Owner-only routes add: requireMerchantOwner
|--------------------------------------------------------------------------
*/

export const apiKeyService = {
  /**
   * Create a new API key
   * POST /api-keys
   * Requires: OWNER
   *
   * @param {Object} payload
   * @param {string} payload.name
   * @param {"TEST"|"LIVE"} [payload.environment="TEST"]
   * @param {string|null} [payload.expiresAt] - ISO date string
   * @param {string[]} [payload.permissionKeys=[]]
   */
  createApiKey: async ({
    name,
    environment = "TEST",
    expiresAt = null,
    permissionKeys = [],
  }) => {
    const payload = {
      name,
      environment,
      permissionKeys,
    };

    if (expiresAt) payload.expiresAt = expiresAt;

    const { data } = await api.post("/api-keys", payload);
    return data;
  },

  /**
   * Get all API keys for the merchant
   * GET /api-keys
   *
   * @param {Object} [params]
   * @param {"ACTIVE"|"REVOKED"|"EXPIRED"} [params.status]
   * @param {"TEST"|"LIVE"} [params.environment]
   */
  getApiKeys: async ({ status, environment } = {}) => {
    const params = {};
    if (status) params.status = status;
    if (environment) params.environment = environment;

    const { data } = await api.get("/api-keys", { params });
    return data;
  },

  /**
   * Get a single API key by ID
   * GET /api-keys/:id
   */
  getApiKey: async (apiKeyId) => {
    const { data } = await api.get(`/api-keys/${apiKeyId}`);
    return data;
  },

  /**
   * Get permissions assigned to an API key
   * GET /api-keys/:id/permissions
   */
  getApiKeyPermissions: async (apiKeyId) => {
    const { data } = await api.get(`/api-keys/${apiKeyId}/permissions`);
    return data;
  },

  /**
   * Add a permission to an API key
   * POST /api-keys/:id/permissions/:permissionId
   * Requires: OWNER
   */
  addPermission: async (apiKeyId, permissionId) => {
    const { data } = await api.post(
      `/api-keys/${apiKeyId}/permissions/${permissionId}`
    );
    return data;
  },

  /**
   * Remove a permission from an API key
   * DELETE /api-keys/:id/permissions/:permissionId
   * Requires: OWNER
   */
  removePermission: async (apiKeyId, permissionId) => {
    const { data } = await api.delete(
      `/api-keys/${apiKeyId}/permissions/${permissionId}`
    );
    return data;
  },

  /**
   * Rotate an API key (revokes old, issues new)
   * POST /api-keys/:id/rotate
   * Requires: OWNER
   * Returns: { oldKeyId, newApiKey, key }
   */
  rotateApiKey: async (apiKeyId) => {
    const { data } = await api.post(`/api-keys/${apiKeyId}/rotate`);
    return data;
  },

  /**
   * Revoke an API key
   * POST /api-keys/:id/revoke
   * Requires: OWNER
   */
  revokeApiKey: async (apiKeyId) => {
    const { data } = await api.post(`/api-keys/${apiKeyId}/revoke`);
    return data;
  },

    /**
   * Reveal an API key's raw value (requires the account password).
   * POST /api-keys/:id/reveal
   * Requires: OWNER
   *
   * @param {string} apiKeyId
   * @param {string} password - the current user's account password
   */
  revealApiKey: async (apiKeyId, password) => {
    if (!apiKeyId) throw new Error("API key ID is required");
    if (!password) throw new Error("Password is required");

    const { data } = await api.post(
      `/api-keys/${encodeURIComponent(apiKeyId)}/reveal`,
      { password }
    );
    return data;
  },

  /**
   * Get usage logs for an API key
   * GET /api-keys/:id/usage
   *
   * @param {string} apiKeyId
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   */
  getApiKeyUsage: async (apiKeyId, { page = 1, limit = 20 } = {}) => {
    const { data } = await api.get(`/api-keys/${apiKeyId}/usage`, {
      params: { page, limit },
    });
    return data;
  },
};
export default apiKeyService;