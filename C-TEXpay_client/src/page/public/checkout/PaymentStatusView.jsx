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

/* One-shot burst around the emoji (fixed vectors, so it's deterministic) */
const CONFETTI = [
  { x: -78, y: -54, r: -160, c: "bg-emerald-400" },
  { x: -52, y: -86, r: 120, c: "bg-ctex-blue" },
  { x: -18, y: -98, r: -80, c: "bg-amber-400" },
  { x: 24, y: -94, r: 200, c: "bg-emerald-500" },
  { x: 60, y: -78, r: -120, c: "bg-ctex-blue" },
  { x: 86, y: -42, r: 90, c: "bg-amber-400" },
  { x: 82, y: 12, r: -200, c: "bg-emerald-400" },
  { x: -84, y: 8, r: 160, c: "bg-amber-400" },
  { x: -62, y: 52, r: -90, c: "bg-emerald-500" },
  { x: 58, y: 56, r: 140, c: "bg-ctex-blue" },
];

/* ------------------------------------------------------------------ */
/* Status config                                                      */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG = {
  SUCCESS: {
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
    iconRing: "ring-emerald-500/15",
    pill: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
    dot: "bg-emerald-500",
    glow: "from-emerald-500/15",
    ripple: "bg-emerald-500/30",
    title: "Thank you",
    description: "Your payment has been processed successfully.",
  },
  FAILED: {
    Icon: XCircle,
    iconColor: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-500/10",
    iconRing: "ring-red-500/15",
    pill: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300",
    dot: "bg-red-500",
    glow: "from-red-500/12",
    ripple: "bg-red-500/25",
    title: "Payment failed",
    description: "We couldn't confirm this payment.",
    note: "Please check your payment details or contact the merchant.",
    iconMotion: "animate-ctex-shake",
  },
  EXPIRED: {
    Icon: Clock3,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
    iconRing: "ring-amber-500/15",
    pill: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
    dot: "bg-amber-500",
    glow: "from-amber-500/12",
    ripple: "bg-amber-500/25",
    title: "Payment expired",
    description: "The payment window has expired.",
    note: "Please request a new payment link from the merchant.",
    iconMotion: "animate-ctex-float",
  },
  CANCELLED: {
    Icon: XCircle,
    iconColor: "text-ctex-text-muted",
    iconBg: "bg-ctex-elevated",
    iconRing: "ring-ctex-border",
    pill: "bg-ctex-elevated text-ctex-text-muted ring-ctex-border",
    dot: "bg-ctex-text-muted",
    glow: "from-slate-500/10",
    ripple: "bg-slate-400/25",
    title: "Payment cancelled",
    description: "This payment was cancelled.",
    note: "If you believe this is a mistake, contact the merchant.",
  },
};

