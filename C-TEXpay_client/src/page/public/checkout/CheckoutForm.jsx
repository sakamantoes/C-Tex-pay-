import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  ShoppingBag,
  User,
} from "lucide-react";
import CheckoutHero from "./CheckoutHero ";

const MIN_NAIRA = 50;
const MAX_NAIRA = 10_000_000;

const CARD =
  "rounded-3xl border border-ctex-border bg-ctex-surface shadow-[0_24px_70px_-40px_rgba(11,18,32,0.35)]";

const INPUT_CLASS =
  "w-full rounded-xl border border-ctex-border bg-ctex-surface py-3 pl-10 pr-3.5 text-sm text-ctex-text placeholder:text-ctex-text-muted/60 transition hover:ring-1 hover:ring-ctex-blue/30 focus:outline-none focus:ring-2 focus:ring-ctex-blue";

function formatKoboAsNaira(kobo) {
  const n = Number(kobo);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(n / 100);
}

export default function CheckoutForm({ link, submitting, error, onSubmit }) {
  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [amountNaira, setAmountNaira] = useState("");
  const [localError, setLocalError] = useState(null);

  const isCustom = link.amountType === "CUSTOM";

  const amountPreview = useMemo(() => {
    if (!isCustom) return formatKoboAsNaira(link.amount);
    const n = Number(amountNaira);
    if (!Number.isFinite(n) || n <= 0) return "—";
    return formatKoboAsNaira(Math.round(n * 100));
  }, [isCustom, amountNaira, link.amount]);

  const validate = () => {
    if (!customer.firstName.trim()) return "First name is required";
    if (!customer.lastName.trim()) return "Last name is required";
    if (!customer.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
      return "Please enter a valid email address";
    }
    if (isCustom) {
      const n = Number(amountNaira);
      if (!Number.isFinite(n) || n <= 0) return "Amount is required";
      if (n < MIN_NAIRA) return `Minimum is ₦${MIN_NAIRA.toLocaleString()}`;
      if (n > MAX_NAIRA) return `Maximum is ₦${MAX_NAIRA.toLocaleString()}`;
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError(null);
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    try {
      await onSubmit({ customer, amountNaira });
    } catch {
      // parent sets its own error
    }
  };

  const displayedError = localError || error;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start lg:gap-8">
      {/* Left: hero + order summary */}
      <aside className="space-y-6 lg:col-span-2 lg:sticky lg:top-6">
        <CheckoutHero
          tone="blue"
          icon={ShieldCheck}
          artBadge={Lock}
          pill={
            <>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Secure checkout
            </>
          }
          title="Complete your payment"
          description="Make a quick and secure payment to continue with your order."
        />

        <section className={`${CARD} p-5 sm:p-6`}>
          <div className="flex items-center gap-3">
            <IconTile>
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </IconTile>
            <div>
              <h2 className="font-display text-base font-bold text-ctex-text">
                Order summary
              </h2>
              <p className="text-xs text-ctex-text-muted">
                Here are the details of your payment
              </p>
            </div>
          </div>

          {/* Merchant branding */}
          {link.logoUrl || link.businessName ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-ctex-border p-3.5">
              {link.logoUrl ? (
                <img
                  src={link.logoUrl}
                  alt={link.businessName || "Business logo"}
                  style={{ maxWidth: "none" }}
                  className="h-12 w-12 flex-shrink-0 rounded-xl object-cover ring-1 ring-ctex-border"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-ctex-blue text-base font-bold text-white">
                  {(link.businessName || "B").trim().charAt(0).toUpperCase()}
                </div>
              )}
              {link.businessName ? (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ctex-text">
                    {link.businessName}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-ctex-blue">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Verified merchant
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5">
            <p className="text-xs text-ctex-text-muted">You're paying</p>
            <h3 className="mt-1 text-base font-semibold leading-snug text-ctex-text">
              {link.title}
            </h3>
            {link.description ? (
              <p className="mt-2 text-sm leading-relaxed text-ctex-text-muted">
                {link.description}
              </p>
            ) : null}
          </div>

          <div className="mt-5 rounded-2xl bg-ctex-elevated p-4 ring-1 ring-ctex-border">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ctex-text">
                Total amount
              </span>
              <span className="break-words text-right font-display text-2xl font-bold tracking-tight text-ctex-blue tabular-nums">
                {amountPreview}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-ctex-text-muted">
              {!isCustom
                ? "Fixed amount set by the merchant"
                : "You choose the amount"}
            </p>
          </div>

          {link.expiresAt ? (
            <p className="mt-4 flex items-center gap-2 text-xs text-ctex-text-muted">
              <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                This link expires on{" "}
                {new Date(link.expiresAt).toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                .
              </span>
            </p>
          ) : null}
        </section>
      </aside>

      {/* Right: form */}
      <section className={`${CARD} p-5 sm:p-8 lg:col-span-3`}>
        <div className="flex items-center gap-3">
          <IconTile>
            <User className="h-5 w-5" aria-hidden="true" />
          </IconTile>
          <div>
            <h2 className="font-display text-lg font-bold text-ctex-text">
              Enter your details
            </h2>
            <p className="text-sm text-ctex-text-muted">
              We'll use these to confirm your payment.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          {isCustom ? (
            <FormField
              label="Amount (NGN)"
              required
              leading={<span className="text-sm font-bold">₦</span>}
            >
              <input
                type="number"
                inputMode="decimal"
                min={MIN_NAIRA}
                max={MAX_NAIRA}
                step="0.01"
                required
                value={amountNaira}
                onChange={(e) => setAmountNaira(e.target.value)}
                className={`${INPUT_CLASS} text-base font-semibold tabular-nums`}
                placeholder="5,000.00"
              />
            </FormField>
          ) : null}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              label="First name"
              required
              leading={<User className="h-4 w-4" aria-hidden="true" />}
            >
              <input
                type="text"
                autoComplete="given-name"
                required
                value={customer.firstName}
                onChange={(e) =>
                  setCustomer((c) => ({ ...c, firstName: e.target.value }))
                }
                className={INPUT_CLASS}
                placeholder="Enter first name"
              />
            </FormField>

            <FormField
              label="Last name"
              required
              leading={<User className="h-4 w-4" aria-hidden="true" />}
            >
              <input
                type="text"
                autoComplete="family-name"
                required
                value={customer.lastName}
                onChange={(e) =>
                  setCustomer((c) => ({ ...c, lastName: e.target.value }))
                }
                className={INPUT_CLASS}
                placeholder="Enter last name"
              />
            </FormField>
          </div>

          <FormField
            label="Email address"
            required
            leading={<Mail className="h-4 w-4" aria-hidden="true" />}
          >
            <input
              type="email"
              autoComplete="email"
              required
              value={customer.email}
              onChange={(e) =>
                setCustomer((c) => ({ ...c, email: e.target.value }))
              }
              className={INPUT_CLASS}
              placeholder="you@example.com"
            />
          </FormField>

          <FormField
            label="Phone number (optional)"
            leading={<Phone className="h-4 w-4" aria-hidden="true" />}
          >
            <input
              type="tel"
              autoComplete="tel"
              value={customer.phone}
              onChange={(e) =>
                setCustomer((c) => ({ ...c, phone: e.target.value }))
              }
              className={INPUT_CLASS}
              placeholder="080 1234 5678"
            />
          </FormField>

          {displayedError ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-red-500/10 px-3.5 py-3 text-sm text-red-700 ring-1 ring-red-500/30 dark:text-red-300"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                aria-hidden="true"
              />
              <span>{displayedError}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-ctex-blue px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/30 transition hover:bg-ctex-blue-light focus:outline-none focus:ring-4 focus:ring-ctex-blue/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Initializing payment…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 opacity-80" aria-hidden="true" />
                Pay {amountPreview}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </>
            )}
          </button>

          <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-ctex-text-muted">
            <ShieldCheck
              className="h-3.5 w-3.5 shrink-0 text-ctex-blue"
              aria-hidden="true"
            />
            You'll receive bank transfer details on the next screen.
          </p>
        </form>
      </section>
    </div>
  );
}

function IconTile({ children }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ctex-blue/10 text-ctex-blue ring-1 ring-ctex-blue/15">
      {children}
    </div>
  );
}

function FormField({ label, required, leading, children }) {
  return (
    <label className="group block">
      <span className="mb-1.5 block text-xs font-semibold text-ctex-text">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-ctex-text-muted transition-colors group-focus-within:text-ctex-blue">
            {leading}
          </span>
        ) : null}
        {children}
      </div>
    </label>
  );
}