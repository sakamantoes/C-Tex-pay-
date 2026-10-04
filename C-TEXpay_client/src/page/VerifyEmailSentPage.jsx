import { Link, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import AuthLayout from "../components/auth/AuthLayout";
import { useAuthStore } from "../store/auth.store";

export default function VerifyEmailSentPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Read email from either router state (from register redirect)
  // or query string (?email=...) for direct visits / reloads.
  const routeEmail = location.state?.email || searchParams.get("email") || "";
  const hasRouteEmail = Boolean(routeEmail);

  const { resendVerification, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState(routeEmail);
  const [resendSuccess, setResendSuccess] = useState(false);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleResend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailValid) {
      return;
    }

    clearError();
    setResendSuccess(false);
    const res = await resendVerification(normalizedEmail);
    if (res.success) {
      setResendSuccess(true);
      // auto-hide success after 4s
      setTimeout(() => setResendSuccess(false), 4000);
    }
  };

  return (
    <AuthLayout
      title="Check your inbox"
      subtitle="We sent you a verification link to confirm your email address."
      footer={
        <>
          Wrong email?{" "}
          <Link
            to="/signup"
            className="font-medium text-ctex-blue hover:text-ctex-blue-light hover:underline"
          >
            Try again
          </Link>
        </>
      }
    >
      <div className="space-y-5 text-center">
        {/* Animated icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-ctex-blue/10 text-ctex-blue"
        >
          {/* pulse ring */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-3xl border border-ctex-blue/30"
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
          <MailOpenIcon className="h-9 w-9" />
        </motion.div>

        {/* Email display / recovery input */}
        <div className="w-full">
          <p className="text-sm text-ctex-text-muted">
            {hasRouteEmail
              ? "A verification link was sent to"
              : "Enter the email address you used to create your account."}
          </p>
          {hasRouteEmail ? (
            <p className="mt-1 break-all text-sm font-semibold text-ctex-text">
              {email}
            </p>
          ) : (
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-3 h-11 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none transition placeholder:text-ctex-text-muted/60 focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
            />
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-xl border border-ctex-border bg-ctex-elevated/60 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-ctex-text-muted">
            Next steps
          </p>
          <ul className="mt-2 space-y-2 text-xs text-ctex-text-muted">
            <Step icon="1">Open your email inbox</Step>
            <Step icon="2">Click the "Verify Email" button</Step>
            <Step icon="3">You'll be redirected to sign in</Step>
          </ul>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-600 dark:text-amber-400">
          The link expires in <strong>30 minutes</strong>. Don&apos;t forget to
          check your spam or promotions folder.
        </div>

        {/* Feedback banners */}
        {resendSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-600 dark:text-emerald-400"
          >
            ✅ A new verification link has been sent.
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500"
          >
            {error}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleResend}
            disabled={isLoading || !isEmailValid}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface text-sm font-medium text-ctex-text transition hover:border-ctex-blue/50 hover:bg-ctex-elevated disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ctex-blue/30 border-t-ctex-blue" />
                Sending…
              </>
            ) : (
              <>Resend verification email</>
            )}
          </button>

          <Link
            to="/login"
            className="text-xs font-medium text-ctex-text-muted transition hover:text-ctex-blue hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

/* ------------------------------ Sub Components ------------------------------ */

function Step({ icon, children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-ctex-blue/15 text-[9px] font-bold text-ctex-blue">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

/* --------------------------------- Icons --------------------------------- */

function MailOpenIcon({ className }) {
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
      <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
      <path d="m22 10-8.97 5.7a2 2 0 0 1-2.06 0L2 10" />
    </svg>
  );
}
