import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  RefreshCw,
  ReceiptText,
  Timer,
  Wallet,
} from "lucide-react";
import CheckoutHero from "./CheckoutHero ";

function formatKoboAsNaira(kobo) {
  const n = Number(kobo);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(n / 100);
}

/**
 * Same contract as before ({ minutes, seconds, expired } or null),
 * plus `progress` (1 → 0) measured from when this page first saw the timer.
 */
function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(null);
  const startRef = useRef(null);

  useEffect(() => {
    startRef.current = null;
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => {
      const diff = target - Date.now();
      if (startRef.current === null && diff > 0) startRef.current = diff;
      setRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining === null) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const progress = startRef.current
    ? Math.max(0, Math.min(1, remaining / startRef.current))
    : 0;
  return { minutes, seconds, expired: remaining <= 0, progress };
}

export default function TransferInstructions({
  link,
  checkout,
  paymentStatus,
  instructions,
  pollingActive,
}) {
  const [copiedField, setCopiedField] = useState(null);

  const copy = async (value, field) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      window.prompt("Copy:", value);
    }
  };

  const countdown = useCountdown(instructions.expiresAt);

  const formattedAmount = formatKoboAsNaira(paymentStatus.amount);

  /*
  |--------------------------------------------------------------------------
  | Choose hero tone based on state
  |--------------------------------------------------------------------------
  | - amber → account expiring soon (< 5 minutes left)
  | - red   → expired
  | - blue  → normal flow
  */
  const tone = (() => {
    if (!countdown) return "blue";
    if (countdown.expired) return "red";
    const totalLeft = countdown.minutes * 60 + countdown.seconds;
    if (totalLeft <= 5 * 60) return "amber";
    return "blue";
  })();

  const heroTitle = (() => {
    if (!countdown) return "Complete your bank transfer";
    if (countdown.expired) return "Transfer account expired";
    return "Complete your bank transfer";
  })();

  const heroDescription = (() => {
    if (!countdown) return "Send the exact amount to the account below.";
    if (countdown.expired) {
      return "This payment window has closed. Ask the merchant for a fresh link.";
    }
    return `Send ${formattedAmount} to the account below. Payment confirms automatically.`;
  })();

  return (
    <div className="space-y-6">
      <div className="animate-ctex-rise">
        <CheckoutHero
          tone={tone}
          pill={
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Bank transfer
            </>
          }
          icon={Wallet}
          title={heroTitle}
          description={heroDescription}
        />
      </div>

      <div
        className="animate-ctex-rise relative overflow-hidden rounded-3xl border border-ctex-border bg-ctex-surface shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]"
        style={{ animationDelay: "120ms" }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ctex-blue/60 to-transparent"
        />

        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-ctex-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h2 className="font-display text-base font-bold tracking-tight text-ctex-text">
              Account details
            </h2>
            <p className="mt-1 text-xs text-ctex-text-muted">
              Transfer to the account below to complete payment.
            </p>
          </div>

          <div
            className="flex w-fit items-center gap-2.5 rounded-full bg-ctex-elevated px-3.5 py-1.5 text-xs font-medium text-ctex-text ring-1 ring-ctex-border"
            role="status"
            aria-live="polite"
          >
            {pollingActive ? (
              <>
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="animate-ctex-ripple absolute inset-0 rounded-full bg-ctex-blue" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-ctex-blue" />
                </span>
                <span>Checking for payment…</span>
              </>
            ) : (
              <>
                <RefreshCw
                  className="h-3.5 w-3.5 text-ctex-text-muted"
                  aria-hidden="true"
                />
                <span>Refresh to check status</span>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Bank details */}
          <div className="border-b border-ctex-border p-6 sm:p-8 md:col-span-3 md:border-b-0 md:border-r">
            <div
              className="animate-ctex-rise flex items-center gap-2.5"
              style={{ animationDelay: "220ms" }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ctex-blue/10 text-ctex-blue ring-1 ring-ctex-blue/15">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-ctex-text">
                Transfer to
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <InstructionRow
                label="Bank"
                value={instructions.bankName}
                onCopy={() => copy(instructions.bankName, "bank")}
                copied={copiedField === "bank"}
                delay={280}
              />
              <InstructionRow
                label="Account number"
                value={instructions.accountNumber}
                mono
                highlight
                onCopy={() => copy(instructions.accountNumber, "account")}
                copied={copiedField === "account"}
                delay={340}
              />
              <InstructionRow
                label="Account name"
                value={instructions.accountName}
                onCopy={() => copy(instructions.accountName, "name")}
                copied={copiedField === "name"}
                delay={400}
              />
              <InstructionRow
                label="Amount"
                value={formattedAmount}
                highlight
                delay={460}
              />
            </div>

            {countdown && countdown.expired ? (
              <div
                role="alert"
                className="animate-ctex-shake mt-6 flex items-center gap-2.5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700 ring-1 ring-red-500/30 dark:text-red-300"
              >
                <AlertCircle
                  className="h-4 w-4 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>
                  This transfer account has expired. Please request a new
                  payment link.
                </span>
              </div>
            ) : null}
          </div>

          {/* Countdown + instructions */}
          <div className="bg-ctex-elevated/50 p-6 sm:p-8 md:col-span-2">
            {countdown && !countdown.expired ? (
              <CountdownCard countdown={countdown} />
            ) : null}

            <div
              className={`animate-ctex-rise text-sm font-semibold text-ctex-text ${
                countdown && !countdown.expired ? "mt-7" : ""
              }`}
              style={{ animationDelay: "320ms" }}
            >
              How it works
            </div>

            <ol className="mt-5">
              <Step
                index={1}
                title="Open your bank app"
                body="Any Nigerian bank or fintech app works."
                delay={380}
              />
              <Step
                index={2}
                title="Transfer the exact amount"
                body="Sending a different amount may delay confirmation."
                delay={480}
              />
              <Step
                index={3}
                title="Wait for confirmation"
                body="This page updates automatically. You can close it and check back later."
                delay={580}
                last
              />
            </ol>

            <div
              className={`animate-ctex-rise mt-7 flex items-start gap-3 rounded-xl bg-ctex-surface p-4 ring-1 ring-ctex-border transition-shadow ${
                copiedField === "ref" ? "animate-ctex-flash" : ""
              }`}
              style={{ animationDelay: "680ms" }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ctex-text-muted">
                  <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
                  Payment reference
                </div>
                <div className="mt-1.5 break-all font-mono text-xs text-ctex-text">
                  {checkout?.paymentReference || "—"}
                </div>
              </div>
              {checkout?.paymentReference ? (
                <button
                  type="button"
                  onClick={() => copy(checkout.paymentReference, "ref")}
                  aria-label="Copy Payment reference"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ctex-surface text-ctex-text-muted ring-1 ring-ctex-border transition hover:text-ctex-blue hover:ring-ctex-blue/40 focus:outline-none focus:ring-2 focus:ring-ctex-blue"
                >
                  {copiedField === "ref" ? (
                    <Check
                      className="animate-ctex-pop h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Countdown ring                                                     */
/* ------------------------------------------------------------------ */

const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

function CountdownCard({ countdown }) {
  const totalLeft = countdown.minutes * 60 + countdown.seconds;
  const urgent = totalLeft <= 5 * 60;

  return (
    <div
      className="animate-ctex-rise flex items-center gap-4 rounded-2xl bg-ctex-surface p-4 ring-1 ring-ctex-border"
      style={{ animationDelay: "220ms" }}
    >
      <div className="relative h-[84px] w-[84px] flex-shrink-0">
        <svg
          viewBox="0 0 84 84"
          className="h-full w-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="42"
            cy="42"
            r={RING_R}
            fill="none"
            strokeWidth="6"
            className="stroke-ctex-border"
          />
          <circle
            cx="42"
            cy="42"
            r={RING_R}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - countdown.progress)}
            className={`transition-[stroke-dashoffset,stroke] duration-1000 ease-linear ${
              urgent ? "stroke-amber-500" : "stroke-ctex-blue"
            }`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-display text-base font-bold tabular-nums ${
              urgent ? "text-amber-600 dark:text-amber-400" : "text-ctex-text"
            }`}
          >
            {String(countdown.minutes).padStart(2, "0")}:
            {String(countdown.seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ctex-text">
          <Timer
            className={`h-4 w-4 ${urgent ? "text-amber-500" : "text-ctex-blue"}`}
            aria-hidden="true"
          />
          Account expires
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ctex-text-muted">
          {urgent
            ? "Less than 5 minutes left. Send the transfer now."
            : "Send the transfer before the timer runs out."}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rows & steps                                                       */
/* ------------------------------------------------------------------ */

function InstructionRow({
  label,
  value,
  mono,
  highlight,
  onCopy,
  copied,
  delay = 0,
}) {
  return (
    <div
      className={[
        "animate-ctex-rise flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 transition-colors",
        highlight
          ? "bg-ctex-blue/[0.06] ring-1 ring-ctex-blue/20"
          : "bg-ctex-surface ring-1 ring-ctex-border",
        copied ? "animate-ctex-flash" : "",
      ].join(" ")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-ctex-text-muted">{label}</div>
        <div
          className={[
            "mt-1 break-words",
            mono ? "font-mono tabular-nums tracking-wider" : "",
            highlight
              ? "font-display text-xl font-bold text-ctex-text sm:text-2xl"
              : "text-sm font-medium text-ctex-text",
          ].join(" ")}
        >
          {value || "—"}
        </div>
      </div>
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          className={[
            "flex h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold ring-1 transition duration-200 focus:outline-none focus:ring-2 focus:ring-ctex-blue active:scale-95",
            copied
              ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
              : "bg-ctex-surface text-ctex-text-muted ring-ctex-border hover:text-ctex-blue hover:ring-ctex-blue/40",
          ].join(" ")}
        >
          {copied ? (
            <>
              <Check className="animate-ctex-pop h-4 w-4" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

function Step({ index, title, body, last, delay = 0 }) {
  return (
    <li
      className="animate-ctex-rise relative flex gap-3.5 pb-6 last:pb-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      {!last ? (
        <span
          aria-hidden="true"
          className="animate-ctex-grow absolute left-3 top-7 h-[calc(100%-1.75rem)] w-px origin-top bg-ctex-border"
          style={{ animationDelay: `${delay + 200}ms` }}
        />
      ) : null}
      <div className="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-ctex-blue text-xs font-semibold text-white shadow-sm shadow-ctex-blue/30">
        {index}
      </div>
      <div>
        <div className="text-sm font-semibold text-ctex-text">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-ctex-text-muted">
          {body}
        </div>
      </div>
    </li>
  );
}