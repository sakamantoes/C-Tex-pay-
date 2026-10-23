import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CircleAlert } from "lucide-react";
import { toast } from "react-toastify";
import { useAuthStore } from "../store/auth.store";
import AuthLayout from "../components/auth/AuthLayout";
import TextField from "../components/auth/TextField";
import PrimaryButton from "../components/auth/PrimaryButton";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get("invitationToken") || "";
  const invitedEmail = searchParams.get("email") || "";
  const { register, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: invitedEmail,
    phone: "",
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

    if (!form.firstName.trim() || form.firstName.trim().length < 2)
      return setLocalError("First name must be at least 2 characters");

    if (!form.lastName.trim() || form.lastName.trim().length < 2)
      return setLocalError("Last name must be at least 2 characters");

    if (!form.email.trim())
      return setLocalError("Email is required");

    if (!form.password || form.password.length < 8)
      return setLocalError("Password must be at least 8 characters long");

    if (form.password !== form.confirmPassword)
      return setLocalError("Passwords do not match");

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    if (invitationToken) payload.invitationToken = invitationToken;

    if (form.phone.trim()) payload.phone = form.phone.trim();

    const res = await register(payload);

    if (res.success) {
      toast.success("Account created successfully. Verify your email to continue.");
      const query = new URLSearchParams({ email: payload.email });
      if (invitationToken) query.set("invitationToken", invitationToken);
      navigate(`/verify-email-sent?${query.toString()}`);
      return;
    }

    toast.error(res.message || "Registration failed. Please try again.");
  };

  const displayError = localError || error;

  // Simple password strength indicator
  const strength = getStrength(form.password);

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start accepting payments with C-TEX PAY in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to={invitationToken
              ? `/login?redirect=${encodeURIComponent(`/accept-invitation?token=${encodeURIComponent(invitationToken)}`)}`
              : "/login"}
            className="font-medium text-ctex-accent hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            label="First name"
            name="firstName"
            placeholder="Jane"
            autoComplete="given-name"
            value={form.firstName}
            onChange={handleChange}
            required
          />
          <TextField
            label="Last name"
            name="lastName"
            placeholder="Doe"
            autoComplete="family-name"
            value={form.lastName}
            onChange={handleChange}
            required
          />
        </div>

        <TextField
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          readOnly={Boolean(invitationToken)}
          required
        />

        <TextField
          label="Phone (optional)"
          name="phone"
          type="tel"
          placeholder="+234 800 000 0000"
          autoComplete="tel"
          value={form.phone}
          onChange={handleChange}
        />

        <div className="space-y-3">
          <TextField
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {/* Password strength meter */}
          <AnimatePresence>
            {form.password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-1.5 flex-1 gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-full flex-1 rounded-full bg-ctex-border transition-colors duration-300"
                        style={{
                          backgroundColor:
                            i < strength.score
                              ? strength.color
                              : undefined,
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="w-12 text-right text-xs font-medium"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <TextField
          label="Confirm password"
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
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500"
            >
              <CircleAlert className="mt-px h-4 w-4 flex-shrink-0" />
              <span>{displayError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <PrimaryButton loading={isLoading}>
          {isLoading ? "Creating account…" : "Create account"}
        </PrimaryButton>

        <p className="text-xs leading-relaxed text-ctex-text-muted">
          By creating an account, you agree to our{" "}
          <a
            href="/terms"
            className="font-medium text-ctex-text underline-offset-2 hover:text-ctex-accent hover:underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="font-medium text-ctex-text underline-offset-2 hover:text-ctex-accent hover:underline"
          >
            Privacy Policy
          </a>
          .
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