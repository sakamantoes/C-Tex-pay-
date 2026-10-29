// src/components/roles/PermissionDrawer.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRoleStore } from "../../store/role.store";
import { usePermissionStore } from "../../store/permission.store";

/* --------------------------------------------------------------------------
   BRAND TONES (shared with MerchantDashboard & other pages)
   -------------------------------------------------------------------------- */
const TONES = {
  blue: "linear-gradient(135deg,#2f95de,#0B68AD)",
  green: "linear-gradient(135deg,#22C55E,#15803D)",
  orange: "linear-gradient(135deg,#FBBF24,#EA580C)",
  oxblood: "linear-gradient(135deg,#9F1239,#4C0519)",
};

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

  const liveRole = useMemo(() => {
    const roleId = getEntityId(role);
    return roles.find((r) => getEntityId(r) === roleId) || role;
  }, [roles, role]);

  const [search, setSearch] = useState("");
  const [busyPermissionId, setBusyPermissionId] = useState(null);
  const [localError, setLocalError] = useState("");

  const handleClose = useCallback(() => {
    setSearch("");
    setLocalError("");
    setBusyPermissionId(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    getPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const roleId = getEntityId(liveRole);
  const assignedIds = useMemo(
    () =>
      new Set(
        (liveRole?.permissions || [])
          .map(getEntityId)
          .filter(Boolean)
          .map(String)
      ),
    [liveRole]
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
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
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

  const totalCount = allPermissions.length;
  const assignedCount = assignedIds.size;
  const assignedPct = totalCount > 0 ? (assignedCount / totalCount) * 100 : 0;

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
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="permission-drawer-title"
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 top-auto z-50 flex max-h-[88vh] flex-col rounded-t-[28px] border border-ctex-border bg-ctex-surface shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-[28px] sm:border-l sm:border-t-0"
          >
            {/* Mobile grabber */}
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-ctex-border sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-ctex-border px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{
                    background: isSystem ? TONES.oxblood : TONES.blue,
                    boxShadow: "0 10px 22px -10px #0B68AD",
                  }}
                >
                  {isSystem ? (
                    <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
                  ) : (
                    <KeyRound className="h-5 w-5" strokeWidth={2.2} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ctex-text-muted">
                    {isSystem ? "System role" : "Role permissions"}
                  </p>
                  <h2
                    id="permission-drawer-title"
                    className="mt-0.5 truncate text-base font-semibold text-ctex-text"
                  >
                    {liveRole?.name || "Role"}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-ctex-text-muted">
                    {canToggle
                      ? "Toggle what this role can do"
                      : isSystem
                      ? "System role — permissions are fixed"
                      : "Read-only view"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-1.5 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                aria-label="Close permissions"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="border-b border-ctex-border px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between text-[11px] text-ctex-text-muted">
                <span>
                  <strong className="text-ctex-text">{assignedCount}</strong> of{" "}
                  {totalCount} granted
                </span>
                <span className="tabular-nums">
                  {Math.round(assignedPct)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ctex-panel">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${assignedPct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full rounded-full bg-ctex-accent"
                />
              </div>
            </div>

            {/* Search */}
            <div className="border-b border-ctex-border px-4 py-3 sm:px-5">
              <label className="relative flex items-center gap-2 rounded-xl border border-ctex-border bg-ctex-panel/60 px-3 py-2.5 text-sm text-ctex-text-muted">
                <Search size={15} className="shrink-0" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search permissions…"
                  className="w-full bg-transparent text-sm text-ctex-text placeholder:text-ctex-text-muted/60 outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="rounded-full p-0.5 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>
            </div>

            {/* Errors */}
            <AnimatePresence>
              {(localError || permissionsError) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-4 pt-3 sm:px-5"
                >
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500">
                    {localError || permissionsError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
              {permissionsLoading && allPermissions.length === 0 ? (
                <div className="space-y-3 px-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-2xl bg-ctex-panel"
                    />
                  ))}
                </div>
              ) : grouped.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                    style={{ background: TONES.orange }}
                  >
                    <Search className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <p className="text-sm font-medium text-ctex-text">
                    No permissions match
                  </p>
                  <p className="max-w-xs text-xs text-ctex-text-muted">
                    Try adjusting your search or clear the field.
                  </p>
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="mt-1 rounded-full bg-ctex-accent px-3 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {grouped.map(([resource, perms]) => {
                    const groupAssigned = perms.filter((p) =>
                      assignedIds.has(String(getEntityId(p)))
                    ).length;

                    return (
                      <div key={resource}>
                        <div className="mb-2 flex items-center justify-between px-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctex-text-muted">
                            {resource}
                          </p>
                          <span className="text-[10px] tabular-nums text-ctex-text-muted">
                            {groupAssigned}/{perms.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {perms.map((permission) => (
                            <PermissionRow
                              key={getEntityId(permission)}
                              permission={permission}
                              assigned={assignedIds.has(
                                String(getEntityId(permission))
                              )}
                              busy={
                                busyPermissionId === getEntityId(permission)
                              }
                              disabled={!canToggle}
                              onToggle={() => handleToggle(permission)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-ctex-border bg-ctex-panel/40 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-full bg-ctex-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-accent/50"
              >
                Done
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------------------------------------------------
   PERMISSION ROW
   -------------------------------------------------------------------------- */
function PermissionRow({ permission, assigned, busy, disabled, onToggle }) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition",
        assigned
          ? "border-ctex-accent/40 bg-ctex-accent/5"
          : "border-ctex-border bg-ctex-panel/60 hover:border-ctex-accent/30",
        disabled ? "opacity-80" : "",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold uppercase",
          assigned
            ? "bg-ctex-accent/15 text-ctex-accent"
            : "bg-ctex-panel text-ctex-text-muted",
        ].join(" ")}
        aria-hidden="true"
      >
        {assigned ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : (
          permission.action?.slice(0, 1).toUpperCase() || "P"
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ctex-text">
          {permission.name || permission.key}
        </p>
        <p className="truncate font-mono text-[10px] text-ctex-text-muted">
          {permission.key}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled || busy}
        onClick={onToggle}
        className={[
          "relative flex h-6 w-11 shrink-0 items-center rounded-full transition",
          assigned ? "bg-ctex-accent" : "bg-ctex-border",
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
            <Loader2 className="h-3 w-3 animate-spin text-white" />
          </span>
        )}
      </button>
    </div>
  );
}