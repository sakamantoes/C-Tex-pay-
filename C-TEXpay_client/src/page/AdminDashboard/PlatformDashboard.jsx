import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Building2,
  Clock,
  History,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

function formatMoneyMinor(amount, currency = "NGN") {
  if (amount == null) return "Not recorded";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);
}

/* --------------------------------------------------------------------------
   Presentation helpers (no data/logic changes)
   -------------------------------------------------------------------------- */
const compactNumber = new Intl.NumberFormat("en-NG", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentOf = (part, total) =>
  total > 0 ? Math.round((Number(part || 0) / total) * 100) : 0;

/* Brand tones (from the landing page icon chips) */
const TONES = {
  blue: {
    background: "linear-gradient(135deg,#2f95de,#0B68AD)",
    boxShadow: "0 10px 22px -10px #0B68AD",
  },
  green: {
    background: "linear-gradient(135deg,#22C55E,#15803D)",
    boxShadow: "0 10px 22px -10px #15803D",
  },
  orange: {
    background: "linear-gradient(135deg,#FBBF24,#EA580C)",
    boxShadow: "0 10px 22px -10px #EA580C",
  },
  oxblood: {
    background: "linear-gradient(135deg,#9F1239,#4C0519)",
    boxShadow: "0 10px 22px -10px #7F1D1D",
  },
};

const HERO_BG = "linear-gradient(160deg,#2f95de 0%,#0B68AD 100%)";

/* Icon + tone per stat card label */
const CARD_META = {
  Merchants: { icon: Building2, tone: "blue" },
  "Registered users": { icon: Users, tone: "green" },
  Transactions: { icon: Receipt, tone: "orange" },
  "Successful volume": { icon: TrendingUp, tone: "blue" },
  "Pending transactions": { icon: Clock, tone: "orange" },
  "Confirmed provider fees": { icon: Banknote, tone: "oxblood" },
  "C-TEX withdrawal charges": { icon: Wallet, tone: "green" },
};

function StatusPill({ status }) {
  const value = String(status || "").toLowerCase();
  const tone = value.includes("success")
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : value.includes("fail")
      ? "bg-red-500/10 text-red-600 dark:text-red-400"
      : value.includes("pend")
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-ctex-panel text-ctex-text-muted";
  const dot = value.includes("success")
    ? "bg-emerald-500"
    : value.includes("fail")
      ? "bg-red-500"
      : value.includes("pend")
        ? "bg-amber-500"
        : "bg-ctex-text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

/* Pill used on the blue hero card */
function HeroPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-white/80" />
      {children}
    </span>
  );
}

