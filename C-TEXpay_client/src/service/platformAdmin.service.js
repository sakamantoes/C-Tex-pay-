import api from "./api";

const platformAdminService = {
  getOverview: async () => {
    const { data } = await api.get("/admin/dashboard/summary");
    return data;
  },

  getPayments: async (params = {}) => {
    const { data } = await api.get("/admin/payments", { params });
    return data;
  },

  getMerchants: async (params = {}) => {
    const { data } = await api.get("/admin/merchants", { params });
    return data;
  },

  getMerchant: async (merchantId) => {
    const { data } = await api.get(`/admin/merchants/${encodeURIComponent(merchantId)}`);
    return data;
  },

  setMerchantStatus: async (merchantId, payload) => {
    const { data } = await api.patch(
      `/admin/merchants/${encodeURIComponent(merchantId)}/status`,
      payload
    );
    return data;
  },

  getAuditLogs: async (params = {}) => {
    const { data } = await api.get("/admin/audit-logs", { params });
    return data;
  },

  getFeeConfigurations: async (params = {}) => {
    const { data } = await api.get("/fees", { params });
    return data;
  },

  createFeeConfiguration: async (payload) => {
    const { data } = await api.post("/fees", payload);
    return data;
  },

  updateFeeConfiguration: async (id, payload) => {
    const { data } = await api.patch(`/fees/${encodeURIComponent(id)}`, payload);
    return data;
  },

  setFeeConfigurationStatus: async (id, status) => {
    const { data } = await api.patch(`/fees/${encodeURIComponent(id)}/status`, { status });
    return data;
  },
};

export default platformAdminService;
