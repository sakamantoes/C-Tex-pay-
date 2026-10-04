import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmActionModal({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary", // "primary" | "danger"
  isProcessing,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  const toneStyles = {
    primary: {
      button:
        "bg-ctex-blue text-white hover:bg-ctex-blue-light shadow-lg shadow-ctex-blue/25",
      icon: "bg-ctex-blue/10 text-ctex-blue",
    },
    danger: {
      button:
        "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25",
      icon: "bg-red-500/10 text-red-500",
    },
  }[tone];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-2xl"
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                    toneStyles.icon,
                  ].join(" ")}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M10.3 3.7 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-ctex-text">
                    {title}
                  </h3>
                  {description && (
                    <p className="mt-1 text-sm text-ctex-text-muted">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-ctex-border bg-ctex-elevated/40 px-5 py-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="rounded-xl border border-ctex-border bg-ctex-surface px-4 py-2 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isProcessing}
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
                  toneStyles.button,
                ].join(" ")}
              >
                {isProcessing && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}