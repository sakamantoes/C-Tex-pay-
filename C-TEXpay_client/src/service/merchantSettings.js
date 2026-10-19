import api from "./api";

/**
 * Merchant settings service.
 *
 * Backend routes:
 *   GET   /merchant-settings          → read notification + redirect URL settings
 *   PATCH /merchant-settings          → update notification preferences
 *   PATCH /merchant-settings/urls     → update redirect URLs only
 *
 * The backend wraps every response as { success, message?, data: { settings } }.
 * These helpers unwrap that so callers get the settings object directly.
 */
export const merchantSettingService = {
  /**
   * Fetch the current merchant's settings.
   * @returns {Promise<object>} The settings object
   */
  getSettings: async () => {
    const { data } = await api.get("/merchant-settings");
    return data.data.settings;
  },

  /**
   * Update notification preferences (email/in-app toggles,
   * notification email address). Redirect URLs are NOT touched.
   * @param {object} payload
   * @returns {Promise<object>} The updated settings object
   */
  updateSettings: async (payload) => {
    const { data } = await api.patch("/merchant-settings", payload);
    return data.data.settings;
  },

  /**
   * Update only the redirect URLs.
   * @param {object} payload
   * @returns {Promise<object>} The updated settings object
   */
  updateUrls: async (payload) => {
    const { data } = await api.patch("/merchant-settings/urls", payload);
    return data.data.settings;
  },
};

export default merchantSettingService;