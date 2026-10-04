import { create } from "zustand";
import transactionService from "../service/transaction.service";

export const useTransactionStore = create((set) => ({
  transactions: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  summary: null,
  selectedTransaction: null,
  isLoading: false,
  error: null,

  getTransactions: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await transactionService.getTransactions(params);
      set({
        transactions: response.data || [],
        meta: response.meta || { page: 1, limit: 20, total: 0, totalPages: 0 },
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Unable to load transactions";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  getTransaction: async (paymentReference) => {
    set({ isLoading: true, error: null, selectedTransaction: null });
    try {
      const response = await transactionService.getTransaction(paymentReference);
      set({ selectedTransaction: response.data, isLoading: false });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || "Unable to load transaction";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  getSummary: async () => {
    try {
      const response = await transactionService.getSummary();
      set({ summary: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || "Unable to load transaction summary";
      set({ error: message });
      return { success: false, message };
    }
  },

  clearSelectedTransaction: () => set({ selectedTransaction: null }),
  clearError: () => set({ error: null }),
  clearAll: () => set({
    transactions: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    summary: null,
    selectedTransaction: null,
    isLoading: false,
    error: null,
  }),
}));