const PENDING_CONFIG = {
  Icon: Clock3,
  iconColor: "text-ctex-blue",
  iconBg: "bg-ctex-blue/10",
  iconRing: "ring-ctex-blue/15",
  pill: "bg-ctex-blue/10 text-ctex-blue ring-ctex-blue/25",
  dot: "bg-ctex-blue",
  glow: "from-ctex-blue/12",
  ripple: "bg-ctex-blue/30",
  title: "Payment processing",
  description: "We're waiting for confirmation of your payment.",
  note: "This page will reflect the status once confirmation is available.",
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

  const config = STATUS_CONFIG[status] || PENDING_CONFIG;
  const isPending = !STATUS_CONFIG[status];

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
          "relative overflow-hidden rounded-3xl border border-ctex-border bg-ctex-surface shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]",
          "transition-all duration-700 ease-out",
          mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        ].join(" ")}
      >
        {/* Top: status icon + message */}
        <div className="relative px-6 pb-8 pt-10 text-center sm:px-10">
          {/* Ambient glow tinted by status */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b ${config.glow} to-transparent`}
          />

          <div className="relative flex justify-center">
            {status === "SUCCESS" && celebrationEmoji ? (
              <div className="relative flex h-[96px] w-[96px] items-center justify-center">
                {/* Expanding rings, played twice */}
                <span
                  aria-hidden="true"
                  className={`animate-ctex-ripple absolute inset-2 rounded-full ${config.ripple} [animation-iteration-count:2]`}
                />
                <span
                  aria-hidden="true"
                  className={`animate-ctex-ripple absolute inset-2 rounded-full ${config.ripple} [animation-delay:500ms] [animation-iteration-count:2]`}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/10"
                />

                {/* Confetti burst */}
                {CONFETTI.map((p, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={`animate-ctex-confetti absolute left-1/2 top-1/2 h-2 w-1.5 rounded-[2px] ${p.c}`}
                    style={{
                      "--x": `${p.x}px`,
                      "--y": `${p.y}px`,
                      "--r": `${p.r}deg`,
                      animationDelay: `${280 + i * 25}ms`,
                    }}
                  />
                ))}

                {/* Emoji — pops in, then wiggles */}
                <span
                  role="img"
                  aria-label="Celebration"
                  className="animate-ctex-pop relative select-none text-[54px] leading-none"
                  style={{ transformOrigin: "50% 60%" }}
                >
                  <span
                    className="animate-ctex-wiggle inline-block"
                    style={{ animationDelay: "900ms" }}
                  >
                    {celebrationEmoji}
                  </span>
                </span>
              </div>
            ) : (
              <div className="relative flex h-[96px] w-[96px] items-center justify-center">
                {/* Waiting state gets a live radar; other states stay still */}
                {isPending ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={`animate-ctex-ripple absolute inset-3 rounded-full ${config.ripple}`}
                    />
                    <span
                      aria-hidden="true"
                      className={`animate-ctex-ripple absolute inset-3 rounded-full ${config.ripple} [animation-delay:1200ms]`}
                    />
                  </>
                ) : null}
                <div
                  className={`animate-ctex-pop relative flex h-[76px] w-[76px] items-center justify-center rounded-full ring-8 ${config.iconBg} ${config.iconRing}`}
                >
                  <Icon
                    className={`h-10 w-10 ${config.iconColor} ${
                      config.iconMotion || ""
                    }`}
                    style={
                      config.iconMotion === "animate-ctex-shake"
                        ? { animationDelay: "700ms" }
                        : undefined
                    }
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </div>
              </div>
            )}
          </div>

          <h1
            className="animate-ctex-rise relative mt-6 font-display text-2xl font-bold tracking-tight text-ctex-text sm:text-3xl"
            style={{ animationDelay: "200ms" }}
          >
            {config.title}
          </h1>

          <p
            className="animate-ctex-rise relative mx-auto mt-2 max-w-md text-sm leading-6 text-ctex-text-muted sm:text-base"
            style={{ animationDelay: "280ms" }}
          >
            {status === "SUCCESS" && link?.title ? (
              <>
                Your payment for{" "}
                <span className="font-semibold text-ctex-text">
                  {link.title}
                </span>{" "}
                was successful.
              </>
            ) : (
              config.description
            )}
          </p>

          <span
            className={`animate-ctex-rise relative mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 ring-inset ${config.pill}`}
            style={{ animationDelay: "360ms" }}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${config.dot} ${
                isPending ? "animate-pulse" : ""
              }`}
            />
            {status === "SUCCESS"
              ? "Payment successful"
              : isPending
                ? "Awaiting confirmation"
                : status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        </div>

        {/* Receipt divider with notches */}
        <div className="relative" aria-hidden="true">
          <div className="border-t border-dashed border-ctex-border" />
          <span className="absolute left-0 top-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ctex-border bg-ctex-bg" />
          <span className="absolute right-0 top-0 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full border border-ctex-border bg-ctex-bg" />
        </div>

        {/* Receipt body */}
        <div className="px-6 pb-9 pt-8 sm:px-10">
          {/* Amount + ticket-id grid */}
          <dl
            className="animate-ctex-rise grid grid-cols-2 gap-6"
            style={{ animationDelay: "420ms" }}
          >
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-ctex-text-muted">
                {status === "SUCCESS" ? "Ticket ID" : "Reference"}
              </dt>
              <dd className="mt-1.5 break-all font-mono text-sm font-semibold text-ctex-text">
                {reference ? reference.slice(-16) : "—"}
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-ctex-text-muted">
                Amount
              </dt>
              <dd className="mt-1 font-display text-xl font-bold tracking-tight text-ctex-text tabular-nums sm:text-2xl">
                {amount}
              </dd>
            </div>
          </dl>

          {/* Date row */}
          <dl
            className="animate-ctex-rise mt-6 grid grid-cols-2 gap-6 border-t border-dashed border-ctex-border pt-5"
            style={{ animationDelay: "480ms" }}
          >
            <div className="col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-ctex-text-muted">
                Date &amp; time
              </dt>
              <dd className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-ctex-text">
                <CalendarDays className="h-3.5 w-3.5 text-ctex-text-muted" />
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
              delay={540}
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
                delay={600}
              />
            ) : null}
          </div>

          {/* Reassurance note */}
          <div
            className="animate-ctex-rise mt-7 flex items-start justify-center gap-2.5 px-2 text-center"
            style={{ animationDelay: "680ms" }}
          >
            <ShieldCheck
              className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconColor}`}
            />
            <p className="max-w-md text-xs leading-5 text-ctex-text-muted sm:text-sm">
              {status === "SUCCESS"
                ? "A confirmation has been recorded. You can safely close this page."
                : config.note ||
                  "This page will reflect the status once confirmation is available."}
            </p>
          </div>
        </div>

        {/* Branded footer */}
        <footer className="flex items-center justify-center border-t border-ctex-border bg-ctex-elevated/60 px-6 py-4">
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-ctex-text-muted">
            <img
              src={ImageLogo.Logo2}
              alt="C-TEX PAY"
              className="inline-block h-3.5 w-[60px] object-contain align-middle"
            />
            <span>Payment Simplified.</span>
          </p>
        </footer>
      </section>

      <p className="mt-5 text-center text-xs text-ctex-text-muted/80">
        Payments processed securely by CTEX PAY.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail row                                                         */
/* ------------------------------------------------------------------ */

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  copyValue,
  copied,
  onCopy,
  delay = 0,
}) {
  return (
    <div
      className={[
        "animate-ctex-rise flex items-center gap-3 rounded-2xl border border-ctex-border bg-ctex-elevated/50 p-4 transition-colors",
        copied ? "animate-ctex-flash" : "",
      ].join(" ")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ctex-surface ring-1 ring-ctex-border">
        <Icon className="h-5 w-5 text-ctex-text-muted" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs text-ctex-text-muted">{label}</div>
        <div
          className={[
            "mt-0.5 break-all text-sm font-semibold text-ctex-text",
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ctex-border bg-ctex-surface text-ctex-text-muted transition duration-200 hover:border-ctex-blue/40 hover:bg-ctex-blue/10 hover:text-ctex-blue focus:outline-none focus:ring-2 focus:ring-ctex-blue focus:ring-offset-2 active:scale-95"
        >
          {copied ? (
            <Check className="animate-ctex-pop h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      ) : null}
    </div>
  );
}