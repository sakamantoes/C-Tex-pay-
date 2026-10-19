import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import { useAuthStore } from "../store/auth.store";
import { useMerchantMemberStore } from "../store/merchantMember.store";
import { getDashboardPath } from "../utils/role";

const invitationPath = (token) => `/accept-invitation?token=${encodeURIComponent(token)}`;
const loginPath = (token, email = "") => {
  const params = new URLSearchParams({ redirect: invitationPath(token) });
  if (email) params.set("email", email);
  return `/login?${params.toString()}`;
};

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token")?.trim() || "";
  const { isAuthenticated, user, getMe, logout } = useAuthStore();
  const previewInvitation = useMerchantMemberStore((state) => state.previewInvitation);
  const acceptInvitation = useMerchantMemberStore((state) => state.acceptInvitation);
  const [invitation, setInvitation] = useState(null);
  const [status, setStatus] = useState(token ? "loading" : "invalid");
  const [message, setMessage] = useState(token ? "Validating your invitation…" : "This invitation link is missing its token.");

  useEffect(() => {
    let active = true;
    if (!token) return undefined;
    previewInvitation(token).then((result) => {
      if (!active) return;
      if (!result.success) {
        setStatus(result.code === "INVITATION_EXPIRED" ? "expired" : "invalid");
        setMessage(result.message);
        return;
      }
      if (result.data.status === "ACCEPTED") {
        setStatus("accepted");
        setMessage("This invitation has already been accepted.");
        return;
      }
      setInvitation(result.data);
      setStatus("ready");
      setMessage("");
    });
    return () => { active = false; };
  }, [previewInvitation, token]);

  const correctIdentity = isAuthenticated && invitation &&
    user?.emailVerified === true &&
    user?.email?.trim().toLowerCase() === invitation.email?.trim().toLowerCase();
  const wrongIdentity = isAuthenticated && invitation && !correctIdentity;

  const handleAccept = async () => {
    if (!correctIdentity || status !== "ready") return;
    setStatus("accepting");
    const result = await acceptInvitation({ token });
    if (!result.success) {
      setStatus("error");
      setMessage(result.message || "This invitation could not be accepted.");
      return;
    }
    await getMe();
    setStatus("success");
    setMessage(result.data?.message || "You have joined the team successfully.");
  };

  const switchAccount = async () => {
    await logout();
    navigate(loginPath(token, invitation?.email), { replace: true });
  };
  const continueToDashboard = () => navigate(getDashboardPath(useAuthStore.getState().user || user), { replace: true });

  const title = status === "success" ? "Invitation accepted"
    : status === "accepted" ? "Invitation already accepted"
    : status === "expired" || status === "invalid" ? "Invitation unavailable"
    : "Accept your invitation";

  return (
    <AuthLayout title={title} subtitle={message || "Review the invitation and accept it to join the team."}
      footer={<><Link to="/">Return to C-TEX PAY</Link></>}>
      <div className="space-y-4 text-center">
        {(status === "loading" || status === "accepting") && <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-ctex-blue/30 border-t-ctex-blue" />}

        {invitation && status !== "loading" && (
          <div className="rounded-xl border border-ctex-border bg-ctex-elevated/60 p-4 text-left text-sm">
            <p>You were invited to join <strong>{invitation.merchantName}</strong>.</p>
            <p className="mt-1">Role: <strong>{invitation.roleName}</strong></p>
            <p className="mt-1 break-all">Invitation email: <strong>{invitation.email}</strong></p>
          </div>
        )}

        {status === "ready" && !isAuthenticated && invitation.nextStep === "REGISTER" && (
          <>
            <p className="text-sm text-ctex-text-muted">An account is required. Create one with the invited email; you will review and accept the invitation after email verification.</p>
            <Link to={`/signup?invitationToken=${encodeURIComponent(token)}&email=${encodeURIComponent(invitation.email)}`} className="flex h-11 w-full items-center justify-center rounded-xl bg-ctex-blue px-4 text-sm font-semibold text-white">Register account</Link>
          </>
        )}

        {status === "ready" && !isAuthenticated && invitation.nextStep === "LOGIN" && (
          <>
            <p className="text-sm text-ctex-text-muted">Sign in with the invited account. You will review and explicitly accept the invitation afterward.</p>
            <Link to={loginPath(token, invitation.email)} className="flex h-11 w-full items-center justify-center rounded-xl bg-ctex-blue px-4 text-sm font-semibold text-white">Log in</Link>
          </>
        )}

        {status === "ready" && !isAuthenticated && invitation.nextStep === "ACCOUNT_UNAVAILABLE" && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700">This account cannot accept invitations right now. Please contact C-TEX PAY support for help.</p>
        )}

        {correctIdentity && status === "ready" && (
          <button type="button" onClick={handleAccept} className="h-11 w-full rounded-xl bg-ctex-blue px-4 text-sm font-semibold text-white">Accept invitation</button>
        )}

        {wrongIdentity && status === "ready" && (
          <div className="space-y-3">
            <p className="text-sm text-amber-600">You are signed in as {user?.email}. This invitation is for {invitation.email}. Switch accounts to continue.</p>
            <button type="button" onClick={switchAccount} className="h-11 w-full rounded-xl border border-ctex-border text-sm font-medium">Switch account</button>
          </div>
        )}

        {status === "success" && <button type="button" onClick={continueToDashboard} className="h-11 w-full rounded-xl bg-ctex-blue px-4 text-sm font-semibold text-white">Continue to dashboard</button>}
        {status === "error" && correctIdentity && <button type="button" onClick={() => { setStatus("ready"); setMessage(""); }} className="h-11 w-full rounded-xl border border-ctex-border text-sm font-medium">Try again</button>}
        {status === "accepted" && isAuthenticated && <button type="button" onClick={continueToDashboard} className="h-11 w-full rounded-xl border border-ctex-border text-sm font-medium">Continue to dashboard</button>}
      </div>
    </AuthLayout>
  );
}
