import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { useApiKeyStore } from "../../store/apiKey.store";

/* --------------------------------------------------------------------------
   BRAND TONES (shared with MerchantDashboard)
   -------------------------------------------------------------------------- */
const TONES = {
  blue: {
    background: "linear-gradient(135deg,#2f95de,#0B68AD)",
    boxShadow: "0 10px 22px -10px #0B68AD",
  },
  green: {
    background: "linear-gradient(135deg,#22C55E,#15803D)",
    boxShadow: "0 10px 22px -10px #15803D",
  },
  orange: {
    background: "linear-gradient(135deg,#FBBF24,#EA580C)",
    boxShadow: "0 10px 22px -10px #EA580C",
  },
  oxblood: {
    background: "linear-gradient(135deg,#9F1239,#4C0519)",
    boxShadow: "0 10px 22px -10px #7F1D1D",
  },
};

/* =========================================================
 * MODAL
 * ======================================================= */
export default function RevealKeyModal({ open, apiKey, onClose }) {
  const {
    revealApiKey,
    revealLoading,
    revealedKey,
    clearRevealedKey,
    clearError,
  } = useApiKeyStore();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleClose = useCallback(() => {
    setPassword("");
    setShowPassword(false);
    setLocalError("");
    setCopied(false);
    clearError();
    clearRevealedKey();
    onClose();
  }, [clearError, clearRevealedKey, onClose]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

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
      setLocalError("");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLocalError(
        "Clipboard access failed. Select and copy the key manually."
      );
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-[24px] border border-ctex-border bg-ctex-surface shadow-2xl sm:rounded-[28px]"
          >
            {/* ─── HEADER ─────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3 border-b border-ctex-border px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={TONES.orange}
                >
                  <KeyRound className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ctex-text-muted">
                    Reveal API key
                  </p>
                  <h2 className="mt-0.5 truncate text-base font-semibold text-ctex-text">
                    {apiKey?.name || "Secret key"}
                  </h2>
                  {apiKey?.environment && (
                    <p className="mt-0.5 truncate text-xs text-ctex-text-muted">
                      {apiKey.environment} · Stored securely
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-1.5 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ─── BODY ───────────────────────────────────── */}
            <div className="space-y-4 p-4 sm:p-5">
              {revealedKey ? (
                <>
                  {/* Revealed key display */}
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        !
                      </span>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Copy this key now
                      </p>
                    </div>
                    <p className="mt-2 break-all rounded-lg bg-ctex-surface/50 px-3 py-2 font-mono text-xs text-ctex-text">
                      {revealedKey.key}
                    </p>
                  </div>

                  {localError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500">
                      {localError}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={[
                        "inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-medium transition sm:py-2",
                        copied
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                          : "border-ctex-border bg-ctex-surface text-ctex-text hover:bg-ctex-panel",
                      ].join(" ")}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy key
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="inline-flex items-center justify-center rounded-full bg-ctex-accent px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-ctex-accent/25 transition hover:brightness-110 sm:py-2"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleReveal} className="space-y-4">
                  <div className="flex items-start gap-2 rounded-2xl bg-ctex-panel/60 p-3 text-xs text-ctex-text-muted">
                    <Lock
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ctex-accent"
                      aria-hidden="true"
                    />
                    <p>
                      For your security, re-enter your account password to
                      reveal this API key.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                      Password
                    </label>

                    <div
                      className={[
                        "group relative flex items-center rounded-xl border bg-ctex-panel/60 transition-all duration-200",
                        "border-ctex-border",
                        "focus-within:border-ctex-accent focus-within:ring-2 focus-within:ring-ctex-accent/20",
                        localError
                          ? "border-red-500/70 ring-2 ring-red-500/15"
                          : "",
                      ].join(" ")}
                    >
                      <Lock
                        className="pointer-events-none absolute left-3 h-4 w-4 text-ctex-text-muted"
                        aria-hidden="true"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (localError) setLocalError("");
                        }}
                        autoFocus
                        autoComplete="current-password"
                        className="h-11 w-full rounded-xl bg-transparent pl-10 pr-11 text-sm text-ctex-text outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        tabIndex={-1}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-ctex-text-muted transition hover:bg-ctex-border/40 hover:text-ctex-text"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {localError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500"
                    >
                      <AlertCircle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <p>{localError}</p>
                    </motion.div>
                  )}

                  <div className="flex flex-col gap-2 border-t border-ctex-border pt-4 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="order-2 inline-flex items-center justify-center rounded-full border border-ctex-border bg-ctex-surface px-4 py-2.5 text-sm font-medium text-ctex-text transition hover:bg-ctex-panel sm:order-1 sm:py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={revealLoading}
                      className="order-1 inline-flex items-center justify-center gap-2 rounded-full bg-ctex-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-accent/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:order-2 sm:py-2"
                    >
                      {revealLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Revealing…
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Reveal key
                        </>
                      )}
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