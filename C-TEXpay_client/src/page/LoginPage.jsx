import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useAuthStore } from "../store/auth.store";
import { getDashboardPath } from "../utils/role";
import AuthLayout from "../components/auth/AuthLayout";
import TextField from "../components/auth/TextField";
import PrimaryButton from "../components/auth/PrimaryButton";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [localError, setLocalError] = useState("");

  // Read one-shot state flags passed by other flows
  const justVerified = location.state?.verified;
  const justReset = location.state?.reset;
  const justChanged = location.state?.passwordChanged;

  // Safe redirect (only allow internal paths)
  const requestedRedirect = new URLSearchParams(location.search).get(
    "redirect"
  );
  const redirectTo =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : null;

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (localError) setLocalError("");
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!form.email.trim()) return setLocalError("Email is required");
    if (!form.password) return setLocalError("Password is required");

    const email = form.email.trim().toLowerCase();

    const res = await login({ email, password: form.password });

    /*
    |--------------------------------------------------------------------------
    | Success — navigate to dashboard (or requested redirect)
    |--------------------------------------------------------------------------
    */
    if (res.success) {
      const nextUser = res?.data?.user || useAuthStore.getState().user;
      toast.success("Login successful. Redirecting to your dashboard.");
      navigate(redirectTo || getDashboardPath(nextUser), { replace: true });
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Unverified email — route into the resend-verification flow
    |--------------------------------------------------------------------------
    */
    if (res.requiresEmailVerification) {
      const targetEmail = res.email || email;
      toast.info("Please verify your email to continue.");
      navigate(
        `/verify-email-sent?email=${encodeURIComponent(targetEmail)}`,
        { replace: true }
      );
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Any other failure — surface the message
    |--------------------------------------------------------------------------
    */
    toast.error(res.message || "Login failed. Please try again.");
  };

  const displayError = localError || error;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your C-TEX PAY dashboard."
      footer={
        <>
          New to C-TEX PAY?{" "}
          <Link
            to="/signup"
            className="font-medium text-ctex-blue hover:text-ctex-blue-light hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      {/* One-shot banners from other flows */}
      <AnimatePresence>
        {justVerified && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <Banner type="success">
              ✅ Email verified successfully. You can now sign in.
            </Banner>
          </motion.div>
        )}

        {justReset && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <Banner type="success">
              ✅ Password reset successfully. Please sign in with your new
              password.
            </Banner>
          </motion.div>
        )}

        {justChanged && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <Banner type="success">
              ✅ Password changed. Please sign in again.
            </Banner>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          icon={<MailIcon className="h-4 w-4" />}
          required
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          icon={<LockIcon className="h-4 w-4" />}
          required
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-ctex-text-muted transition hover:text-ctex-blue"
          >
            Forgot password?
          </Link>
        </div>

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
          {isLoading ? "Signing in…" : "Sign in"}
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}

/* --------------------------------------------------------------------------
   Banner Component
   -------------------------------------------------------------------------- */

function Banner({ type = "info", children }) {
  const styles = {
    success:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    error: "border-red-500/30 bg-red-500/10 text-red-500",
    info: "border-ctex-blue/30 bg-ctex-blue/10 text-ctex-blue",
    warning:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div
      className={[
        "rounded-xl border px-3.5 py-2.5 text-xs",
        styles[type] || styles.info,
      ].join(" ")}
      role="status"
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Icons
   -------------------------------------------------------------------------- */

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

function LockIcon({ className }) {
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
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}