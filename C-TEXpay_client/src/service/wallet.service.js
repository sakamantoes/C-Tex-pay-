import api from "./api";

const walletService = {
  async getBalance() {
    const { data } = await api.get("/ledger/balance");
    return data.data;
  },
  async getEntries(params = {}) {
    const { data } = await api.get("/ledger/entries", { params });
    return data;
  },
  async getPayouts(params = {}) {
    const { data } = await api.get("/payouts", { params });
    return data;
  },
  async quotePayout(payload) {
    const { data } = await api.post("/payouts/quote", payload);
    return data.data;
  },
  async validateBankAccount(payload) {
    const { data } = await api.post("/payouts/validate-bank-account", payload);
    return data.data;
  },
  async createPayout(payload, idempotencyKey) {
    const { data } = await api.post("/payouts", payload, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return data.data;
  },
};

export default walletService;
