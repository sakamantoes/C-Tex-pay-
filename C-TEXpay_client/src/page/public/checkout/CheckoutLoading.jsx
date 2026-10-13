export default function CheckoutLoading() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04]">
      <div className="animate-pulse p-8">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="mt-4 h-6 w-3/4 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-full rounded bg-slate-100" />
        <div className="mt-6 h-24 w-full rounded-xl bg-slate-100" />
        <div className="mt-6 space-y-3">
          <div className="h-10 w-full rounded-lg bg-slate-100" />
          <div className="h-10 w-full rounded-lg bg-slate-100" />
          <div className="h-10 w-full rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}