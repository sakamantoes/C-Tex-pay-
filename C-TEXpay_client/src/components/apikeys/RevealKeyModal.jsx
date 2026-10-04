import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApiKeyStore } from "../../store/apiKey.store";

export default function RevealKeyModal({ open, apiKey, onClose }) {
  const { revealApiKey, revealLoading, revealedKey, clearRevealedKey, clearError } =
    useApiKeyStore();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 new
  const [localError, setLocalError] = useState("");
  const [copied, setCopied] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (!open) return;
    setPassword("");
    setShowPassword(false);
    setLocalError("");
    setCopied(false);
    clearError();
    clearRevealedKey();
  }, [open, clearError, clearRevealedKey]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    clearRevealedKey();
    onClose();
  };

  const handleReveal = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (!password) return setLocalError("Password is required");

    const res = await revealApiKey(apiKey.id, password);
    if (!res.success && res.message) setLocalError(res.message);
    else setPassword("");
  };

  const handleCopy = async () => {
    if (!revealedKey?.key) return;
    try {
      await navigator.clipboard.writeText(revealedKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-ctex-border px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ctex-text">
                  Reveal Your C-Tex pay API key
                </h2>
                {apiKey?.name && (
                  <p className="mt-0.5 truncate text-xs text-ctex-text-muted">
                    {apiKey.name} · {apiKey.environment}
                  </p>
                )}
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

            {/* Body */}
            <div className="space-y-4 p-5">
              {revealedKey ? (
                <>
                  {/* Revealed key display */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-xs font-semibold text-amber-500">
                      Copy this key now
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-ctex-text">
                      {revealedKey.key}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-ctex-border bg-ctex-surface px-3 py-2 text-xs font-medium text-ctex-text transition hover:bg-ctex-elevated"
                    >
                      {copied ? "Copied!" : "Copy key"}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-xl bg-ctex-blue px-4 py-2 text-xs font-semibold text-white transition hover:bg-ctex-blue-light"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleReveal} className="space-y-4">
                  <p className="text-sm text-ctex-text-muted">
                    For your security, re-enter your account password to
                    reveal this API key.
                  </p>

                  {/* Password field with show/hide toggle */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                      Password
                    </label>

                    <div
                      className={[
                        "group relative flex items-center rounded-xl border bg-ctex-elevated/60 transition-all duration-200",
                        "border-ctex-border",
                        "focus-within:border-ctex-blue focus-within:ring-2 focus-within:ring-ctex-blue/20",
                        localError ? "border-red-500/70 ring-2 ring-red-500/15" : "",
                      ].join(" ")}
                    >
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (localError) setLocalError("");
                        }}
                        autoFocus
                        autoComplete="current-password"
                        className="h-11 w-full rounded-xl bg-transparent pl-3.5 pr-11 text-sm text-ctex-text outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-ctex-text-muted transition hover:bg-ctex-border/40 hover:text-ctex-text"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {localError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500"
                    >
                      {localError}
                    </motion.div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-xl border border-ctex-border bg-ctex-surface px-4 py-2 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={revealLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-ctex-blue px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {revealLoading && (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      )}
                      Reveal
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------------------
| ICONS
--------------------------------------------------------------------------- */

function EyeIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a18.77 18.77 0 0 1 4.06-5.06" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.77 18.77 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}