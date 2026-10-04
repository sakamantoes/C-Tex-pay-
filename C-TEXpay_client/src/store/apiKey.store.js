import { create } from "zustand";
import apiKeyService from "../service/apiKey.service";

export const useApiKeyStore = create((set) => ({
  apiKeys: [],
  currentApiKey: null,
  usage: [],
  usagePagination: null,
  newlyCreatedKey: null,
  revealedKey: null,        // 👈 raw key returned by /reveal
  revealLoading: false,      // 👈 separate flag so the modal has its own spinner
  isLoading: false,
  error: null,

  getApiKeys: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiKeyService.getApiKeys(params);
      set({ apiKeys: res.data.apiKeys, isLoading: false });
      return { success: true, data: res };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load API keys";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  getApiKey: async (apiKeyId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiKeyService.getApiKey(apiKeyId);
      set({ currentApiKey: res.data.apiKey, isLoading: false });
      return { success: true, data: res };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load API key";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  createApiKey: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiKeyService.createApiKey(payload);
      const createdApiKey = res.data.apiKey || res.data;
      set((s) => ({
        apiKeys: [createdApiKey, ...s.apiKeys],
        newlyCreatedKey: res.data.key || createdApiKey.key,
        isLoading: false,
      }));
      return { success: true, data: res };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to create API key";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  /**
   * Reveal an API key (owner-only, requires account password).
   * @param {string} apiKeyId
   * @param {string} password
   */
  revealApiKey: async (apiKeyId, password) => {
    set({ revealLoading: true, error: null });
    try {
      const res = await apiKeyService.revealApiKey(apiKeyId, password);
      set({ revealedKey: res.data.apiKey, revealLoading: false });
      return { success: true, data: res };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to reveal API key";
      set({ revealLoading: false, error: message });
      return { success: false, message };
    }
  },

  rotateApiKey: async (apiKeyId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiKeyService.rotateApiKey(apiKeyId);
      const rotatedApiKey = res.data.newApiKey || res.data.apiKey;
      set((s) => ({
        apiKeys: s.apiKeys.map((k) => (k.id === apiKeyId ? rotatedApiKey : k)),
        newlyCreatedKey: res.data.key || rotatedApiKey?.key,
        isLoading: false,
      }));
      return { success: true, data: res };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to rotate API key";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  revokeApiKey: async (apiKeyId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiKeyService.revokeApiKey(apiKeyId);
      set((s) => ({
        apiKeys: s.apiKeys.map((k) =>
          k.id === apiKeyId
            ? { ...k, status: "REVOKED", revokedAt: res.data.revokedAt }
            : k
        ),
        isLoading: false,
      }));
      return { success: true, data: res };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to revoke API key";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  getApiKeyUsage: async (apiKeyId, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiKeyService.getApiKeyUsage(apiKeyId, params);
      set({
        usage: res.data.usage,
        usagePagination: res.data.pagination,
        isLoading: false,
      });
      return { success: true, data: res };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load API key usage";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  clearNewlyCreatedKey: () => set({ newlyCreatedKey: null }),
  clearRevealedKey: () => set({ revealedKey: null }),
  clearError: () => set({ error: null }),
}));

export default useApiKeyStore;