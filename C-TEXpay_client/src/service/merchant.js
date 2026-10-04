import api from "./api";

const BASE_PATH = "/merchant-webhooks";

const merchantWebhookService = {
  listWebhooks: async () => {
    const { data } = await api.get(BASE_PATH);
    return data;
  },

  createWebhook: async (payload) => {
    const { data } = await api.post(BASE_PATH, payload);
    return data;
  },

  updateWebhook: async (webhookId, payload) => {
    const { data } = await api.patch(`${BASE_PATH}/${webhookId}`, payload);
    return data;
  },

  rotateWebhookSecret: async (webhookId) => {
    const { data } = await api.post(`${BASE_PATH}/${webhookId}/rotate-secret`);
    return data;
  },

  revealWebhookSecret: async (webhookId, password) => {
    const { data } = await api.post(`${BASE_PATH}/${webhookId}/reveal-secret`, { password });
    return data;
  },

  deleteWebhook: async (webhookId) => {
    const { data } = await api.delete(`${BASE_PATH}/${webhookId}`);
    return data;
  },

  listWebhookEvents: async ({ page = 1, limit = 20, paymentId } = {}) => {
    const params = { page, limit };
    if (paymentId) params.paymentId = paymentId;
    const { data } = await api.get(`${BASE_PATH}/events`, { params });
    return data;
  },

  getWebhookEvent: async (eventId) => {
    const { data } = await api.get(`${BASE_PATH}/events/${encodeURIComponent(eventId)}`);
    return data;
  },
};

export default merchantWebhookService;
