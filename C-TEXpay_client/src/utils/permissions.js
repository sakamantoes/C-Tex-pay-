/**
 * Check if a user has a specific permission.
 *
 * @param {string[]} permissions - array of permission keys (e.g. ["customers.read"])
 * @param {string} key - required permission key
 * @returns {boolean}
 */
export function hasPermission(permissions, key) {
  if (!key) return true;
  if (!Array.isArray(permissions)) return false;
  return permissions.includes(key);
}

/**
 * Check if the user has ANY of the given permissions.
 */
export function hasAnyPermission(permissions, keys) {
  if (!Array.isArray(keys) || keys.length === 0) return true;
  return keys.some((k) => hasPermission(permissions, k));
}

/**
 * Check if the user has ALL of the given permissions.
 */
export function hasAllPermissions(permissions, keys) {
  if (!Array.isArray(keys) || keys.length === 0) return true;
  return keys.every((k) => hasPermission(permissions, k));
}