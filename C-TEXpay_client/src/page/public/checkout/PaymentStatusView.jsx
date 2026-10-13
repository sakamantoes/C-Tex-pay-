
import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock3,
  Copy,
  Check,
  ShieldCheck,
  ArrowUpRight,
  CreditCard,
  ReceiptText,
} from "lucide-react";

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

const STATUS_CONFIG = {
  SUCCESS: {
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    iconRing: "ring-emerald-100",
    accent: "text-emerald-700",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    dot: "bg-emerald-500",
    title: "Payment received",
    description: "Your payment has been confirmed successfully.",
    note: "A confirmation has been recorded. You can safely close this page.",
  },
  FAILED: {
    icon: XCircle,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    iconRing: "ring-red-100",
    accent: "text-red-700",
    pill: "bg-red-50 text-red-700 ring-red-100",
    dot: "bg-red-500",
    title: "Payment failed",
    description: "We couldn't confirm this payment.",
    note: "Please check your payment details or contact the merchant.",
  },
  EXPIRED: {
    icon: Clock3,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    iconRing: "ring-amber-100",
    accent: "text-amber-700",
    pill: "bg-amber-50 text-amber-700 ring-amber-100",
    dot: "bg-amber-500",
    title: "Payment expired",
    description: "The payment window has expired.",
    note: "Please request a new payment link from the merchant.",
  },
  CANCELLED: {
    icon: XCircle,
    iconColor: "text-slate-500",
    iconBg: "bg-slate-100",
    iconRing: "ring-slate-200",
    accent: "text-slate-600",
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
    title: "Payment cancelled",
    description: "This payment was cancelled.",
    note: "If you believe this is a mistake, contact the merchant.",
  },
};

export default function PaymentStatusView({
  link,
  checkout,
  paymentStatus,
}) {
  const [copied, setCopied] = useState(false);

  const status = String(paymentStatus?.status || "PENDING").toUpperCase();

  const config = STATUS_CONFIG[status] || {
    icon: Clock3,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    iconRing: "ring-blue-100",
    accent: "text-blue-700",
    pill: "bg-blue-50 text-blue-700 ring-blue-100",
    dot: "bg-blue-500",
    title: "Payment processing",
    description: "We're waiting for confirmation of your payment.",
    note: "This page will reflect the status once confirmation is available.",
  };

  const Icon = config.icon;

  const amount = formatKoboAsNaira(paymentStatus?.amount);
  const reference =
    checkout?.paymentReference ||
    paymentStatus?.paymentReference ||
    paymentStatus?.reference ||
    "";

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
    <main className="min-h-screen bg-[#f5f7fc] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-35px_rgba(15,23,42,0.20)]">
          {/* Brand header */}
          <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-9">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-md shadow-indigo-600/20">
                C
              </div>

              <div>
                <p className="text-base font-bold tracking-tight text-slate-950">
                  C-TEX <span className="text-indigo-600">PAY</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Simple. Secure. Reliable.
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-slate-600">
                Secure checkout
              </span>
            </div>
          </header>

          <div className="px-6 py-9 sm:px-10 sm:py-12">
            {/* Status hero */}
            <div className="flex flex-col items-center text-center">
              <div
                className={`flex h-[76px] w-[76px] items-center justify-center rounded-full ring-8 ${config.iconBg} ${config.iconRing}`}
              >
                <Icon
                  className={`h-10 w-10 ${config.iconColor}`}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </div>

              <h1 className="mt-7 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {config.title}
              </h1>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
                {status === "SUCCESS" ? (
                  <>
                    We've received your payment for{" "}
                    <span className="font-semibold text-slate-800">
                      {link?.title || "your order"}
                    </span>
                    .
                  </>
                ) : (
                  config.description
                )}
              </p>

              <span
                className={`mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 ring-inset ${config.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                {status === "SUCCESS"
                  ? "Payment successful"
                  : status === "PENDING"
                    ? "Awaiting confirmation"
                    : status.charAt(0) +
                      status.slice(1).toLowerCase()}
              </span>
            </div>

            {/* Amount card */}
            <div className="mt-9 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-7">
              <p className="text-sm font-medium text-slate-500">
                {status === "SUCCESS" ? "Amount received" : "Payment amount"}
              </p>

              <p className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {amount}
              </p>

              <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">Payment link</p>
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {link?.title || "Checkout payment"}
                  </p>
                </div>

                <ReceiptText className="h-5 w-5 shrink-0 text-slate-400" />
              </div>
            </div>

            {/* Reference card */}
            {reference && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <ReceiptText className="h-5 w-5 text-slate-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Payment reference
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-slate-800">
                      {reference}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyReference}
                    aria-label="Copy payment reference"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {copied && (
                  <p className="mt-2 text-right text-xs font-medium text-emerald-600">
                    Reference copied
                  </p>
                )}
              </div>
            )}

            {/* Reassurance note */}
            <div className="mt-7 flex items-start justify-center gap-2.5 px-2 text-center">
              <ShieldCheck
                className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconColor}`}
              />
              <p className="max-w-md text-xs leading-5 text-slate-500 sm:text-sm">
                {config.note}
              </p>
            </div>
          </div>

          {/* Branded footer */}
          <footer className="border-t border-slate-100 bg-slate-50/80 px-6 py-6 text-center">
            <p className="text-sm font-bold tracking-tight text-slate-800">
              C-TEX <span className="text-indigo-600">PAY</span>
            </p>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
              Simplified Payments
            </p>
          </footer>
        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          Payments processed securely by C-TEX PAY.
        </p>
      </div>
    </main>
  );
}
