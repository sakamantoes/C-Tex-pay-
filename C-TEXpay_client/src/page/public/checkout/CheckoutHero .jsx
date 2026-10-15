const TONES = {
  blue: {
    bg: "from-ctex-blue to-[hsl(205.56_88.04%_20%)]",
    badge: "text-ctex-blue",
  },
  emerald: {
    bg: "from-emerald-500 to-emerald-800",
    badge: "text-emerald-600",
  },
  red: {
    bg: "from-red-500 to-red-800",
    badge: "text-red-600",
  },
  amber: {
    bg: "from-amber-500 to-amber-700",
    badge: "text-amber-600",
  },
  slate: {
    bg: "from-slate-500 to-slate-800",
    badge: "text-slate-600",
  },
};

/**
 * Shared gradient banner used by the checkout form, transfer
 * instructions and payment status screens.
 */
export default function CheckoutHero({
  tone = "blue",
  pill,
  icon: Icon,
  artBadge: ArtBadge,
  title,
  description,
  children,
}) {
  const t = TONES[tone] || TONES.blue;

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-linear-to-br ${t.bg} p-6 text-white shadow-[0_28px_60px_-30px_rgba(3,60,110,0.75)] sm:p-8`}
    >
      {/* Decorative rings and glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative flex items-center justify-between gap-5">
        <div className="min-w-0">
          {pill ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur">
              {pill}
            </span>
          ) : null}

          <h1 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
              {description}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <div className="relative shrink-0" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-white/25 blur-2xl" />
            <div className="relative flex h-24 w-24 -rotate-6 items-center justify-center rounded-[28px] bg-linear-to-br from-white/40 to-white/5 shadow-2xl shadow-black/25 ring-1 ring-white/35 backdrop-blur sm:h-28 sm:w-28">
              <Icon
                className="h-11 w-11 text-white drop-shadow-md sm:h-12 sm:w-12"
                strokeWidth={1.5}
                style={{ maxWidth: "none" }}
              />
            </div>
            {ArtBadge ? (
              <div
                className={`absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white/20 ${t.badge}`}
              >
                <ArtBadge className="h-5 w-5" style={{ maxWidth: "none" }} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {children ? <div className="relative mt-6">{children}</div> : null}
    </section>
  );
}