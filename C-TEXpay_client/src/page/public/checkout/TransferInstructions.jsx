import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Timer,
} from "lucide-react";

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

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04]">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-gradient-to-r from-indigo-50/60 to-transparent px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Complete your bank transfer
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Send the exact amount to the account below.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          {pollingActive ? (
            <>
              <Loader2
                className="h-3 w-3 animate-spin text-indigo-600"
                aria-hidden="true"
              />
              <span>Checking for payment…</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span>Refresh to check status</span>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-5">
        {/* Bank details */}
        <div className="border-b border-slate-200 p-6 md:col-span-3 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Transfer to
            </span>
          </div>

          <div className="mt-5 space-y-4">
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
              value={formatKoboAsNaira(paymentStatus.amount)}
              highlight
            />
          </div>

          {countdown && !countdown.expired ? (
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
              <Timer className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>
                This account expires in{" "}
                <strong className="font-semibold">
                  {String(countdown.minutes).padStart(2, "0")}:
                  {String(countdown.seconds).padStart(2, "0")}
                </strong>
              </span>
            </div>
          ) : countdown && countdown.expired ? (
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800 ring-1 ring-red-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>This transfer account has expired. Please request a new payment link.</span>
            </div>
          ) : null}
        </div>

        {/* Instructions */}
        <div className="p-6 md:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
            How it works
          </div>

          <ol className="mt-4 space-y-4">
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
            />
          </ol>

          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200">
            <div className="font-medium text-slate-700">Payment reference</div>
            <div className="mt-1 font-mono text-[11px] text-slate-800 break-all">
              {checkout?.paymentReference || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstructionRow({ label, value, mono, highlight, onCopy, copied }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div
          className={[
            "mt-1 break-words",
            mono ? "font-mono" : "",
            highlight
              ? "text-lg font-semibold text-slate-900"
              : "text-sm text-slate-900",
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
          className="mt-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

function Step({ index, title, body }) {
  return (
    <li className="flex gap-3">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100">
        {index}
      </div>
      <div>
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-slate-600">
          {body}
        </div>
      </div>
    </li>
  );
}