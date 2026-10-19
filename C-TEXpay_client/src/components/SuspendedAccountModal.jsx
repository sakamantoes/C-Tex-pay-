import { useEffect } from "react";
import { MessageCircle, ShieldAlert, X } from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { SUPPORT_WHATSAPP_NUMBER, SUPPORT_WHATSAPP_URL } from "../constants/support.js";

export default function SuspendedAccountModal() {
  const isOpen = useAuthStore((state) => state.accountSuspensionNotice);
  const dismiss = useAuthStore((state) => state.clearAccountSuspensionNotice);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, dismiss]);

  if (!isOpen) return null;

  const whatsappUrl = SUPPORT_WHATSAPP_URL(
    "Hello C-TEX PAY Customer Care, my account is suspended and I need assistance."
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="presentation">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="suspended-account-title"
        aria-describedby="suspended-account-description"
        className="w-full max-w-md rounded-2xl border border-ctex-border bg-ctex-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <ShieldAlert size={22} aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close account suspension notice"
            className="rounded-lg p-2 text-ctex-text-muted transition hover:bg-ctex-elevated hover:text-ctex-text"
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="suspended-account-title" className="mt-4 text-xl font-semibold text-ctex-text">
          Your account is suspended
        </h2>
        <p id="suspended-account-description" className="mt-2 text-sm leading-6 text-ctex-text-muted">
          You can’t access your account while it is suspended. Please contact C-TEX PAY Customer Care on WhatsApp so the team can help you.
        </p>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <MessageCircle size={17} aria-hidden="true" />
          Contact Customer Care
        </a>
        <p className="mt-2 text-center text-xs text-ctex-text-muted">
          WhatsApp: +{SUPPORT_WHATSAPP_NUMBER}
        </p>
      </section>
    </div>
  );
}
