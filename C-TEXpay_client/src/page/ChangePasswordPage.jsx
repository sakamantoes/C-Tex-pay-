import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/auth.store";
import AuthLayout from "../components/auth/AuthLayout";
import TextField from "../components/auth/TextField";
import PrimaryButton from "../components/auth/PrimaryButton";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
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

    if (!form.currentPassword)
      return setLocalError("Current password is required");

    if (!form.newPassword || form.newPassword.length < 8)
      return setLocalError("New password must be at least 8 characters long");

    if (form.newPassword !== form.confirmPassword)
      return setLocalError("New passwords do not match");

    if (form.currentPassword === form.newPassword)
      return setLocalError(
        "New password must be different from your current password"
      );

    const res = await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword,
    });

    if (res.success) {
      // Store already cleared auth; redirect to login with banner
      navigate("/login", {
        state: { passwordChanged: true },
        replace: true,
      });
    }
  };

  const displayError = localError || error;
  const strength = useMemo(
    () => getStrength(form.newPassword),
    [form.newPassword]
  );

  return (
    <AuthLayout
      title="Change your password"
      subtitle="For security, you'll be signed out of all devices."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label="Current password"
          name="currentPassword"
          type="password"
          placeholder="Enter current password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={handleChange}
          required
        />

        <TextField
          label="New password"
          name="newPassword"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={handleChange}
          required
        />

        <AnimatePresence>
          {form.newPassword && (
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
          placeholder="Re-enter new password"
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
          {isLoading ? "Updating password…" : "Update password"}
        </PrimaryButton>

        <p className="text-center text-[11px] text-ctex-text-muted">
          All active sessions will be revoked after the change.
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