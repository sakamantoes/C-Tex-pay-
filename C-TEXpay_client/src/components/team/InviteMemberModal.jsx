import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function InviteMemberModal({
  open,
  onClose,
  onInvite,
  isInviting,
  roles = [],
  rolesLoading = false,
}) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [localError, setLocalError] = useState("");

  const handleClose = useCallback(() => {
    setEmail("");
    setRoleId("");
    setLocalError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isInviting) handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInviting, open, handleClose]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setLocalError("Email is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setLocalError("Enter a valid email address.");
      return;
    }

    if (!roleId) {
      setLocalError("Select a role for this team member.");
      return;
    }

    const result = await onInvite({ email: normalizedEmail, roleId });
    if (!result.success) {
      setLocalError(result.message || "Unable to send invitation.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="invite-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => !isInviting && handleClose()}
        >
          <motion.div
            key="invite-panel"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-ctex-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ctex-text">
                  Invite team member
                </h2>
                <p className="mt-0.5 text-xs text-ctex-text-muted">
                  They will receive an invitation to join your merchant.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isInviting}
                className="rounded-lg p-1.5 text-ctex-text-muted transition hover:bg-ctex-elevated hover:text-ctex-text disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close invitation dialog"
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
              <div>
                <label
                  htmlFor="member-email"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted"
                >
                  Email address
                </label>
                <input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (localError) setLocalError("");
                  }}
                  placeholder="colleague@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none transition placeholder:text-ctex-text-muted/60 focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
                />
              </div>

              <div>
                <label
                  htmlFor="member-role"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted"
                >
                  Role
                </label>
                {rolesLoading ? (
                  <div className="h-11 animate-pulse rounded-xl bg-ctex-elevated" />
                ) : roles.length === 0 ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-500">
                    No roles are available. Create a role before inviting a member.
                  </div>
                ) : (
                  <select
                    id="member-role"
                    value={roleId}
                    onChange={(event) => {
                      setRoleId(event.target.value);
                      if (localError) setLocalError("");
                    }}
                    required
                    className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none transition focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}{role.isSystemRole ? " (system role)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {localError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500">
                  {localError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isInviting}
                  className="rounded-xl border border-ctex-border bg-ctex-surface px-4 py-2 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting || rolesLoading || roles.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-ctex-blue px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isInviting && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  Send invitation
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
