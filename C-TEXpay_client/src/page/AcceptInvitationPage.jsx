import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import AuthLayout from "../components/auth/AuthLayout";
import { useAuthStore } from "../store/auth.store";
import { useMerchantMemberStore } from "../store/merchantMember.store";
import { getDashboardPath } from "../utils/role";

const getSafeRedirect = (token) => {
  const destination = `/accept-invitation?token=${encodeURIComponent(token)}`;
  return `/login?redirect=${encodeURIComponent(destination)}`;
};

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token")?.trim() || "";
  const { isAuthenticated, user, getMe } = useAuthStore();
  const acceptInvitation = useMerchantMemberStore(
    (state) => state.acceptInvitation
  );
  const [status, setStatus] = useState(token ? "checking" : "invalid");
  const [message, setMessage] = useState(
    token ? "Checking your invitation…" : "This invitation link is missing its token."
  );
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (!token || !isAuthenticated || hasSubmitted.current) return;

    hasSubmitted.current = true;
    setStatus("accepting");
    setMessage("Joining your team securely…");

    (async () => {
      const result = await acceptInvitation({ token });

      if (!result.success) {
        setStatus("error");
        setMessage(result.message || "This invitation could not be accepted.");
        return;
      }

      await getMe();
      setStatus("success");
      setMessage("You have joined the team successfully.");
    })();
  }, [acceptInvitation, getMe, isAuthenticated, token]);

  const handleContinue = () => {
    navigate(getDashboardPath(useAuthStore.getState().user || user), {
      replace: true,
    });
  };

  const isBusy = status === "checking" || status === "accepting";

  return (
    <AuthLayout
      title={
        status === "success"
          ? "Invitation accepted"
          : status === "error" || status === "invalid"
          ? "Invitation unavailable"
          : "Accept your invitation"
      }
      subtitle={
        isBusy
          ? message
          : status === "success"
          ? message
          : "This team invitation may be expired, invalid, or linked to another account."
      }
      footer={
        status !== "success" && (
          <>
            Need help? <Link to="/">Return to C-TEX PAY</Link>
          </>
        )
      }
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex h-20 w-20 items-center justify-center rounded-3xl ${
            status === "success"
              ? "bg-emerald-500/10 text-emerald-500"
              : status === "error" || status === "invalid"
              ? "bg-red-500/10 text-red-500"
              : "bg-ctex-blue/10 text-ctex-blue"
          }`}
        >
          {isBusy ? (
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-ctex-blue/30 border-t-ctex-blue" />
          ) : status === "success" ? (
            <CheckIcon className="h-9 w-9" />
          ) : (
            <AlertIcon className="h-9 w-9" />
          )}
        </motion.div>

        {status === "success" && (
          <button
            type="button"
            onClick={handleContinue}
            className="h-11 w-full rounded-xl bg-ctex-blue px-4 text-sm font-semibold text-white transition hover:bg-ctex-blue-light focus:outline-none focus:ring-2 focus:ring-ctex-blue/30"
          >
            Continue to dashboard
          </button>
        )}

        {(status === "error" || status === "invalid") && (
          <div className="w-full space-y-3">
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500">
              {message}
            </p>
            {token && (
              <Link
                to={getSafeRedirect(token)}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-ctex-border bg-ctex-surface text-sm font-medium text-ctex-text transition hover:border-ctex-blue/50 hover:bg-ctex-elevated"
              >
                Sign in with another account
              </Link>
            )}
          </div>
        )}

        {!isAuthenticated && status !== "invalid" && (
          <div className="w-full space-y-3">
            <p className="text-sm text-ctex-text-muted">
              Sign in with the account that received this invitation to continue.
            </p>
            <Link
              to={getSafeRedirect(token)}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-ctex-blue px-4 text-sm font-semibold text-white transition hover:bg-ctex-blue-light"
            >
              Sign in to accept
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function AlertIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.7 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}