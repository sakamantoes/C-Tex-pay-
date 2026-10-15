import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Timer,
  Timer as TimerIcon,
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

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => {
      const diff = target - Date.now();
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
  return { minutes, seconds, expired: remaining <= 0 };
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

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]">
        {/* Status bar */}
        <div className="relative flex flex-col gap-3 overflow-hidden bg-slate-950 px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-base font-semibold tracking-tight">
              Account details
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Transfer to the account below to complete payment.
            </p>
          </div>
          <div
            className="relative flex w-fit items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/15"
            role="status"
            aria-live="polite"
          >
            {pollingActive ? (
              <>
                <Loader2
                  className="h-3.5 w-3.5 animate-spin text-indigo-300"
                  aria-hidden="true"
                />
                <span>Checking for payment…</span>
              </>
            ) : (
              <>
                <RefreshCw
                  className="h-3.5 w-3.5 text-slate-400"
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
          <div className="border-b border-slate-200 p-6 sm:p-8 md:col-span-3 md:border-b-0 md:border-r">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                Transfer to
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <InstructionRow
                label="Bank"
                value={instructions.bankName}
                onCopy={() => copy(instructions.bankName, "bank")}
                copied={copiedField === "bank"}
              />
              <InstructionRow
                label="Account number"
                value={instructions.accountNumber}
                mono
                highlight
                onCopy={() => copy(instructions.accountNumber, "account")}
                copied={copiedField === "account"}
              />
              <InstructionRow
                label="Account name"
                value={instructions.accountName}
                onCopy={() => copy(instructions.accountName, "name")}
                copied={copiedField === "name"}
              />
              <InstructionRow
                label="Amount"
                value={formattedAmount}
                highlight
              />
            </div>

            {countdown && !countdown.expired ? (
              <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <Timer className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>
                  This account expires in{" "}
                  <strong className="font-semibold tabular-nums">
                    {String(countdown.minutes).padStart(2, "0")}:
                    {String(countdown.seconds).padStart(2, "0")}
                  </strong>
                </span>
              </div>
            ) : countdown && countdown.expired ? (
              <div
                role="alert"
                className="mt-6 flex items-center gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200"
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

          {/* Instructions */}
          <div className="bg-slate-50/70 p-6 sm:p-8 md:col-span-2">
            <div className="text-sm font-semibold text-slate-900">
              How it works
            </div>

            <ol className="mt-5">
              <Step
                index={1}
                title="Open your bank app"
                body="Any Nigerian bank or fintech app works."
              />
              <Step
                index={2}
                title="Transfer the exact amount"
                body="Sending a different amount may delay confirmation."
              />
              <Step
                index={3}
                title="Wait for confirmation"
                body="This page updates automatically. You can close it and check back later."
                last
              />
            </ol>

            <div className="mt-7 rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-600">
                Payment reference
              </div>
              <div className="mt-1.5 break-all font-mono text-xs text-slate-900">
                {checkout?.paymentReference || "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstructionRow({ label, value, mono, highlight, onCopy, copied }) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3 rounded-xl px-4 py-3.5",
        highlight
          ? "bg-indigo-50/70 ring-1 ring-indigo-100"
          : "bg-white ring-1 ring-slate-200",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div
          className={[
            "mt-1 break-words",
            mono ? "font-mono tabular-nums tracking-wide" : "",
            highlight
              ? "text-xl font-semibold text-slate-950"
              : "text-sm font-medium text-slate-900",
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
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition hover:text-indigo-600 hover:ring-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      ) : null}
    </div>
  );
}

function Step({ index, title, body, last }) {
  return (
    <li className="relative flex gap-3.5 pb-6 last:pb-0">
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute left-3 top-7 h-[calc(100%-1.75rem)] w-px bg-slate-200"
        />
      ) : null}
      <div className="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
        {index}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-slate-600">
          {body}
        </div>
      </div>
    </li>
  );
}