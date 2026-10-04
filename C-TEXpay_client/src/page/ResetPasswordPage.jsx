import { useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/auth.store";
import AuthLayout from "../components/auth/AuthLayout";
import TextField from "../components/auth/TextField";
import PrimaryButton from "../components/auth/PrimaryButton";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  const token = searchParams.get("token");

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [localError, setLocalError] = useState("");

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (localError) setLocalError("");
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!form.password || form.password.length < 8)
      return setLocalError("Password must be at least 8 characters long");

    if (form.password !== form.confirmPassword)
      return setLocalError("Passwords do not match");

    const res = await resetPassword({
      token,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });

    if (res.success) {
      navigate("/login", {
        state: { reset: true },
        replace: true,
      });
    }
  };

  // No token → block page entirely
  if (!token) {
    return <Navigate to="/forgot-password" replace />;
  }

  const displayError = localError || error;
  const strength = useMemo(() => getStrength(form.password), [form.password]);

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
      footer={
        <>
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-medium text-ctex-blue hover:text-ctex-blue-light hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label="New password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          required
        />

        {/* Strength meter */}
        <AnimatePresence>
          {form.password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="-mt-2 overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-1.5 flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-full flex-1 rounded-full bg-ctex-border transition-colors"
                      style={{
                        backgroundColor:
                          i < strength.score ? strength.color : undefined,
                      }}
                    />
                  ))}
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: strength.color }}
                >
                  {strength.label}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <TextField
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
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
          {isLoading ? "Resetting password…" : "Reset password"}
        </PrimaryButton>

        <p className="text-center text-[11px] text-ctex-text-muted">
          You&apos;ll be signed out of all devices after resetting.
        </p>
      </form>
    </AuthLayout>
  );
}

/* ------------------------ Password strength helper ------------------------ */

function getStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const map = {
    0: { label: "Weak", color: "#ef4444" },
    1: { label: "Weak", color: "#ef4444" },
    2: { label: "Fair", color: "#f59e0b" },
    3: { label: "Good", color: "#3b82f6" },
    4: { label: "Strong", color: "#10b981" },
  };

  return { score, ...map[score] };
}