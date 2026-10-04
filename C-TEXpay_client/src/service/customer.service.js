import api from "./api";

/*
|--------------------------------------------------------------------------
| CUSTOMER SERVICE
|--------------------------------------------------------------------------
| Dashboard routes (JWT): /api/v1/customers/dashboard
|   → protect + requireMerchant + requirePermission("customers.*")
|
| Public API routes (API Key): /api/v1/customers
|   → authenticateApiKey + requireApiKeyPermission("customers.*")
|
| This service uses the DASHBOARD (JWT) routes for the frontend.
|--------------------------------------------------------------------------
*/

export const customerService = {
  /**
   * Create a customer
   * POST /customers/dashboard
   * Required permission: customers.create
   */
  createCustomer: async ({
    firstName,
    lastName,
    email,
    phone,
    metadata,
  }) => {
    const payload = { firstName, lastName, email };

    if (phone) payload.phone = phone;
    if (metadata) payload.metadata = metadata;

    const { data } = await api.post("/customers/dashboard", payload);
    return data;
  },

  /**
   * Get all customers (paginated + search + status filter)
   * GET /customers/dashboard
   * Required permission: customers.read
   *
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @param {string} [params.search]
   * @param {"ACTIVE"|"INACTIVE"|"BLOCKED"} [params.status]
   */
  getCustomers: async ({
    page = 1,
    limit = 20,
    search,
    status,
  } = {}) => {
    const params = { page, limit };

    if (search?.trim()) params.search = search.trim();
    if (status) params.status = status;

    const { data } = await api.get("/customers/dashboard", { params });
    return data;
  },

  /**
   * Get a single customer by ID
   * GET /customers/dashboard/:id
   * Required permission: customers.read
   */
  getCustomer: async (customerId) => {
    const { data } = await api.get(`/customers/dashboard/${customerId}`);
    return data;
  },

  /**
   * Update a customer
   * PATCH /customers/dashboard/:id
   * Required permission: customers.update
   */
  updateCustomer: async (
    customerId,
    { firstName, lastName, email, phone, status, metadata }
  ) => {
    const payload = {};

    if (firstName !== undefined) payload.firstName = firstName;
    if (lastName !== undefined) payload.lastName = lastName;
    if (email !== undefined) payload.email = email;
    if (phone !== undefined) payload.phone = phone;
    if (status !== undefined) payload.status = status;
    if (metadata !== undefined) payload.metadata = metadata;

    const { data } = await api.patch(
      `/customers/dashboard/${customerId}`,
      payload
    );
    return data;
  },

  /**
   * Delete a customer
   * DELETE /customers/dashboard/:id
   * Required permission: customers.delete
   */
  deleteCustomer: async (customerId) => {
    const { data } = await api.delete(
      `/customers/dashboard/${customerId}`
    );
    return data;
  },
};

export default customerService;