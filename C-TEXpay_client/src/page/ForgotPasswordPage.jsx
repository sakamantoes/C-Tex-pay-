import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/auth.store";
import AuthLayout from "../components/auth/AuthLayout";
import TextField from "../components/auth/TextField";
import PrimaryButton from "../components/auth/PrimaryButton";

export default function ForgotPasswordPage() {
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState("");
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (localError) setLocalError("");
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!email.trim()) return setLocalError("Email is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setLocalError("Please provide a valid email address");

    const res = await forgotPassword(email.trim().toLowerCase());

    // Backend always returns 200 to prevent enumeration
    if (res.success) setSent(true);
  };

  const displayError = localError || error;

  return (
    <AuthLayout
      title={sent ? "Check your inbox" : "Forgot your password?"}
      subtitle={
        sent
          ? "We've sent a password reset link to your email."
          : "Enter your email and we'll send you a reset link."
      }
      footer={
        <>
          Remember your password?{" "}
          <Link
            to="/login"
            className="font-medium text-ctex-blue hover:text-ctex-blue-light hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5 text-center"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-ctex-blue/10 text-ctex-blue"
            >
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-3xl border border-ctex-blue/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0, 0.7] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <MailIcon className="h-9 w-9" />
            </motion.div>

            <div>
              <p className="text-sm text-ctex-text-muted">
                A reset link was sent to
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-ctex-text">
                {email}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-600 dark:text-amber-400">
              The link expires in <strong>15 minutes</strong>. Check your spam
              folder if you don&apos;t see it.
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-ctex-border bg-ctex-surface text-sm font-medium text-ctex-text transition hover:border-ctex-blue/50 hover:bg-ctex-elevated"
              >
                Send again
              </button>

              <Link
                to="/login"
                className="text-xs font-medium text-ctex-text-muted transition hover:text-ctex-blue hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            <TextField
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={handleChange}
              icon={<MailIcon className="h-4 w-4" />}
              required
            />

            <AnimatePresence>
              {displayError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500"
                >
                  {displayError}
                </motion.div>
              )}
            </AnimatePresence>

            <PrimaryButton loading={isLoading}>
              {isLoading ? "Sending link…" : "Send reset link"}
            </PrimaryButton>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}

/* -------------------------------- Icons -------------------------------- */

function MailIcon({ className }) {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}