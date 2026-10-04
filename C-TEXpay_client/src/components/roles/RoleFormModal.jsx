import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EMPTY = { name: "", description: "" };

export default function RoleFormModal({
  open,
  role,
  onClose,
  onSubmit,
  isSaving,
}) {
  const isEdit = !!role;
  const [form, setForm] = useState(EMPTY);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setForm({
        name: role.name || "",
        description: role.description || "",
      });
    } else {
      setForm(EMPTY);
    }
    setLocalError("");
  }, [open, isEdit, role]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (localError) setLocalError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!form.name.trim() || form.name.trim().length < 2) {
      return setLocalError("Role name must be at least 2 characters");
    }

    const payload = {
      name: form.name.trim(),
    };
    if (form.description.trim()) payload.description = form.description.trim();

    await onSubmit(payload);
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
              <h2 className="text-base font-semibold text-ctex-text">
                {isEdit ? "Edit role" : "Create role"}
              </h2>
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
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                  Role name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Cashier, Manager, Support"
                  maxLength={100}
                  required
                  className="h-10 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none transition placeholder:text-ctex-text-muted/60 focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="What can this role do?"
                  className="w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 py-2 text-sm text-ctex-text outline-none transition placeholder:text-ctex-text-muted/60 focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
                />
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
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-ctex-blue px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {isEdit ? "Save changes" : "Create role"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}