export const ROLES = Object.freeze({
  USER: "USER",
  MERCHANT: "MERCHANT",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
});

const DASHBOARD_PATHS = Object.freeze({
  [ROLES.SUPER_ADMIN]: "/super-admin/dashboard",
  [ROLES.ADMIN]: "/admin/dashboard",
  [ROLES.MERCHANT]: "/merchant/dashboard",
  [ROLES.USER]: "/user/dashboard/overview", // 👈 was "/user/onboarding/dashboard"
});

export const getUserRole = (user) => user?.role ?? null;

export const hasRole = (user, role) => getUserRole(user) === role;

export const hasAnyRole = (user, roles = []) => {
  const role = getUserRole(user);
  if (!role) return false;
  return roles.includes(role);
};

export const isSuperAdmin = (user) => hasRole(user, ROLES.SUPER_ADMIN);
export const isAdmin = (user) => hasRole(user, ROLES.ADMIN);
export const isMerchant = (user) => hasRole(user, ROLES.MERCHANT);
export const isUser = (user) => hasRole(user, ROLES.USER);

export const getDashboardPath = (user) => {
  const role = getUserRole(user);

  if (!role) {
    throw new Error("getDashboardPath: user has no role");
  }

  const path = DASHBOARD_PATHS[role];

  if (!path) {
    throw new Error(`getDashboardPath: unknown role "${role}"`);
  }

  return path;
};