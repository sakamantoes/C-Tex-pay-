import api from "./api";

/*
|--------------------------------------------------------------------------
| AUTH SERVICE
|--------------------------------------------------------------------------
*/

export const authService = {
  /**
   * Register new user
   * POST /auth/register
   */
  register: async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  },

  /**
   * Login user
   * POST /auth/login
   */
  login: async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });

    // Persist tokens
    if (data?.data?.accessToken) {
      localStorage.setItem("accessToken", data.data.accessToken);
    }
    if (data?.data?.refreshToken) {
      localStorage.setItem("refreshToken", data.data.refreshToken);
    }

    return data;
  },

  /**
   * Logout user
   * POST /auth/logout
   */
  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      await api.post("/auth/logout", { refreshToken });
    } catch (err) {
      // even if it fails, clear local tokens
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }

    return { success: true };
  },

  resendVerification: async (email) => {
  const { data } = await api.post("/auth/resend-verification", { email });
  return data;
},

  /**
   * Get current authenticated user
   * GET /auth/me
   */
  getMe: async () => {
    const { data } = await api.get("/auth/me");
    return data;
  },

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  refresh: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const { data } = await api.post("/auth/refresh", { refreshToken });

    if (data?.data?.accessToken) {
      localStorage.setItem("accessToken", data.data.accessToken);
    }

    return data;
  },

  /**
   * Verify email
   * POST /auth/verify-email
   */
  verifyEmail: async (token) => {
    const { data } = await api.post("/auth/verify-email", { token });
    return data;
  },

  /**
   * Forgot password
   * POST /auth/forgot-password
   */
  forgotPassword: async (email) => {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  },

  /**
   * Reset password
   * POST /auth/reset-password
   */
  resetPassword: async ({ token, password, confirmPassword }) => {
    const { data } = await api.post("/auth/reset-password", {
      token,
      password,
      confirmPassword,
    });
    return data;
  },

  /**
   * Change password
   * POST /auth/change-password
   */
  changePassword: async ({
    currentPassword,
    newPassword,
    confirmPassword,
  }) => {
    const { data } = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return data;
  },
};

export default authService;