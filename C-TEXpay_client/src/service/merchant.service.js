import api from "./api";

/*
|--------------------------------------------------------------------------
| MERCHANT SERVICE
|--------------------------------------------------------------------------
*/

export const merchantService = {
  /**
   * Create a new merchant
   * POST /merchants
   */
  createMerchant: async (payload) => {
    const { data } = await api.post("/merchants", payload);
    return data;
  },

  /**
   * Get current user's merchant
   * GET /merchants/me
   */
  getMyMerchant: async () => {
    const { data } = await api.get("/merchants/me");
    return data;
  },

  /**
   * Update merchant (status, onboardingStatus)
   * PATCH /merchants/me
   */
  updateMyMerchant: async (payload) => {
    const { data } = await api.patch("/merchants/me", payload);
    return data;
  },

  /**
   * Get business profile
   * GET /merchants/me/business
   */
  getBusinessProfile: async () => {
    const { data } = await api.get("/merchants/me/business");
    return data;
  },

  getOwnedBusinessProfile: async () => {
    const { data } = await api.get("/merchants/owned/business");
    return data;
  },

  /**
   * Update business profile
   * PATCH /merchants/me/business
   */
  updateBusinessProfile: async (payload) => {
    const { data } = await api.patch("/merchants/me/business", payload);
    return data;
  },

  /**
   * Get current user's membership (roles + permissions)
   * GET /merchants/me/membership
   */
  getMyMembership: async () => {
    const { data } = await api.get("/merchants/me/membership");
    return data;
  },

  getMyMemberships: async () => {
    const { data } = await api.get("/merchants/memberships");
    return data;
  },
};

export default merchantService;