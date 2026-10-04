import { create } from "zustand";
import customerService from "../service/customer.service";

export const useCustomerStore = create((set) => ({
  customers: [],
  pagination: null,
  currentCustomer: null,
  isLoading: false,
  error: null,

  getCustomers: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await customerService.getCustomers(params);
      set({
        customers: res.data.customers,
        pagination: res.data.pagination,
        isLoading: false,
      });
      return { success: true, data: res };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load customers";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  getCustomer: async (customerId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await customerService.getCustomer(customerId);
      set({ currentCustomer: res.data.customer, isLoading: false });
      return { success: true, data: res };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load customer";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  createCustomer: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await customerService.createCustomer(payload);
      set((s) => ({
        customers: [res.data.customer, ...s.customers],
        isLoading: false,
      }));
      return { success: true, data: res };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to create customer";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  updateCustomer: async (customerId, payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await customerService.updateCustomer(customerId, payload);
      set((s) => ({
        customers: s.customers.map((c) =>
          c.id === customerId ? res.data.customer : c
        ),
        currentCustomer:
          s.currentCustomer?.id === customerId
            ? res.data.customer
            : s.currentCustomer,
        isLoading: false,
      }));
      return { success: true, data: res };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to update customer";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  deleteCustomer: async (customerId) => {
    set({ isLoading: true, error: null });
    try {
      await customerService.deleteCustomer(customerId);
      set((s) => ({
        customers: s.customers.filter((c) => c.id !== customerId),
        isLoading: false,
      }));
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to delete customer";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  clearError: () => set({ error: null }),
}));