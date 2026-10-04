export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ctex-bg text-ctex-text">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-ctex-blue shadow-[0_0_0_3px_rgba(255,255,255,0.5)]" />
        <span className="text-sm text-ctex-text-muted">Getting You Started…</span>
      </div>
    </div>
  );
}