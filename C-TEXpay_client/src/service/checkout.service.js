import api from "./api";

export const checkoutService = {
  /**
   * Fetch a payment's safe public view by checkout token.
   */
  getByToken: async (token) => {
    const { data } = await api.get(
      `/public/checkout/${encodeURIComponent(token)}`
    );
    return data;
  },
};

export default checkoutService;