/* Thin vertical bars, filled up to `ratio` (0–1) */
function BarMeter({ ratio, bars = 40 }) {
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * bars);
  return (
    <div className="flex h-7 items-stretch gap-[3px]" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={[
            "min-w-0 flex-1 rounded-full",
            i < filled ? "bg-ctex-accent" : "bg-ctex-border",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

/* Line + area chart over the loaded recent payments (oldest → newest) */
function TrendChart({ points, currency }) {
  const [hover, setHover] = useState(null);

  const W = 640;
  const H = 240;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const n = points.length;

  const rawMax = Math.max(...points.map((p) => p.value), 1);
  const step = Math.pow(10, Math.floor(Math.log10(rawMax))) / 2;
  const niceMax = Math.ceil(rawMax / step) * step;

  const x = (i) =>
    n === 1 ? (padL + W - padR) / 2 : padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - v / niceMax) * (H - padT - padB);

  const ticks = [0, 1, 2, 3, 4].map((t) => (niceMax / 4) * t);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`,
    )
    .join(" ");
  const areaPath =
    n > 1
      ? `${path} L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
      : null;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(x(i) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const active = hover != null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Recent payment amounts"
      >
        <defs>
          <linearGradient id="ctexPlatformFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              style={{ stopColor: "var(--ctex-accent)", stopOpacity: 0.28 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--ctex-accent)", stopOpacity: 0 }}
            />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--ctex-border)"
              strokeDasharray="3 4"
            />
            <text
              x={padL - 8}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="var(--ctex-text-muted)"
            >
              {compactNumber.format(t / 100)}
            </text>
          </g>
        ))}

        {points.map((p, i) => (
          <text
            key={p.id}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ctex-text-muted)"
          >
            {p.label}
          </text>
        ))}

        {areaPath && <path d={areaPath} fill="url(#ctexPlatformFill)" />}

        {active && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={padT}
            y2={H - padB}
            stroke="var(--ctex-border)"
          />
        )}

        <path
          d={path}
          fill="none"
          stroke="var(--ctex-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <circle
            key={`dot-${p.id}`}
            cx={x(i)}
            cy={y(p.value)}
            r="2.5"
            fill="var(--ctex-accent)"
          />
        ))}

        {active && (
          <circle
            cx={x(hover)}
            cy={y(active.value)}
            r="5"
            fill="var(--ctex-surface)"
            stroke="var(--ctex-accent)"
            strokeWidth="2.5"
          />
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-2xl border border-ctex-border bg-ctex-surface px-3 py-2 shadow-lg shadow-black/10"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: `${(y(active.value) / H) * 100}%`,
          }}
        >
          <p className="text-[11px] text-ctex-text-muted">{active.date}</p>
          <p className="text-sm font-semibold text-ctex-text">
            {formatMoneyMinor(active.raw, currency)}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PlatformDashboard({ platformRole }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const basePath = platformRole === "SUPER_ADMIN" ? "/super-admin" : "/admin";

  useEffect(() => {
    let active = true;
    const requests = [
      platformAdminService.getOverview(),
      platformAdminService.getPayments({
        page: 1,
        limit: 8,
        sortBy: "createdAt",
        sortDir: "DESC",
      }),
    ];
    if (platformRole === "SUPER_ADMIN")
      requests.push(platformAdminService.getFinancialSummary());
    Promise.allSettled(requests).then(
      ([summaryResult, paymentsResult, financialResult]) => {
        if (!active) return;
        const errors = [];
        if (summaryResult.status === "fulfilled")
          setSummary(summaryResult.value.data);
        else
          errors.push(
            summaryResult.reason.response?.data?.message ||
              "Could not load overview metrics.",
          );
        if (paymentsResult.status === "fulfilled")
          setPayments(paymentsResult.value.data?.payments || []);
        else
          errors.push(
            paymentsResult.reason.response?.data?.message ||
              "Could not load recent transactions.",
          );
        if (
          platformRole === "SUPER_ADMIN" &&
          financialResult?.status === "fulfilled"
        ) {
          const financial = financialResult.value;
          if (financial.payments.confirmedProviderChargesAvailable === false) {
            financial.payments.confirmedProviderCharges = null;
          }
          setFinancialSummary(financial);
        }
        if (errors.length) setError(errors.join(" "));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [platformRole]);

  const navSections = useMemo(
    () => [
      {
        title: "Platform",
        items: [
          {
            key: "dashboard",
            label: "Dashboard",
            icon: "dashboard",
            path: `${basePath}/dashboard`,
          },
          {
            key: "merchants",
            label: "Merchants",
            icon: "business",
            path: `${basePath}/merchants`,
          },
          {
            key: "users",
            label: "Users",
            icon: "userCheck",
            path: "/super-admin/users",
          },
          {
            key: "transactions",
            label: "Transactions",
            icon: "transactions",
            path: `${basePath}/transactions`,
          },
          ...(platformRole === "SUPER_ADMIN"
            ? [
                {
                  key: "financials",
                  label: "Financial breakdown",
                  icon: "fees",
                  path: "/super-admin/financials",
                },
                {
                  key: "withdrawal-fees",
                  label: "Withdrawal charges",
                  icon: "fees",
                  path: "/super-admin/withdrawal-fees",
                },
              ]
            : []),
          {
            key: "fees",
            label: "Fee configuration",
            icon: "fees",
            path: `${basePath}/fees`,
          },
          {
            key: "audit-logs",
            label: "Audit logs",
            icon: "security",
            path: `${basePath}/audit-logs`,
          },
        ],
      },
    ],
    [basePath, platformRole],
  );

  const displayName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || platformRole;
  const greetingName = user?.firstName || "there";
  const cards = [
    {
      label: "Merchants",
      value: summary?.merchants.total ?? "—",
      detail: `${summary?.merchants.active ?? 0} active · ${summary?.merchants.pending ?? 0} pending`,
    },
    {
      label: "Registered users",
      value: summary?.users.total ?? "—",
      detail: "All registered platform accounts",
    },
    {
      label: "Transactions",
      value: summary?.transactions.total ?? "—",
      detail: `${summary?.transactions.successful ?? 0} successful · ${summary?.transactions.failed ?? 0} failed`,
    },
    {
      label: "Successful volume",
      value: summary
        ? formatMoneyMinor(
            summary.transactions.successfulVolumeMinor,
            summary.currency,
          )
        : "—",
      detail: `${summary?.transactions.successful ?? 0} successful payments`,
    },
    {
      label: "Pending transactions",
      value: summary?.transactions.pending ?? "—",
      detail: "Across all merchant accounts",
    },
    ...(platformRole === "SUPER_ADMIN"
      ? [
          {
            label: "Confirmed provider fees",
            value: financialSummary
              ? formatMoneyMinor(
                  financialSummary.payments.confirmedProviderCharges,
                  summary?.currency,
                )
              : "—",
            detail: "Only confirmed fee records",
          },
          {
            label: "C-TEX withdrawal charges",
            value: financialSummary
              ? formatMoneyMinor(
                  financialSummary.withdrawals.ctexWithdrawalChargesCollected,
                  summary?.currency,
                )
              : "—",
            detail: "Collected from successful withdrawals",
          },
        ]
      : []),
  ];

  /* ---------- Derived display data (from the same fetched state) ---------- */
  const merchantTotal = Number(summary?.merchants.total || 0);
  const merchantActive = Number(summary?.merchants.active || 0);

  const txTotal = Number(summary?.transactions.total || 0);
  const txBreakdown = [
    {
      key: "successful",
      label: "successful",
      value: Number(summary?.transactions.successful || 0),
      dot: "bg-emerald-500",
    },
    {
      key: "failed",
      label: "failed",
      value: Number(summary?.transactions.failed || 0),
      dot: "bg-red-500",
    },
    {
      key: "pending",
      label: "pending",
      value: Number(summary?.transactions.pending || 0),
      dot: "bg-amber-400",
    },
  ];
  const txRemainder = Math.max(
    0,
    txTotal - txBreakdown.reduce((s, r) => s + r.value, 0),
  );

  const chartPoints = useMemo(
    () =>
      [...payments].reverse().map((p) => {
        const created = p.createdAt ? new Date(p.createdAt) : null;
        return {
          id: p.id,
          raw: p.amount,
          value: Number(p.amount || 0),
          label: created
            ? created.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : "—",
          date: created ? created.toLocaleString() : "—",
        };
      }),
    [payments],
  );

  const volumeCard = cards.find((c) => c.label === "Successful volume");

  const statGridCols =
    cards.length >= 7
      ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";

  const panelCard =
    "rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6";

  return (
    <DashboardLayout
      title={platformRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
      subtitle="Platform operations"
      navSections={navSections}
      profileName={displayName}
      profileRole={user?.role}
    >
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {error}
        </div>
      )}

      {/* ---------- Hero ---------- */}
      <section
        aria-label="Platform overview"
        className="relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8"
        style={{ background: HERO_BG }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/70">
              Platform operations
            </p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
              Welcome back, {greetingName}
            </h2>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <HeroPill icon={BadgeCheck}>
                {platformRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
              </HeroPill>
              <HeroPill icon={Building2}>
                {loading ? "…" : `${summary?.merchants.total ?? 0} merchants`}
              </HeroPill>
              <HeroPill icon={Activity}>
                {loading
                  ? "…"
                  : `${summary?.transactions.pending ?? 0} pending`}
              </HeroPill>
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <div className="lg:text-right">
              <p className="text-xs text-white/70">{volumeCard.label}</p>
              {loading ? (
                <div className="mt-1 h-8 w-44 animate-pulse rounded bg-white/20" />
              ) : (
                <p className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                  {volumeCard.value}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(`${basePath}/transactions`)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0B3E66] transition hover:-translate-y-px hover:bg-white/90"
              >
                <Receipt className="h-4 w-4" />
                View transactions
              </button>
              <button
                type="button"
                onClick={() => navigate(`${basePath}/merchants`)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
              >
                Merchants
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Stat cards ---------- */}
      <section
        aria-label="Platform metrics"
        className={`mt-4 grid grid-cols-1 gap-4 ${statGridCols}`}
      >
        {cards.map((card) => {
          const meta = CARD_META[card.label] || {
            icon: Activity,
            tone: "blue",
          };
          const Icon = meta.icon;
          return (
            <div
              key={card.label}
              className="rounded-[24px] border border-ctex-border bg-ctex-surface p-5 transition hover:-translate-y-0.5 hover:border-ctex-accent/40"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={TONES[meta.tone]}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </span>
              <p className="mt-4 text-xs font-medium text-ctex-text-muted">
                {card.label}
              </p>
              {loading ? (
                <div className="mt-2 h-7 w-28 animate-pulse rounded bg-ctex-border" />
              ) : (
                <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-ctex-text">
                  {card.value}
                </p>
              )}
              <p className="mt-1.5 text-xs text-ctex-text-muted">
                {card.detail}
              </p>
            </div>
          );
        })}
      </section>

      {/* ---------- Chart + side panels ---------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Volume chart */}
        <div className={panelCard}>
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-ctex-accent">
            {volumeCard.label}
          </p>
          {loading ? (
            <div className="mt-2 h-8 w-40 animate-pulse rounded bg-ctex-panel" />
          ) : (
            <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-ctex-text sm:text-3xl">
              {volumeCard.value}
            </p>
          )}
          <p className="mt-1.5 text-xs text-ctex-text-muted">
            {volumeCard.detail}
          </p>
          <div className="mt-5 rounded-2xl bg-ctex-panel/60 p-3 sm:p-4">
            {loading && chartPoints.length === 0 ? (
              <div className="h-[220px] animate-pulse rounded-xl bg-ctex-panel" />
            ) : chartPoints.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-ctex-text-muted">
                No transactions found.
              </div>
            ) : (
              <TrendChart points={chartPoints} currency={summary?.currency} />
            )}
          </div>
        </div>

        <div className="grid gap-4">
          {/* Merchants meter */}
          <div className={panelCard}>
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={TONES.blue}
              >
                <Building2 size={16} strokeWidth={2.2} />
              </span>
              <p className="text-sm font-semibold text-ctex-text">
                {cards[0].label}
              </p>
            </div>
            {loading ? (
              <div className="mt-4 h-8 w-24 animate-pulse rounded bg-ctex-panel" />
            ) : (
              <p className="mt-4 text-3xl font-semibold tracking-tight text-ctex-text">
                {cards[0].value}
              </p>
            )}
            <p className="mt-1 text-xs text-ctex-text-muted">
              {cards[0].detail}
            </p>
            <div className="mt-5">
              <BarMeter
                ratio={merchantTotal > 0 ? merchantActive / merchantTotal : 0}
              />
            </div>
          </div>

          {/* Transactions breakdown */}
          <div className={panelCard}>
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={TONES.orange}
              >
                <Activity size={16} strokeWidth={2.2} />
              </span>
              <p className="text-sm font-semibold text-ctex-text">
                Transactions
              </p>
            </div>
            <div
              className="mt-5 flex h-8 gap-1.5 overflow-hidden rounded-xl"
              aria-hidden="true"
            >
              {txTotal > 0 ? (
                <>
                  {txBreakdown.map(
                    (row) =>
                      row.value > 0 && (
                        <span
                          key={row.key}
                          className={`${row.dot} rounded-lg`}
                          style={{ flexGrow: row.value, flexBasis: 0 }}
                        />
                      ),
                  )}
                  {txRemainder > 0 && (
                    <span
                      className="rounded-lg bg-ctex-border"
                      style={{ flexGrow: txRemainder, flexBasis: 0 }}
                    />
                  )}
                </>
              ) : (
                <span className="flex-1 rounded-lg bg-ctex-border" />
              )}
            </div>
            <ul className="mt-4 space-y-1">
              {txBreakdown.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center gap-3 rounded-2xl bg-ctex-panel/60 px-3 py-2.5 text-sm"
                >
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${row.dot}`}
                  />
                  <span className="flex-1 capitalize text-ctex-text">
                    {row.label}
                  </span>
                  <span className="w-12 text-right text-ctex-text-muted">
                    {summary ? `${percentOf(row.value, txTotal)}%` : "—"}
                  </span>
                  <span className="w-16 text-right font-semibold text-ctex-text">
                    {summary ? row.value : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ---------- Recent transactions ---------- */}
      <section className="mt-4 rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={TONES.blue}
            >
              <History size={16} strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ctex-text">
                Recent platform transactions
              </h2>
              <p className="mt-0.5 text-xs text-ctex-text-muted">
                Latest payment records across merchant accounts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${basePath}/transactions`)}
            className="rounded-full border border-ctex-border bg-ctex-surface px-4 py-2 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel"
          >
            View transactions
          </button>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead className="text-xs text-ctex-text-muted">
              <tr>
                <th className="whitespace-nowrap bg-ctex-panel px-4 py-3 font-medium first:rounded-l-xl">
                  Payment reference
                </th>
                <th className="bg-ctex-panel px-4 py-3 font-medium">
                  Merchant
                </th>
                <th className="bg-ctex-panel px-4 py-3 font-medium">Amount</th>
                <th className="bg-ctex-panel px-4 py-3 font-medium">Status</th>
                <th className="bg-ctex-panel px-4 py-3 font-medium last:rounded-r-xl">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-ctex-text-muted"
                  >
                    Loading transactions…
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-ctex-text-muted"
                  >
                    No transactions found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="group">
                    <td className="whitespace-nowrap border-b border-ctex-border px-4 py-3.5 group-hover:bg-ctex-panel/60">
                      <span className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: "rgba(11,104,173,.12)",
                            color: "#2f95de",
                          }}
                        >
                          <ArrowLeftRight size={14} />
                        </span>
                        <span className="font-mono text-xs text-ctex-text">
                          {payment.paymentReference}
                        </span>
                      </span>
                    </td>
                    <td className="border-b border-ctex-border px-4 py-3.5 font-mono text-xs text-ctex-text-muted group-hover:bg-ctex-panel/60">
                      {payment.merchantId?.slice(0, 8) || "—"}
                    </td>
                    <td className="whitespace-nowrap border-b border-ctex-border px-4 py-3.5 text-sm font-semibold text-ctex-text group-hover:bg-ctex-panel/60">
                      {formatMoneyMinor(payment.amount, payment.currency)}
                    </td>
                    <td className="border-b border-ctex-border px-4 py-3.5 group-hover:bg-ctex-panel/60">
                      <StatusPill status={payment.status} />
                    </td>
                    <td className="whitespace-nowrap border-b border-ctex-border px-4 py-3.5 text-xs text-ctex-text-muted group-hover:bg-ctex-panel/60">
                      {payment.createdAt
                        ? new Date(payment.createdAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
