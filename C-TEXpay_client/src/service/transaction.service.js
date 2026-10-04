import api from "./api";

const transactionService = {
  getTransactions: async (params = {}) => {
    const { data } = await api.get("/transactions/dashboard", { params });
    return data;
  },

  getTransaction: async (paymentReference) => {
    const { data } = await api.get(
      `/transactions/dashboard/${encodeURIComponent(paymentReference)}`,
    );
    return data;
  },

  getSummary: async () => {
    const { data } = await api.get("/transactions/dashboard/summary");
    return data;
  },
};

export default transactionService;
