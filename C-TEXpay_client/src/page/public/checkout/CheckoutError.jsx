import { AlertTriangle, RefreshCw } from "lucide-react";

export default function CheckoutError({ title, message, onRetry }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04]">
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-100/60">
          <AlertTriangle className="h-7 w-7 text-red-600" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          {message}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}