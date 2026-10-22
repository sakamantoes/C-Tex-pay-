import { useEffect, useRef } from "react";
import { CheckCircle2, Copy, X } from "lucide-react";

const money = (minor = 0) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(minor || 0) / 100);

/**
 * PayoutSuccessModal
 *
 * Shown when a payout is confirmed as SUCCESS. Includes a receipt-style
 * breakdown, recipient details, and reference with a copy button.
 *
 * Props:
 *   open        — boolean
 *   onClose     — () => void
 *   payout      — { id, amount, walletDebitAmount, beneficiaryAmount,
 *                   feeAmount, accountName, accountNumber, bankName,
 *                   completedAt } (kobo where applicable)
 *   onViewLedger— () => void (optional: navigate to transactions tab)
 */
export default function PayoutSuccessModal({
  open,
  onClose,
  payout,
  onViewLedger,
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

  const copyRef = async () => {
    if (!payout?.id) return;
    try {
      await navigator.clipboard.writeText(payout.id);
    } catch {
      /* clipboard may be blocked; silently ignore */
    }
  };

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
        aria-labelledby="success-title"
        aria-describedby="success-desc"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-2xl"
      >
        {/* Header */}
        <div className="relative border-b border-ctex-border bg-emerald-500/5 p-6 text-center">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            aria-hidden="true"
            className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30"
          >
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h2
            id="success-title"
            className="mt-3 text-lg font-semibold tracking-tight text-ctex-text"
          >
            Withdrawal successful
          </h2>
          <p id="success-desc" className="mt-1 text-sm text-ctex-text-muted">
            {payout?.accountName
              ? `${money(payout.beneficiaryAmount ?? payout.amount)} was sent to ${payout.accountName}.`
              : "Funds have been sent to the recipient's bank account."}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ctex-text">
            {money(payout?.beneficiaryAmount ?? payout?.amount ?? 0)}
          </p>
        </div>

        {/* Receipt */}
        {payout && (
          <div className="space-y-2 bg-ctex-elevated/40 p-5 text-sm">
            <Row label="Requested" value={money(payout.amount)} />
            {Number(payout.feeAmount) > 0 && (
              <Row label="C-TEX fee" value={money(payout.feeAmount)} />
            )}
            <Row
              label="Wallet debit"
              value={money(payout.walletDebitAmount ?? payout.amount)}
              strong
            />
            <div className="my-2 border-t border-ctex-border" />
            {payout.accountName && (
              <Row label="Recipient" value={payout.accountName} />
            )}
            {payout.accountNumber && (
              <Row
                label="Account"
                value={`••••${String(payout.accountNumber).slice(-4)}`}
              />
            )}
            {payout.bankName && (
              <Row label="Bank" value={payout.bankName} />
            )}
            {payout.completedAt && (
              <Row
                label="Completed"
                value={new Date(payout.completedAt).toLocaleString()}
              />
            )}
            <div className="my-2 border-t border-ctex-border" />
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ctex-text-muted">Reference</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-xs">{payout.id}</span>
                <button
                  type="button"
                  onClick={copyRef}
                  aria-label="Copy reference"
                  className="rounded p-1 text-ctex-text-muted hover:bg-ctex-surface hover:text-ctex-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </dd>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-ctex-border p-5 sm:flex-row sm:justify-end">
          {onViewLedger && (
            <button
              type="button"
              onClick={onViewLedger}
              className="w-full rounded-xl border border-ctex-border px-4 py-2.5 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50 sm:w-auto"
            >
              View ledger
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50 sm:w-auto"
          >
            Done
          </button>
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