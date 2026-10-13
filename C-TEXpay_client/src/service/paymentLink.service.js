import api from "./api";

/*
|--------------------------------------------------------------------------
| PAYMENT LINK SERVICE
|--------------------------------------------------------------------------
| Base: /api/v1/payment-links (merchant) and /api/v1/public/payment-links
|--------------------------------------------------------------------------
*/

/**
 * MariaDB returns JSON columns as strings. Normalize to a plain object.
 */
function parseInstructions(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export const paymentLinkService = {
  /* ------------------------------------------------------
   * MERCHANT
   * ---------------------------------------------------- */

  list: async (params = {}) => {
    const { data } = await api.get("/payment-links", { params });
    return data;
  },

  get: async (id) => {
    const { data } = await api.get(`/payment-links/${id}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await api.post("/payment-links", payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await api.patch(`/payment-links/${id}`, payload);
    return data;
  },

  archive: async (id) => {
    const { data } = await api.delete(`/payment-links/${id}`);
    return data;
  },

  /* ------------------------------------------------------
   * PUBLIC CHECKOUT
   * ---------------------------------------------------- */

  getPublic: async (slug) => {
    const { data } = await api.get(`/public/payment-links/${slug}`);
    return data;
  },

  publicCheckout: async (slug, payload) => {
    const { data } = await api.post(
      `/public/payment-links/${slug}/checkout`,
      payload
    );
    if (data?.data?.paymentInstructions) {
      data.data.paymentInstructions = parseInstructions(
        data.data.paymentInstructions
      );
    }
    return data;
  },

  publicStatus: async (slug, paymentReference) => {
    const { data } = await api.get(
      `/public/payment-links/${slug}/payments/${paymentReference}`
    );
    if (data?.data?.paymentInstructions) {
      data.data.paymentInstructions = parseInstructions(
        data.data.paymentInstructions
      );
    }
    return data;
  },
};

export default paymentLinkService;