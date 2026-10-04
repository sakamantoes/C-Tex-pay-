import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthLayout from "../components/auth/AuthLayout";
import authService from "../service/auth.service";
import { useAuthStore } from "../store/auth.store";

const REDIRECT_DELAY_SECONDS = 2; // change to 3 or 5 as you like

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);

  const called = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Verify email once on mount
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    (async () => {
      try {
        const res = await authService.verifyEmail(token);
        useAuthStore.getState().clearEmailVerificationRequirement();
        setStatus("success");
        setMessage(res.message || "Email verified successfully.");
      } catch (err) {
        setStatus("error");
        setMessage(
          err.response?.data?.message || "Unable to verify email."
        );
      }
    })();
  }, [token]);

  /*
  |--------------------------------------------------------------------------
  | Countdown + redirect when verified
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (status !== "success") return;

    // Reset counter when we enter success
    setCountdown(REDIRECT_DELAY_SECONDS);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timeout = setTimeout(() => {
      navigate("/login", {
        state: { verified: true },
        replace: true,
      });
    }, REDIRECT_DELAY_SECONDS * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [status, navigate]);

  const handleGoNow = () => {
    navigate("/login", { state: { verified: true }, replace: true });
  };

  return (
    <AuthLayout
      title={
        status === "verifying"
          ? "Verifying your email"
          : status === "success"
          ? "Email verified"
          : "Verification failed"
      }
      subtitle={
        status === "verifying"
          ? "Hang tight, this only takes a moment."
          : status === "success"
          ? `Redirecting you to sign in in ${countdown}s…`
          : "The link may be invalid or expired."
      }
      footer={
        status === "error" && (
          <>
            Need a new link?{" "}
            <Link
              to="/register"
              className="font-medium text-ctex-blue hover:text-ctex-blue-light hover:underline"
            >
              Register again
            </Link>
          </>
        )
      }
    >
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        {/* Icon / spinner */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className={[
            "relative flex h-20 w-20 items-center justify-center rounded-3xl",
            status === "verifying" && "bg-ctex-blue/10 text-ctex-blue",
            status === "success" && "bg-emerald-500/10 text-emerald-500",
            status === "error" && "bg-red-500/10 text-red-500",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {status === "verifying" && (
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-ctex-blue/30 border-t-ctex-blue" />
          )}

          {status === "success" && (
            <>
              {/* pulse ring on success */}
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-3xl border border-emerald-500/40"
                animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <CheckIcon className="h-9 w-9" />
            </>
          )}

          {status === "error" && <XIcon className="h-9 w-9" />}
        </motion.div>

        {message && (
          <p
            className={[
              "text-sm",
              status === "error" ? "text-red-500" : "text-ctex-text-muted",
            ].join(" ")}
          >
            {message}
          </p>
        )}

        {/* Countdown bar + Skip button (only on success) */}
        <AnimatePresence>
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="w-full space-y-3"
            >
              {/* progress bar */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-ctex-border">
                <motion.div
                  key={countdown}
                  initial={{
                    width: `${
                      ((REDIRECT_DELAY_SECONDS - countdown + 1) /
                        REDIRECT_DELAY_SECONDS) *
                      100
                    }%`,
                  }}
                  animate={{
                    width: `${
                      ((REDIRECT_DELAY_SECONDS - countdown + 1) /
                        REDIRECT_DELAY_SECONDS) *
                      100
                    }%`,
                  }}
                  transition={{ duration: 1, ease: "linear" }}
                  className="h-full bg-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleGoNow}
                className="text-xs font-medium text-ctex-text-muted transition hover:text-ctex-blue hover:underline"
              >
                Go to sign in now →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {status === "error" && (
          <Link
            to="/login"
            className="text-sm font-medium text-ctex-blue hover:text-ctex-blue-light hover:underline"
          >
            Back to sign in
          </Link>
        )}
      </div>
    </AuthLayout>
  );
}

/* -------------------------------- Icons -------------------------------- */

function CheckIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
