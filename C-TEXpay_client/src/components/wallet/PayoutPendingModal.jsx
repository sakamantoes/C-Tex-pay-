import { useEffect, useRef } from "react";
import { Clock, Loader2, Mail, X } from "lucide-react";

const money = (minor = 0) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(minor || 0) / 100);

/**
 * PayoutPendingModal
 *
 * Shown when a payout enters a pending state:
 *   - PENDING_AUTHORIZATION — an OTP is required
 *   - PROCESSING            — the provider is processing
 *
 * Props:
 *   open          — boolean
 *   onClose       — () => void
 *   variant       — "AUTHORIZATION" | "PROCESSING"
 *   payout        — { id, amount, walletDebitAmount, beneficiaryAmount,
 *                     accountName, accountNumber, bankName } (kobo)
 *   onAuthorize   — () => void (optional; only shown for AUTHORIZATION)
 */
export default function PayoutPendingModal({
  open,
  onClose,
  variant = "PROCESSING",
  payout,
  onAuthorize,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isAuth = variant === "AUTHORIZATION";
  const Icon = isAuth ? Mail : Clock;
  const iconTone = isAuth
    ? "bg-ctex-blue/10 text-ctex-blue ring-ctex-blue/25"
    : "bg-amber-500/10 text-amber-400 ring-amber-500/25";
  const title = isAuth
    ? "Authorization required"
    : "Withdrawal is processing";
  const body = isAuth
    ? "We sent a one-time authorization code to the registered email address for withdrawals. Enter it below to continue."
    : "Your withdrawal has been sent to the bank. It usually arrives within a few minutes. We'll send a confirmation when it settles.";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pending-title"
        aria-describedby="pending-desc"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-ctex-border p-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 ${iconTone}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="pending-title"
                className="text-lg font-semibold tracking-tight text-ctex-text"
              >
                {title}
              </h2>
              <p
                id="pending-desc"
                className="mt-1 text-sm text-ctex-text-muted"
              >
                {body}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Breakdown */}
        {payout && (
          <div className="space-y-2 bg-ctex-elevated/40 p-5 text-sm">
            <Row label="Amount" value={money(payout.amount)} strong />
            {payout.accountName && (
              <Row
                label="Recipient"
                value={`${payout.accountName}${
                  payout.accountNumber
                    ? ` · ••••${String(payout.accountNumber).slice(-4)}`
                    : ""
                }`}
              />
            )}
            {payout.bankName && (
              <Row label="Bank" value={payout.bankName} />
            )}
            <Row
              label="Reference"
              value={
                <span className="font-mono text-xs">
                  {payout.id?.slice(0, 12)}…
                </span>
              }
            />
            {!isAuth && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-400">
                <Loader2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <p>
                  You can close this window. We'll update your wallet as soon as
                  the provider confirms settlement.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-ctex-border p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-ctex-border px-4 py-2.5 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50 sm:w-auto"
          >
            {isAuth ? "Close" : "Done"}
          </button>
          {isAuth && onAuthorize && (
            <button
              type="button"
              onClick={onAuthorize}
              className="w-full rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50 sm:w-auto"
            >
              Enter authorization code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ctex-text-muted">{label}</dt>
      <dd
        className={`truncate text-right ${
          strong ? "font-semibold text-ctex-text" : "text-ctex-text"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}