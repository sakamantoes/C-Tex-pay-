import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Loader2, Wallet } from "lucide-react";

const MIN_NAIRA = 50;
const MAX_NAIRA = 10_000_000;

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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04]">
      <div className="grid grid-cols-1 md:grid-cols-5">
        {/* Left: Merchant summary */}
        <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 md:col-span-2 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Wallet className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              You're paying
            </span>
          </div>

          <h1 className="mt-4 text-lg font-semibold leading-snug text-slate-900">
            {link.title}
          </h1>

          {link.description ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {link.description}
            </p>
          ) : null}

          <div className="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Amount
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {amountPreview}
            </div>
            {!isCustom ? (
              <div className="mt-1 text-xs text-slate-500">
                Fixed amount set by the merchant
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-500">
                You choose the amount
              </div>
            )}
          </div>

          {link.expiresAt ? (
            <p className="mt-4 text-xs text-slate-500">
              This link expires on{" "}
              {new Date(link.expiresAt).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              .
            </p>
          ) : null}
        </div>

        {/* Right: Form */}
        <div className="p-6 md:col-span-3 md:p-8">
          <h2 className="text-base font-semibold text-slate-900">
            Enter your details
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            We'll use these to confirm your payment.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isCustom ? (
              <FormField label="Amount (NGN)" required>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-slate-500">
                    ₦
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={MIN_NAIRA}
                    max={MAX_NAIRA}
                    step="0.01"
                    required
                    value={amountNaira}
                    onChange={(e) => setAmountNaira(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="5,000.00"
                  />
                </div>
              </FormField>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="First name" required>
                <input
                  type="text"
                  autoComplete="given-name"
                  required
                  value={customer.firstName}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, firstName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </FormField>

              <FormField label="Last name" required>
                <input
                  type="text"
                  autoComplete="family-name"
                  required
                  value={customer.lastName}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, lastName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </FormField>
            </div>

            <FormField label="Email" required>
              <input
                type="email"
                autoComplete="email"
                required
                value={customer.email}
                onChange={(e) =>
                  setCustomer((c) => ({ ...c, email: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                placeholder="you@example.com"
              />
            </FormField>

            <FormField label="Phone (optional)">
              <input
                type="tel"
                autoComplete="tel"
                value={customer.phone}
                onChange={(e) =>
                  setCustomer((c) => ({ ...c, phone: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                placeholder="080 1234 5678"
              />
            </FormField>

            {displayedError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
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
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Initializing payment…
                </>
              ) : (
                <>
                  Pay {amountPreview}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>

            <p className="pt-1 text-center text-xs text-slate-500">
              You'll receive bank transfer details on the next screen.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}