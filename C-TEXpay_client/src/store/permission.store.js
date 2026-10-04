import { create } from "zustand";
import permissionService from "../service/permission.service";

/*
|--------------------------------------------------------------------------
| PERMISSION HELPERS (pure)
|--------------------------------------------------------------------------
*/

export function hasPermission(permissions, key) {
  if (!key) return true;
  if (!Array.isArray(permissions)) return false;
  return permissions.includes(key);
}

export function hasAnyPermission(permissions, keys) {
  if (!Array.isArray(keys) || keys.length === 0) return true;
  return keys.some((k) => hasPermission(permissions, k));
}

export function hasAllPermissions(permissions, keys) {
  if (!Array.isArray(keys) || keys.length === 0) return true;
  return keys.every((k) => hasPermission(permissions, k));
}

export function filterByPermission(items, permissions) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (item.permission && !hasPermission(permissions, item.permission)) {
        return null;
      }
      if (Array.isArray(item.children)) {
        const filteredChildren = filterByPermission(
          item.children,
          permissions
        );
        if (filteredChildren.length === 0 && item.children.length > 0) {
          return null;
        }
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| PERMISSION STORE (zustand)
|--------------------------------------------------------------------------
*/

export const usePermissionStore = create((set, get) => ({
  permissions: [],
  isLoading: false,
  error: null,
  loaded: false,

  getPermissions: async ({ force = false } = {}) => {
    if (get().loaded && !force) {
      return { success: true, data: { permissions: get().permissions } };
    }

    set({ isLoading: true, error: null });
    try {
      const res = await permissionService.getPermissions();
      set({
        permissions: res.data.permissions || [],
        isLoading: false,
        loaded: true,
      });
      return { success: true, data: res };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load permissions";
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  getPermissionByKey: (key) =>
    get().permissions.find((p) => p.key === key) || null,

  getGroupedPermissions: () => {
    const map = new Map();
    for (const p of get().permissions) {
      const resource = p.resource || "general";
      if (!map.has(resource)) map.set(resource, []);
      map.get(resource).push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      permissions: [],
      isLoading: false,
      error: null,
      loaded: false,
    }),
}));

export default usePermissionStore;