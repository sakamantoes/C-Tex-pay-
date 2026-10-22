import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowDownRight, Wallet, X } from "lucide-react";

const money = (minor = 0) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(minor || 0) / 100);

/**
 * InsufficientBalanceModal
 *
 * Intercepts "Confirm withdrawal" when the wallet debit exceeds the
 * available balance. Explains the exact shortfall in naira, in both
 * the requested amount and the fee mode context.
 *
 * Props:
 *   open               — boolean
 *   onClose            — () => void
 *   onWithdrawAvailable— () => void (optional: prefill with max feasible amount)
 *   walletDebit        — number (kobo) — what would leave the wallet
 *   availableBalance   — number (kobo) — what is currently available
 *   requestedAmount    — number (kobo) — what the user typed
 *   feeAmount          — number (kobo) — the fee component
 *   feeMode            — "FEE_ON_TOP" | "DEDUCT_FROM_AMOUNT"
 *   currency           — "NGN" (default)
 */
export default function InsufficientBalanceModal({
  open,
  onClose,
  onWithdrawAvailable,
  walletDebit = 0,
  availableBalance = 0,
  requestedAmount = 0,
  feeAmount = 0,
  feeMode = "FEE_ON_TOP",
  currency = "NGN",
}) {
  const closeButtonRef = useRef(null);

  /* Focus the close button on open; wire Escape to close */
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const shortfall = Math.max(0, Number(walletDebit) - Number(availableBalance));

  /*
   * The maximum amount the user can request right now, given the current
   * fee mode. Solves: available >= amount + fee(amount)  OR  available >= amount.
   * For FEE_ON_TOP we subtract the fee from what's available; for
   * DEDUCT_FROM_AMOUNT the fee comes out of the transfer, so the amount
   * the wallet covers equals the debit exactly.
   */
  const maxFeasible =
    feeMode === "FEE_ON_TOP"
      ? Math.max(0, Number(availableBalance) - Number(feeAmount))
      : Number(availableBalance);

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
        aria-labelledby="insuff-title"
        aria-describedby="insuff-desc"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-ctex-border p-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/25"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="insuff-title" className="text-lg font-semibold tracking-tight text-ctex-text">
                Not enough funds for this withdrawal
              </h2>
              <p id="insuff-desc" className="mt-1 text-sm text-ctex-text-muted">
                Your withdrawal would take {money(walletDebit)} from your wallet, but only{" "}
                {money(availableBalance)} is available.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-lg p-1.5 text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 bg-ctex-elevated/40 p-5 text-sm">
          <Row label="You requested" value={money(requestedAmount)} />
          <Row
            label={feeMode === "FEE_ON_TOP" ? "C-TEX fee (paid by you)" : "C-TEX fee (deducted)"}
            value={money(feeAmount)}
          />
          <div className="my-2 border-t border-ctex-border" />
          <Row label="Total wallet debit" value={money(walletDebit)} strong />
          <Row label="Available balance" value={money(availableBalance)} />
          <div className="my-2 border-t border-ctex-border" />
          <Row
            label="Shortfall"
            value={money(shortfall)}
            tone="danger"
            strong
          />
        </div>

        {/* Suggestion */}
        {maxFeasible > 0 && (
          <div className="border-t border-ctex-border p-5">
            <div className="flex items-start gap-3 rounded-xl border border-ctex-blue/25 bg-ctex-blue/5 p-3">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ctex-blue/15 text-ctex-blue"
              >
                <Wallet className="h-4 w-4" />
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium text-ctex-text">
                  You can withdraw up to {money(maxFeasible)}
                </p>
                <p className="mt-0.5 text-xs text-ctex-text-muted">
                  {feeMode === "FEE_ON_TOP"
                    ? "This includes the C-TEX fee you pay on top."
                    : "The C-TEX fee will be deducted from what the recipient receives."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-ctex-border p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-ctex-border px-4 py-2.5 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50 sm:w-auto"
          >
            Adjust amount
          </button>
          {maxFeasible > 0 && onWithdrawAvailable && (
            <button
              type="button"
              onClick={onWithdrawAvailable}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-blue/50 sm:w-auto"
            >
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
              Withdraw {money(maxFeasible)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong, tone }) {
  const valueClass =
    tone === "danger"
      ? "text-red-400"
      : strong
      ? "font-semibold text-ctex-text"
      : "text-ctex-text";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ctex-text-muted">{label}</dt>
      <dd className={`tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}