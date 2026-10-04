// src/components/roles/PermissionDrawer.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoleStore } from "../../store/role.store";
import { usePermissionStore } from "../../store/permission.store";

const getEntityId = (entity) =>
  entity?.id ?? entity?.permissionId ?? entity?.roleId ?? null;

export default function PermissionDrawer({ open, role, canManage, onClose }) {
  const { roles, assignPermission, removePermission } = useRoleStore();
  const {
    permissions: allPermissions,
    isLoading: permissionsLoading,
    error: permissionsError,
    getPermissions,
  } = usePermissionStore();

  const liveRole = useMemo(
    () => {
      const roleId = getEntityId(role);
      return roles.find((r) => getEntityId(r) === roleId) || role;
    },
    [roles, role]
  );

  const [search, setSearch] = useState("");
  const [busyPermissionId, setBusyPermissionId] = useState(null);
  const [localError, setLocalError] = useState("");

  const handleClose = useCallback(() => {
    setSearch("");
    setLocalError("");
    setBusyPermissionId(null);
    onClose();
  }, [onClose]);

  // Fetch catalogue once on first open
  useEffect(() => {
    if (!open) return;
    getPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const roleId = getEntityId(liveRole);
  const assignedIds = new Set(
    (liveRole?.permissions || [])
      .map(getEntityId)
      .filter(Boolean)
      .map(String)
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPermissions;
    return allPermissions.filter(
      (p) =>
        p.key.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.resource?.toLowerCase().includes(q)
    );
  }, [allPermissions, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of filtered) {
      const key = p.resource || "general";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [filtered]);

  const isSystem = liveRole?.isSystemRole;
  const canToggle = canManage && !isSystem;

  if (!open) return null;

  const handleToggle = async (permission) => {
    if (!canToggle) return;
    setLocalError("");
    const permissionId = getEntityId(permission);

    if (!roleId || !permissionId) {
      setLocalError("This role or permission is missing a valid ID.");
      return;
    }

    setBusyPermissionId(permissionId);

    const isAssigned = assignedIds.has(String(permissionId));
    const res = isAssigned
      ? await removePermission(roleId, permissionId)
      : await assignPermission(roleId, permissionId);

    setBusyPermissionId(null);

    if (!res.success && res.message) setLocalError(res.message);
  };

  // ... rest of the JSX stays identical to before, but:
  // - In the list area, show loader while `permissionsLoading`
  // - Show `permissionsError` if it exists
  // - The footer count uses `allPermissions.length` (now real)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-ctex-border bg-ctex-surface shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-ctex-border px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-ctex-text">
                  {liveRole?.name || "Role"}
                </h2>
                <p className="mt-0.5 text-xs text-ctex-text-muted">
                  {canToggle
                    ? "Toggle permissions for this role"
                    : isSystem
                    ? "System role — permissions are fixed"
                    : "Read-only view"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-ctex-text-muted transition hover:bg-ctex-elevated hover:text-ctex-text"
                aria-label="Close"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-ctex-border px-5 py-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permissions…"
                className="h-10 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text placeholder:text-ctex-text-muted/60 outline-none transition focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
              />
            </div>

            {/* Errors */}
            {(localError || permissionsError) && (
              <div className="px-5 pt-3">
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500">
                  {localError || permissionsError}
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {permissionsLoading && allPermissions.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-xl bg-ctex-elevated"
                    />
                  ))}
                </div>
              ) : grouped.length === 0 ? (
                <p className="py-8 text-center text-xs text-ctex-text-muted">
                  No permissions match your search.
                </p>
              ) : (
                <div className="space-y-5">
                  {grouped.map(([resource, perms]) => (
                    <div key={resource}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ctex-text-muted">
                        {resource}
                      </p>
                      <div className="space-y-1.5">
                        {perms.map((permission) => (
                          <PermissionRow
                            key={permission.id}
                            permission={permission}
                            assigned={assignedIds.has(String(getEntityId(permission)))}
                            busy={busyPermissionId === getEntityId(permission)}
                            disabled={!canToggle}
                            onToggle={() => handleToggle(permission)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-ctex-border bg-ctex-elevated/40 px-5 py-3">
              <div className="flex items-center justify-between text-xs text-ctex-text-muted">
                <span>
                  <strong className="text-ctex-text">
                    {assignedIds.size}
                  </strong>{" "}
                  / {allPermissions.length} assigned
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-ctex-border bg-ctex-surface px-3 py-1.5 font-medium text-ctex-text transition hover:bg-ctex-elevated"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/*
|--------------------------------------------------------------------------
| PERMISSION ROW (unchanged)
|--------------------------------------------------------------------------
*/
function PermissionRow({ permission, assigned, busy, disabled, onToggle }) {
  return (
    <div
      className={[
        "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition",
        assigned
          ? "border-ctex-blue/40 bg-ctex-blue/5"
          : "border-ctex-border bg-ctex-elevated/40",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ctex-text">
          {permission.name || permission.key}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-mono text-ctex-text-muted">
          {permission.key}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled || busy}
        onClick={onToggle}
        className={[
          "relative flex h-6 w-11 shrink-0 items-center rounded-full transition",
          assigned ? "bg-ctex-blue" : "bg-ctex-border",
          disabled || busy ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
        aria-pressed={assigned}
        aria-label={`${assigned ? "Remove" : "Assign"} ${permission.key}`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow",
            assigned ? "left-[calc(100%-1.375rem)]" : "left-0.5",
          ].join(" ")}
        />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
          </span>
        )}
      </button>
    </div>
  );
}