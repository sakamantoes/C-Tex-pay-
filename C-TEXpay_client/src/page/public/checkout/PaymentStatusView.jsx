import { useEffect, useMemo, useState } from "react";
import {
  XCircle,
  Clock3,
  Copy,
  Check,
  ShieldCheck,
  CreditCard,
  ReceiptText,
  CalendarDays,
  Hash,
} from "lucide-react";
import { ImageLogo } from "../../../utils/image";

/* ------------------------------------------------------------------ */
/* Money formatting                                                   */
/* ------------------------------------------------------------------ */

function formatKoboAsNaira(kobo) {
  const n = Number(kobo);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n / 100);
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Random celebration emoji for SUCCESS                               */
/* ------------------------------------------------------------------ */

const CELEBRATION_EMOJIS = ["🎉", "👍", "🎊", "🙌", "🎯", "💚", "✅"];

function pickCelebrationEmoji(seed) {
  if (!CELEBRATION_EMOJIS.length) return "🎉";
  const base = String(seed || Math.random());
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return CELEBRATION_EMOJIS[hash % CELEBRATION_EMOJIS.length];
}

/* ------------------------------------------------------------------ */
/* Status config                                                      */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG = {
  SUCCESS: {
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    iconRing: "ring-emerald-100",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    title: "Thank you",
    description: "Your payment has been processed successfully.",
  },
  FAILED: {
    Icon: XCircle,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    iconRing: "ring-red-100",
    pill: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
    title: "Payment failed",
    description: "We couldn't confirm this payment.",
    note: "Please check your payment details or contact the merchant.",
  },
  EXPIRED: {
    Icon: Clock3,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    iconRing: "ring-amber-100",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    title: "Payment expired",
    description: "The payment window has expired.",
    note: "Please request a new payment link from the merchant.",
  },
  CANCELLED: {
    Icon: XCircle,
    iconColor: "text-slate-500",
    iconBg: "bg-slate-100",
    iconRing: "ring-slate-200",
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
    title: "Payment cancelled",
    description: "This payment was cancelled.",
    note: "If you believe this is a mistake, contact the merchant.",
  },
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function PaymentStatusView({
  link,
  checkout,
  paymentStatus,
}) {
  const [copied, setCopied] = useState(false);

  const status = String(paymentStatus?.status || "PENDING").toUpperCase();

  const config = STATUS_CONFIG[status] || {
    Icon: Clock3,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    iconRing: "ring-indigo-100",
    pill: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    dot: "bg-indigo-500",
    title: "Payment processing",
    description: "We're waiting for confirmation of your payment.",
    note: "This page will reflect the status once confirmation is available.",
  };

  const Icon = config.Icon;

  const amount = formatKoboAsNaira(paymentStatus?.amount);

  const reference =
    checkout?.paymentReference ||
    paymentStatus?.paymentReference ||
    paymentStatus?.reference ||
    "";

  const paidAt =
    paymentStatus?.paidAt ||
    paymentStatus?.updatedAt ||
    paymentStatus?.createdAt ||
    checkout?.updatedAt ||
    checkout?.createdAt ||
    null;

  const formattedDate = formatDate(paidAt);

  // Pick a celebration emoji once per mount, for SUCCESS only.
  const celebrationEmoji = useMemo(
    () => (status === "SUCCESS" ? pickCelebrationEmoji(reference) : null),
    [status, reference]
  );

  // Trigger the intro animation slightly after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function handleCopyReference() {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <section
        className={[
          "overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]",
          "transition-all duration-700 ease-out",
          mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        ].join(" ")}
      >
        {/* Top: brand + emoji / status icon */}
        <div className="px-6 pb-8 pt-10 text-center sm:px-10">
          {/* Celebration emoji or status icon */}
          <div className="flex justify-center">
            {status === "SUCCESS" && celebrationEmoji ? (
              <div className="relative flex h-[88px] w-[88px] items-center justify-center">
                {/* Soft pulsing ring */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-emerald-100/70 ring-8 ring-emerald-100/50 animate-[pulseRing_2.4s_ease-out_infinite]"
                />
                {/* Emoji — pops in, then wiggles forever */}
                <span
                  role="img"
                  aria-label="Celebration"
                  className="relative select-none text-[54px] leading-none animate-[emojiPop_700ms_cubic-bezier(0.22,1.2,0.36,1)_both,emojiWiggle_1.6s_ease-in-out_700ms_infinite]"
                  style={{ transformOrigin: "50% 60%" }}
                >
                  {celebrationEmoji}
                </span>
              </div>
            ) : (
              <div
                className={`flex h-[76px] w-[76px] items-center justify-center rounded-full ring-8 ${config.iconBg} ${config.iconRing}`}
              >
                <Icon
                  className={`h-10 w-10 ${config.iconColor}`}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {status === "SUCCESS" ? config.title : config.title}
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
            {status === "SUCCESS" ? (
              <>
                {config.description}{" "}
                {link?.title ? (
                  <>
                    for{" "}
                    <span className="font-semibold text-slate-800">
                      {link.title}
                    </span>
                  </>
                ) : null}
                .
              </>
            ) : (
              config.description
            )}
          </p>

          <span
            className={`mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 ring-inset ${config.pill}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${config.dot} ${
                status === "PENDING" ? "animate-pulse" : ""
              }`}
            />
            {status === "SUCCESS"
              ? "Payment successful"
              : status === "PENDING"
                ? "Awaiting confirmation"
                : status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        </div>

        {/* Receipt divider with notches */}
        <div className="relative" aria-hidden="true">
          <div className="border-t border-dashed border-slate-300" />
          <span className="absolute left-0 top-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/80 bg-white" />
          <span className="absolute right-0 top-0 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full border border-slate-200/80 bg-white" />
        </div>

        {/* Receipt body */}
        <div className="px-6 pb-9 pt-8 sm:px-10">
          {/* Amount + ticket-id grid, mirroring the reference image */}
          <dl className="grid grid-cols-2 gap-6">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {status === "SUCCESS" ? "Ticket ID" : "Reference"}
              </dt>
              <dd className="mt-1.5 break-all font-mono text-sm font-semibold text-slate-900">
                {reference ? reference.slice(-16) : "—"}
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Amount
              </dt>
              <dd className="mt-1.5 text-base font-bold tracking-tight text-slate-950 tabular-nums">
                {amount}
              </dd>
            </div>
          </dl>

          {/* Date row */}
          <dl className="mt-6 grid grid-cols-2 gap-6 border-t border-dashed border-slate-200 pt-5">
            <div className="col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Date &amp; time
              </dt>
              <dd className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                {formattedDate || "—"}
              </dd>
            </div>
          </dl>

          {/* Details block */}
          <div className="mt-7 space-y-3">
            <DetailRow
              icon={CreditCard}
              label="Payment link"
              value={link?.title || "Checkout payment"}
            />

            {reference ? (
              <DetailRow
                icon={ReceiptText}
                label="Full reference"
                value={reference}
                mono
                copyValue={reference}
                copied={copied}
                onCopy={handleCopyReference}
              />
            ) : null}
          </div>

          {/* Reassurance note */}
          <div className="mt-7 flex items-start justify-center gap-2.5 px-2 text-center">
            <ShieldCheck
              className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconColor}`}
            />
            <p className="max-w-md text-xs leading-5 text-slate-500 sm:text-sm">
              {status === "SUCCESS"
                ? "A confirmation has been recorded. You can safely close this page."
                : config.note ||
                  "This page will reflect the status once confirmation is available."}
            </p>
          </div>
        </div>

        {/* Branded footer */}
        <footer className="flex items-center justify-center gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-5">
         
          <p className="mt-4 flex flex-wrap items-center justify-center gap-1 text-center text-xs text-ctex-text-muted/80">
                    
                     <img
                       src={ImageLogo.Logo2}
                       alt="C-TEX PAY"
                       className="inline-block h-3.5 w-[60px] align-middle"
                     />
                     <span>Payment Simplified.</span>
                   </p>
          
        </footer>
      </section>

      <p className="mt-5 text-center text-xs text-slate-400">
        Payments processed securely by CTEX PAY.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail row                                                         */
/* ------------------------------------------------------------------ */

function DetailRow({ icon: Icon, label, value, mono, copyValue, copied, onCopy }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        <div
          className={[
            "mt-0.5 break-all text-sm font-semibold text-slate-800",
            mono ? "font-mono" : "",
          ].join(" ")}
        >
          {value || "—"}
        </div>
      </div>

      {onCopy && copyValue ? (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      ) : null}
    </div>
  );
}