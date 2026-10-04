import api from "./api";

const merchantSettingsService = {
  getSettings: async () => {
    const { data } = await api.get("/merchant-settings");
    return data;
  },

  updateSettings: async (settings) => {
    const { data } = await api.patch("/merchant-settings", settings);
    return data;
  },
};

export default merchantSettingsService;
