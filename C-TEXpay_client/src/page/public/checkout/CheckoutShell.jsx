import { Lock, ShieldCheck } from "lucide-react";

export default function CheckoutShell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4 py-8 sm:py-12">
      {/* Top brand bar */}
      <header className="mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
          <Lock className="h-3 w-3 text-emerald-600" aria-hidden="true" />
          Secure payment
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-3xl">{children}</main>

      {/* Footer trust signals */}
      <footer className="mx-auto mt-8 max-w-3xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck
              className="h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
            <span>
              Protected by C-TEX PAY · Your payment details are never shared
              with third parties
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-sm">
        <span className="text-sm font-bold text-white">C</span>
      </div>
      <span className="text-base font-semibold tracking-tight text-slate-900">
        C-TEX <span className="text-indigo-600">PAY</span>
      </span>
    </div>
  );
}