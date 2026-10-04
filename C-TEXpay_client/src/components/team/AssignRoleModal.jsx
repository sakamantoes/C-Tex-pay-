import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AssignRoleModal({
  open,
  member,
  roles,
  rolesLoading,
  canReadRoles,
  onClose,
  onAssign,
  isSaving,
}) {
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [localError, setLocalError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Reset on open
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (!open) return;
    setSelectedRoleId("");
    setLocalError("");
  }, [open]);

  /*
  |--------------------------------------------------------------------------
  | Escape key
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /*
  |--------------------------------------------------------------------------
  | Filter out roles the member already has
  |--------------------------------------------------------------------------
  */
  const existingRoleIds = useMemo(
    () => new Set((member?.roles || []).map((r) => r.id)),
    [member]
  );

// Inside AssignRoleModal
const availableRoles = useMemo(
  () => (roles || []).filter((r) => !existingRoleIds.has(r.id)),
  // 👆 no `!r.isSystemRole` filter — OWNER must be selectable
  [roles, existingRoleIds]
);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!selectedRoleId) {
      return setLocalError("Please select a role");
    }

    const res = await onAssign(selectedRoleId);
    if (!res.success && res.message) {
      setLocalError(res.message);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-ctex-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ctex-text">
                  Assign role
                </h2>
                {member?.user && (
                  <p className="text-xs text-ctex-text-muted">
                    {member.user.firstName} {member.user.lastName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
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

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {!canReadRoles ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-500">
                  You don't have permission to view roles. Ask an owner to
                  assign roles for you.
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                      Select role
                    </label>

                    {rolesLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-12 animate-pulse rounded-xl bg-ctex-elevated"
                          />
                        ))}
                      </div>
                    ) : availableRoles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-ctex-border px-3.5 py-4 text-center text-xs text-ctex-text-muted">
                        This member already has all available roles.
                      </div>
                    ) : (
                      <div className="max-h-64 space-y-2 overflow-y-auto">
                        {availableRoles.map((role) => {
                          const active = selectedRoleId === role.id;
                          return (
                            <button
                              type="button"
                              key={role.id}
                              onClick={() => {
                                setSelectedRoleId(role.id);
                                setLocalError("");
                              }}
                              className={[
                                "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                                active
                                  ? "border-ctex-blue bg-ctex-blue/10"
                                  : "border-ctex-border bg-ctex-elevated/60 hover:border-ctex-blue/40",
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border",
                                  active
                                    ? "border-ctex-blue bg-ctex-blue"
                                    : "border-ctex-border bg-transparent",
                                ].join(" ")}
                              >
                                {active && (
                                  <svg
                                    className="h-2.5 w-2.5 text-white"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                )}
                              </span>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-sm font-medium text-ctex-text">
                                    {role.name}
                                  </p>
                                  {role.isSystemRole && (
                                    <span className="rounded-full bg-ctex-blue/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ctex-blue">
                                      System
                                    </span>
                                  )}
                                </div>
                                {role.description && (
                                  <p className="mt-0.5 truncate text-xs text-ctex-text-muted">
                                    {role.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {localError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500"
                      >
                        {localError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-ctex-border bg-ctex-surface px-4 py-2 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSaving || !canReadRoles || availableRoles.length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-ctex-blue px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  Assign role
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}