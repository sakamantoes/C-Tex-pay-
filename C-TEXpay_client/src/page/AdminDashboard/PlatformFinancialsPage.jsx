import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

const LIMIT = 25;

/* ============================================================
 * Helpers
 * ============================================================ */

const money = (value) =>
  value == null
    ? "Not recorded"
    : new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
      }).format(Number(value) / 100);

function renderSettlement(
  amount,
  kind,
  reportedFallback,
  missingReason,
  expectedAmount
) {
  if (amount != null) {
    return {
      label: money(amount),
      tone: kind === "ACTUAL" ? "confirmed" : "info",
    };
  }
  if (kind === "PROVIDER_REPORTED" && reportedFallback != null) {
    return {
      label: `Awaiting bank (reported ${money(reportedFallback)})`,
      tone: "pending",
    };
  }
  if (kind === "EXPECTED_ONLY") {
    return {
      label: `Awaiting provider (expected ${money(expectedAmount)})`,
      tone: "pending",
    };
  }
  if (kind === "DISCREPANCY") {
    return { label: "Discrepancy", tone: "danger" };
  }
  return { label: missingReason || "Unknown", tone: "muted" };
}

const toneClasses = {
  confirmed: "text-emerald-500",
  info: "text-ctex-blue",
  pending: "text-amber-500",
  danger: "text-red-500",
  muted: "text-ctex-text-muted",
};

// Everything except an already CONFIRMED row can be reconciled.
// (UNAVAILABLE rows are included: that is where actual data is missing.)
const canReconcile = (row) => row.settlementStatus !== "CONFIRMED";

const getMerchantName = (row) => {
  const pay = row.payment || {};
  return (
    pay.merchant?.businessProfile?.businessName ||
    pay.merchant?.merchantCode ||
    pay.merchantId ||
    "Unknown merchant"
  );
};

const STATUS_STYLES = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  REPORTED: "border-ctex-blue/30 bg-ctex-blue/10 text-ctex-blue",
  CONFIRMED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  DISCREPANCY: "border-red-500/30 bg-red-500/10 text-red-500",
  UNAVAILABLE: "border-ctex-border bg-ctex-elevated text-ctex-text-muted",
};

const TAG_STYLES = {
  Confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  Estimated: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  Reported: "border-ctex-blue/30 bg-ctex-blue/10 text-ctex-blue",
};

const EMPTY_FORM = {
  dateFrom: "",
  dateTo: "",
  provider: "",
  settlementStatus: "",
  merchantId: "",
};

/* ============================================================
 * Small UI primitives
 * ============================================================ */

const ICONS = {
  refresh: "M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9L20 9M5.6 15L4 15",
  x: "M6 6l12 12M18 6L6 18",
  alert: "M12 9v4m0 4h.01M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  check: "M5 13l4 4L19 7",
  info: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z",
  filter: "M3 5h18l-7 8v6l-4-2v-4L3 5z",
};

function Icon({ name, className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        STATUS_STYLES[status] || STATUS_STYLES.UNAVAILABLE
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status || "UNKNOWN"}
    </span>
  );
}

function Tag({ kind }) {
  return (
    <span
      className={`rounded border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider ${TAG_STYLES[kind]}`}
    >
      {kind}
    </span>
  );
}

function Skeleton({ className = "" }) {
  return (
    <span
      className={`inline-block animate-pulse rounded bg-ctex-elevated ${className}`}
    />
  );
}

function formatStat(loading, value, available) {
  if (loading && value === undefined) return null; // caller renders skeleton
  if (available === false) return "Not yet recorded";
  return money(value);
}

const inputClass =
  "mt-1.5 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-3 text-sm text-ctex-text outline-none transition focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20";

/* ============================================================
 * Page
 * ============================================================ */

export default function PlatformFinancialsPage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: LIMIT,
    totalItems: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Selection for bulk reconciliation
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("single"); // "single" | "bulk"
  const [modalTargets, setModalTargets] = useState([]); // rows

  const navSections = useMemo(
    () => [
      {
        title: "Platform",
        items: [
          { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/super-admin/dashboard" },
          { key: "merchants", label: "Merchants", icon: "business", path: "/super-admin/merchants" },
          { key: "transactions", label: "Transactions", icon: "transactions", path: "/super-admin/transactions" },
          { key: "financials", label: "Financial breakdown", icon: "fees", path: "/super-admin/financials" },
          { key: "withdrawal-fees", label: "Withdrawal charges", icon: "fees", path: "/super-admin/withdrawal-fees" },
          { key: "fees", label: "Payment fee configuration", icon: "fees", path: "/super-admin/fees" },
          { key: "audit-logs", label: "Audit logs", icon: "security", path: "/super-admin/audit-logs" },
        ],
      },
    ],
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT, ...filters };
      const [nextSummary, nextRecords] = await Promise.all([
        platformAdminService.getFinancialSummary(filters),
        platformAdminService.getFinancialPayments(params),
      ]);
      setSummary(nextSummary);
      setRecords(nextRecords.data || []);
      setPagination(
        nextRecords.pagination || {
          page,
          limit: LIMIT,
          totalItems: 0,
          totalPages: 0,
        }
      );
      // Clear selection on reload
      setSelectedIds(new Set());
    } catch (e) {
      setError(
        e.response?.data?.message || "Could not load financial reports."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Auto-dismiss success notice
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const applyFilters = (event) => {
    event.preventDefault();
    const next = {};
    if (form.dateFrom)
      next.dateFrom = new Date(`${form.dateFrom}T00:00:00`).toISOString();
    if (form.dateTo)
      next.dateTo = new Date(
        `${form.dateTo}T23:59:59.999`
      ).toISOString();
    if (form.provider) next.provider = form.provider;
    if (form.settlementStatus)
      next.settlementStatus = form.settlementStatus;
    if (form.merchantId.trim())
      next.merchantId = form.merchantId.trim();
    setPage(1);
    setFilters(next);
  };

  const resetFilters = () => {
    setForm(EMPTY_FORM);
    setPage(1);
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  /* --------------------------------------------------------------
   * Selection helpers (only reconcilable rows can be selected)
   * ------------------------------------------------------------ */
  const selectableRows = useMemo(
    () => records.filter(canReconcile),
    [records]
  );

  const allSelected =
    selectableRows.length > 0 && selectedIds.size === selectableRows.length;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableRows.map((r) => r.id)));
    }
  };

  /* --------------------------------------------------------------
   * Modal openers
   * ------------------------------------------------------------ */
  const openSingleReconcile = (row) => {
    setModalMode("single");
    setModalTargets([row]);
    setModalOpen(true);
  };

  const openBulkReconcile = () => {
    if (selectedIds.size === 0) return;
    const targets = records.filter(
      (r) => selectedIds.has(r.id) && canReconcile(r)
    );
    if (targets.length === 0) return;
    setModalMode("bulk");
    setModalTargets(targets);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalTargets([]);
  };

  const onReconcileSuccess = async (count = 1) => {
    closeModal();
    setNotice(
      count > 1
        ? `${count} settlements reconciled and recorded as audit evidence.`
        : "Settlement reconciled and recorded as audit evidence."
    );
    await load();
  };

  const p = summary?.payments || {};
  const w = summary?.withdrawals || {};

  /* --------------------------------------------------------------
   * Metric definitions (same 12 metrics, grouped)
   * ------------------------------------------------------------ */
  const headline = [
    { label: "Successful payment volume", value: p.grossVolume, available: true },
    { label: "C-TEX payment service fees", value: p.ctexServiceFeeRevenue, available: true },
    { label: "Merchant net payable", value: p.merchantNetPayable, available: true },
    {
      label: "Actual provider settlements",
      value: p.actualProviderSettlements,
      available: p.actualProviderSettlementsAvailable,
    },
  ];

  const ledgers = [
    {
      title: "Provider charges",
      subtitle: "What providers charge per successful payment",
      items: [
        {
          label: "Confirmed provider charges",
          tag: "Confirmed",
          value: p.confirmedProviderCharges,
          available: p.confirmedProviderChargesAvailable,
        },
        {
          label: "Estimated provider charges",
          tag: "Estimated",
          value: p.estimatedProviderCharges,
          available: p.estimatedProviderChargesAvailable,
        },
        {
          label: "Provider-reported charges",
          tag: "Reported",
          value: p.providerReportedCharges,
          available: p.providerReportedChargesAvailable,
        },
      ],
    },
    {
      title: "Settlement & margin",
      subtitle: "Cash position and gross processing margin",
      items: [
        {
          label: "Confirmed gross processing margin",
          tag: "Confirmed",
          value: p.ctexGrossProcessingMargin,
          available: p.ctexGrossProcessingMarginAvailable,
        },
        {
          label: "Estimated gross processing margin",
          tag: "Estimated",
          value: p.estimatedCtexGrossProcessingMargin,
          available: p.estimatedCtexGrossProcessingMarginAvailable,
        },
        {
          label: "Pending expected settlements",
          tag: "Estimated",
          value: p.pendingExpectedSettlement,
          available: p.pendingExpectedSettlementAvailable,
        },
      ],
    },
    {
      title: "Withdrawals",
      subtitle: "Merchant payouts and charges collected",
      items: [
        {
          label: "Successful withdrawal volume",
          value: w.successfulPayoutAmount,
          available: true,
        },
        {
          label: "Withdrawal charges collected",
          value: w.ctexWithdrawalChargesCollected,
          available: true,
        },
      ],
    },
  ];

  const discrepancyCount = Number(p.settlementDiscrepancyCount || 0);
  const rangeStart =
    pagination.totalItems === 0 ? 0 : (page - 1) * LIMIT + 1;
  const rangeEnd = Math.min(page * LIMIT, pagination.totalItems);

  return (
    <DashboardLayout
      title="Super Admin"
      subtitle="Financial breakdown"
      navSections={navSections}
      profileName={
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        "Super Admin"
      }
      profileRole={user?.role}
    >
      {/* ---------- Page header ---------- */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ctex-text">
            Successful payment financials
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ctex-text-muted">
            {summary?.scope || "Provider-confirmed successful payments only"}.
            Estimated provider costs and settlements are labeled separately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-ctex-border bg-ctex-surface px-3.5 py-2 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated disabled:opacity-50"
        >
          <Icon
            name="refresh"
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </header>

      {notice && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500"
        >
          <span className="flex items-center gap-2">
            <Icon name="check" />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss"
            className="opacity-70 hover:opacity-100"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          <Icon name="alert" />
          {error}
        </p>
      )}

      {/* ---------- Headline metrics ---------- */}
      <section className="grid gap-px overflow-hidden rounded-xl border border-ctex-border bg-ctex-border sm:grid-cols-2 xl:grid-cols-4">
        {headline.map(({ label, value, available }) => {
          const text = formatStat(loading, value, available);
          return (
            <div key={label} className="bg-ctex-surface p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-ctex-text-muted">
                {label}
              </p>
              <p
                className={`mt-3 tabular-nums tracking-tight ${
                  text === "Not yet recorded"
                    ? "text-base font-medium text-ctex-text-muted"
                    : "text-2xl font-semibold text-ctex-text"
                }`}
              >
                {text === null ? <Skeleton className="h-7 w-32" /> : text}
              </p>
            </div>
          );
        })}
      </section>

      {/* ---------- Ledger panels ---------- */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        {ledgers.map((group) => (
          <div
            key={group.title}
            className="rounded-xl border border-ctex-border bg-ctex-surface"
          >
            <div className="border-b border-ctex-border px-5 py-4">
              <h3 className="text-sm font-semibold text-ctex-text">
                {group.title}
              </h3>
              <p className="mt-0.5 text-xs text-ctex-text-muted">
                {group.subtitle}
              </p>
            </div>
            <ul className="divide-y divide-ctex-border">
              {group.items.map(({ label, tag, value, available }) => {
                const text = formatStat(loading, value, available);
                return (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-ctex-text-muted">{label}</p>
                      {tag && (
                        <div className="mt-1">
                          <Tag kind={tag} />
                        </div>
                      )}
                    </div>
                    <p
                      className={`shrink-0 text-right tabular-nums ${
                        text === "Not yet recorded"
                          ? "text-xs text-ctex-text-muted"
                          : "text-sm font-semibold text-ctex-text"
                      }`}
                    >
                      {text === null ? <Skeleton className="h-4 w-24" /> : text}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      {/* ---------- Discrepancy + note ---------- */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div
          className={`rounded-xl border p-5 ${
            discrepancyCount > 0
              ? "border-red-500/30 bg-red-500/5"
              : "border-ctex-border bg-ctex-surface"
          }`}
        >
          <div className="flex items-center gap-2 text-sm text-ctex-text-muted">
            <Icon
              name="alert"
              className={`h-4 w-4 ${
                discrepancyCount > 0 ? "text-red-500" : ""
              }`}
            />
            Settlement discrepancies
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ctex-text">
            {discrepancyCount.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-ctex-text-muted">
            Difference:{" "}
            <span className="font-medium tabular-nums text-ctex-text">
              {money(p.settlementDiscrepancyAmount)}
            </span>
          </p>
        </div>
        <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-xs leading-relaxed text-ctex-text-muted lg:col-span-2">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p>
            Gross processing margin is before operating costs, taxes, refunds,
            chargebacks, payout costs, and other expenses. Provider-reported
            amounts are not represented as bank-settled cash.
          </p>
        </div>
      </section>

      {/* ---------- Filters ---------- */}
      <form
        onSubmit={applyFilters}
        className="mt-6 rounded-xl border border-ctex-border bg-ctex-surface p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ctex-text">
            <Icon name="filter" className="h-4 w-4 text-ctex-text-muted" />
            Filters
            {hasActiveFilters && (
              <span className="rounded-full bg-ctex-blue/10 px-2 py-0.5 text-[10px] font-semibold text-ctex-blue">
                {Object.keys(filters).length} active
              </span>
            )}
          </h3>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-ctex-text-muted underline-offset-2 hover:text-ctex-text hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-medium text-ctex-text-muted">
            Success from
            <input
              type="date"
              value={form.dateFrom}
              onChange={(e) =>
                setForm({ ...form, dateFrom: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className="text-xs font-medium text-ctex-text-muted">
            Success to
            <input
              type="date"
              value={form.dateTo}
              onChange={(e) =>
                setForm({ ...form, dateTo: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className="text-xs font-medium text-ctex-text-muted">
            Provider
            <select
              value={form.provider}
              onChange={(e) =>
                setForm({ ...form, provider: e.target.value })
              }
              className={inputClass}
            >
              <option value="">All providers</option>
              <option>MONNIFY</option>
              <option>XIXAPAY</option>
            </select>
          </label>
          <label className="text-xs font-medium text-ctex-text-muted">
            Settlement status
            <select
              value={form.settlementStatus}
              onChange={(e) =>
                setForm({ ...form, settlementStatus: e.target.value })
              }
              className={inputClass}
            >
              <option value="">All</option>
              {["PENDING", "REPORTED", "CONFIRMED", "DISCREPANCY", "UNAVAILABLE"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-ctex-text-muted">
            Merchant ID
            <input
              value={form.merchantId}
              onChange={(e) =>
                setForm({ ...form, merchantId: e.target.value })
              }
              placeholder="Merchant UUID"
              className={inputClass}
            />
          </label>
          <button className="self-end rounded-lg bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
            Apply filters
          </button>
        </div>
      </form>

      {/* ---------- Records table ---------- */}
      <section className="mt-6 overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ctex-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-ctex-text">
              Payment financial records
            </h3>
            <p className="mt-0.5 text-xs text-ctex-text-muted">
              {pagination.totalItems.toLocaleString()} records · successful
              payments only
            </p>
          </div>

          {/* Bulk toolbar (always visible) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ctex-text-muted">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "Select rows to reconcile in bulk"}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedIds.size === 0}
              className="rounded-lg border border-ctex-border px-3 py-1.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-elevated disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={openBulkReconcile}
              disabled={selectedIds.size === 0}
              className="rounded-lg bg-ctex-blue px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Reconcile selected
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1700px] border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-ctex-text-muted">
                <th className="sticky left-0 top-0 z-20 border-b border-ctex-border bg-ctex-elevated px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={selectableRows.length === 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all reconcilable rows"
                  />
                </th>
                {[
                  { h: "Success date" },
                  { h: "Merchant" },
                  { h: "C-TEX reference" },
                  { h: "Provider reference" },
                  { h: "Provider" },
                  { h: "Gross", right: true },
                  { h: "Provider fee (est.)", right: true },
                  { h: "C-TEX fee", right: true },
                  { h: "Merchant net", right: true },
                  { h: "Expected settle", right: true },
                  { h: "Reported settle", right: true },
                  { h: "Actual settle", right: true },
                  { h: "Margin (est.)", right: true },
                  { h: "Status" },
                ].map(({ h, right }) => (
                  <th
                    key={h}
                    className={`sticky top-0 z-10 whitespace-nowrap border-b border-ctex-border bg-ctex-elevated px-3 py-3 font-semibold ${
                      right ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
                <th className="sticky right-0 top-0 z-20 border-b border-l border-ctex-border bg-ctex-elevated px-4 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td
                      colSpan={16}
                      className="border-b border-ctex-border px-4 py-4"
                    >
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={16}
                    className="p-14 text-center text-sm text-ctex-text-muted"
                  >
                    No successful financial records match these filters.
                  </td>
                </tr>
              ) : (
                records.map((row) => {
                  const pay = row.payment || {};
                  const merchantName = getMerchantName(row);

                  const settlement = renderSettlement(
                    row.actualSettlementAmount,
                    row.settlementDisplayKind,
                    row.providerReportedSettlementAmount,
                    row.missingDataReason,
                    row.expectedSettlementAmount
                  );

                  const isSelected = selectedIds.has(row.id);
                  const reconcilable = canReconcile(row);
                  const successAt = row.paymentSuccessAt
                    ? new Date(row.paymentSuccessAt)
                    : null;
                  const margin = row.estimatedCtexGrossMargin;

                  const cell =
                    "border-b border-ctex-border px-3 py-3.5 align-middle";
                  const num = `${cell} text-right tabular-nums`;

                  return (
                    <tr
                      key={row.id}
                      className={`group text-ctex-text transition-colors ${
                        isSelected
                          ? "bg-ctex-blue/5"
                          : "hover:bg-ctex-elevated/60"
                      }`}
                    >
                      <td
                        className={`${cell} sticky left-0 z-[5] bg-ctex-surface px-4 group-hover:bg-ctex-elevated`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!reconcilable}
                          onChange={() => toggleSelect(row.id)}
                          aria-label={`Select ${pay.paymentReference}`}
                          title={
                            reconcilable
                              ? "Select for bulk reconciliation"
                              : "Already reconciled"
                          }
                        />
                      </td>
                      <td className={`${cell} whitespace-nowrap`}>
                        {successAt ? (
                          <>
                            <p className="font-medium">
                              {successAt.toLocaleDateString()}
                            </p>
                            <p className="text-[11px] text-ctex-text-muted">
                              {successAt.toLocaleTimeString()}
                            </p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${cell} font-medium`}>
                        {merchantName || "—"}
                      </td>
                      <td className={`${cell} font-mono text-[11px]`}>
                        {pay.paymentReference || "—"}
                      </td>
                      <td
                        className={`${cell} font-mono text-[11px] text-ctex-text-muted`}
                      >
                        {pay.providerReference || row.providerReference || "—"}
                      </td>
                      <td className={cell}>
                        {row.provider || pay.provider || "—"}
                      </td>
                      <td className={`${num} font-medium`}>
                        {money(row.grossAmount)}
                      </td>
                      <td className={num}>
                        {row.providerFeeEstimate == null ? (
                          <span className="text-ctex-text-muted">Unknown</span>
                        ) : (
                          money(row.providerFeeEstimate)
                        )}
                      </td>
                      <td className={num}>{money(row.serviceFee)}</td>
                      <td className={num}>{money(row.merchantNetAmount)}</td>
                      <td className={num}>
                        {row.expectedSettlementAmount == null ? (
                          <span className="text-ctex-text-muted">Unknown</span>
                        ) : (
                          money(row.expectedSettlementAmount)
                        )}
                      </td>
                      <td className={num}>
                        {row.providerReportedSettlementAmount == null ? (
                          <span className="text-ctex-text-muted">—</span>
                        ) : (
                          money(row.providerReportedSettlementAmount)
                        )}
                      </td>
                      <td
                        className={`${num} font-medium ${
                          toneClasses[settlement.tone] || ""
                        }`}
                      >
                        {settlement.label}
                      </td>
                      <td
                        className={`${num} ${
                          margin != null && Number(margin) < 0
                            ? "text-red-500"
                            : ""
                        }`}
                      >
                        {margin == null ? (
                          <span className="text-ctex-text-muted">Unknown</span>
                        ) : (
                          money(margin)
                        )}
                      </td>
                      <td className={cell}>
                        <StatusPill status={row.settlementStatus} />
                      </td>
                      <td
                        className={`${cell} sticky right-0 z-[5] whitespace-nowrap border-l bg-ctex-surface px-4 text-right group-hover:bg-ctex-elevated`}
                      >
                        <button
                          type="button"
                          onClick={() => openSingleReconcile(row)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                            reconcilable
                              ? "bg-ctex-blue text-white hover:opacity-90"
                              : "border border-ctex-border text-ctex-text hover:bg-ctex-elevated"
                          }`}
                          title={
                            reconcilable
                              ? "Record the actual settlement for this payment"
                              : "View reconciled settlement details"
                          }
                        >
                          {reconcilable ? "Reconcile" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ctex-border px-5 py-3 text-xs text-ctex-text-muted">
          <span>
            Showing{" "}
            <span className="font-medium tabular-nums text-ctex-text">
              {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="font-medium tabular-nums text-ctex-text">
              {pagination.totalItems.toLocaleString()}
            </span>
            <span className="mx-2 opacity-40">|</span>
            Page {page} / {Math.max(1, pagination.totalPages)}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-ctex-border px-3.5 py-1.5 font-medium text-ctex-text transition hover:bg-ctex-elevated disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-ctex-border px-3.5 py-1.5 font-medium text-ctex-text transition hover:bg-ctex-elevated disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Modal ---------- */}
      {modalOpen && (
        <ReconcileModal
          mode={modalMode}
          targets={modalTargets}
          onClose={closeModal}
          onSuccess={onReconcileSuccess}
          onPartial={load}
        />
      )}
    </DashboardLayout>
  );
}

/* ============================================================
 * Reconcile / View Modal
 * ============================================================ */

function DetailCell({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-ctex-border bg-ctex-surface px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-ctex-text-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-xs font-semibold tabular-nums ${
          tone || "text-ctex-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ReconcileModal({ mode, targets, onClose, onSuccess, onPartial }) {
  const [rows, setRows] = useState(
    targets.map((t) => ({
      raw: t,
      paymentReference: t.payment?.paymentReference,
      merchantName: getMerchantName(t),
      expected: Number(t.expectedSettlementAmount || 0) / 100,
      reported:
        t.providerReportedSettlementAmount == null
          ? null
          : Number(t.providerReportedSettlementAmount) / 100,
      actual: "", // user input in NGN
      providerFee: "", // optional
    }))
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Read-only when every row is already reconciled
  const viewOnly = rows.every((r) => !canReconcile(r.raw));

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const updateRow = (index, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const buildPayload = (row) => ({
    actualSettlementAmount: Math.round(Number(row.actual) * 100),
    ...(row.providerFee === ""
      ? {}
      : { actualProviderFee: Math.round(Number(row.providerFee) * 100) }),
    reason: reason.trim(),
  });

  // Totals for the summary strip
  const totalExpected = rows.reduce((s, r) => s + r.expected, 0);
  const totalEntered = rows.reduce(
    (s, r) => s + (r.actual === "" ? 0 : Number(r.actual)),
    0
  );
  const filledCount = rows.filter((r) => r.actual !== "").length;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (mode === "single") {
        const row = rows[0];
        if (row.actual === "") {
          throw new Error("Actual settlement amount is required");
        }
        await platformAdminService.reconcileFinancialSettlement(
          row.paymentReference,
          buildPayload(row)
        );
      } else {
        // Bulk: backend has no bulk endpoint, so loop with error tolerance.
        const results = [];
        for (const row of rows) {
          if (row.actual === "") {
            results.push({
              paymentReference: row.paymentReference,
              ok: false,
              error: "Missing actual amount",
            });
            continue;
          }
          try {
            await platformAdminService.reconcileFinancialSettlement(
              row.paymentReference,
              buildPayload(row)
            );
            results.push({ paymentReference: row.paymentReference, ok: true });
          } catch (e) {
            results.push({
              paymentReference: row.paymentReference,
              ok: false,
              error:
                e.response?.data?.message ||
                e.message ||
                "Unknown error",
            });
          }
        }

        const failures = results.filter((r) => !r.ok);
        if (failures.length > 0) {
          const failedRefs = new Set(failures.map((f) => f.paymentReference));
          const succeeded = results.length - failures.length;

          // Keep only failed rows in the modal so a retry never resubmits
          // settlements that already succeeded.
          setRows((prev) =>
            prev.filter((r) => failedRefs.has(r.paymentReference))
          );
          if (succeeded > 0 && onPartial) {
            void onPartial();
          }
          throw new Error(
            `${succeeded} succeeded, ${failures.length} failed. First error: ${failures[0].error}`
          );
        }
      }

      await onSuccess(rows.length);
    } catch (e) {
      setError(
        e.response?.data?.message || e.message || "Reconciliation failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-ctex-border px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-ctex-text">
              {viewOnly
                ? "Settlement details"
                : mode === "single"
                ? "Reconcile settlement"
                : `Reconcile ${rows.length} settlements`}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-ctex-text-muted">
              {viewOnly
                ? "This settlement has already been reconciled. Details below are read-only."
                : "Enter the amount confirmed by your bank statement. The reconciliation is recorded as permanent audit evidence."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-ctex-text-muted transition hover:bg-ctex-elevated hover:text-ctex-text"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500"
              >
                <Icon name="alert" className="mt-px h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            {/* Summary strip */}
            {!viewOnly && (
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-ctex-border bg-ctex-border text-xs">
                <div className="bg-ctex-elevated px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-ctex-text-muted">
                    Payments
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-ctex-text">
                    {filledCount} / {rows.length} filled
                  </p>
                </div>
                <div className="bg-ctex-elevated px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-ctex-text-muted">
                    Total expected
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-ctex-text">
                    {money(Math.round(totalExpected * 100))}
                  </p>
                </div>
                <div className="bg-ctex-elevated px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-ctex-text-muted">
                    Total entered
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-ctex-text">
                    {filledCount === 0
                      ? "—"
                      : money(Math.round(totalEntered * 100))}
                  </p>
                </div>
              </div>
            )}

            {rows.map((row, index) => {
              const t = row.raw;
              const actualNum = row.actual === "" ? null : Number(row.actual);
              const diff = actualNum == null ? null : actualNum - row.expected;
              const matches = diff != null && Math.abs(diff) < 0.005;
              const marginNegative =
                t.estimatedCtexGrossMargin != null &&
                Number(t.estimatedCtexGrossMargin) < 0;

              return (
                <div
                  key={row.paymentReference}
                  className="rounded-xl border border-ctex-border bg-ctex-elevated p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-ctex-text">
                        {row.paymentReference}
                      </p>
                      <p className="mt-0.5 text-xs text-ctex-text-muted">
                        {row.merchantName}
                        {(t.provider || t.payment?.provider) && (
                          <> · {t.provider || t.payment?.provider}</>
                        )}
                      </p>
                    </div>
                    <StatusPill status={t.settlementStatus} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <DetailCell label="Gross" value={money(t.grossAmount)} />
                    <DetailCell
                      label="Provider fee (est.)"
                      value={
                        t.providerFeeEstimate == null
                          ? "Unknown"
                          : money(t.providerFeeEstimate)
                      }
                    />
                    <DetailCell label="C-TEX fee" value={money(t.serviceFee)} />
                    <DetailCell
                      label="Merchant net"
                      value={money(t.merchantNetAmount)}
                    />
                    <DetailCell
                      label="Expected settle"
                      value={
                        t.expectedSettlementAmount == null
                          ? "Unknown"
                          : money(t.expectedSettlementAmount)
                      }
                    />
                    <DetailCell
                      label="Provider reported"
                      value={
                        t.providerReportedSettlementAmount == null
                          ? "—"
                          : money(t.providerReportedSettlementAmount)
                      }
                    />
                    <DetailCell
                      label="Actual settle"
                      value={
                        t.actualSettlementAmount == null
                          ? "Not recorded"
                          : money(t.actualSettlementAmount)
                      }
                      tone={
                        t.actualSettlementAmount != null
                          ? "text-emerald-500"
                          : undefined
                      }
                    />
                    <DetailCell
                      label="Margin (est.)"
                      value={
                        t.estimatedCtexGrossMargin == null
                          ? "Unknown"
                          : money(t.estimatedCtexGrossMargin)
                      }
                      tone={marginNegative ? "text-red-500" : undefined}
                    />
                  </div>

                  {canReconcile(t) && (
                    <div className="mt-4 border-t border-ctex-border pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-[11px] font-medium text-ctex-text-muted">
                          <span className="flex items-center justify-between">
                            Actual settlement received (NGN)
                            {row.reported != null && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateRow(
                                    index,
                                    "actual",
                                    row.reported.toFixed(2)
                                  )
                                }
                                className="font-semibold text-ctex-blue hover:underline"
                              >
                                Use reported
                              </button>
                            )}
                          </span>
                          <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.actual}
                            onChange={(e) =>
                              updateRow(index, "actual", e.target.value)
                            }
                            placeholder={
                              row.reported != null
                                ? row.reported.toFixed(2)
                                : row.expected.toFixed(2)
                            }
                            className="mt-1.5 h-10 w-full rounded-lg border border-ctex-border bg-ctex-surface px-3 text-sm tabular-nums text-ctex-text outline-none transition focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
                          />
                        </label>
                        <label className="block text-[11px] font-medium text-ctex-text-muted">
                          Actual provider fee (optional, NGN)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.providerFee}
                            onChange={(e) =>
                              updateRow(index, "providerFee", e.target.value)
                            }
                            className="mt-1.5 h-10 w-full rounded-lg border border-ctex-border bg-ctex-surface px-3 text-sm tabular-nums text-ctex-text outline-none transition focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
                          />
                        </label>
                      </div>

                      {diff != null && (
                        <p
                          className={`mt-3 flex items-center gap-1.5 text-[11px] font-medium ${
                            matches ? "text-emerald-500" : "text-amber-500"
                          }`}
                        >
                          <Icon
                            name={matches ? "check" : "alert"}
                            className="h-3.5 w-3.5"
                          />
                          {matches
                            ? "Matches the expected settlement."
                            : `Differs from expected by ${money(
                                Math.round(diff * 100)
                              )}. This will be flagged as a discrepancy if it is not explained in the note.`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!viewOnly && (
              <label className="block text-xs font-medium text-ctex-text-muted">
                <span className="flex items-center justify-between">
                  Evidence / reconciliation note (required, min 8 chars)
                  <span className="tabular-nums text-[11px] font-normal">
                    {reason.length} / 500
                  </span>
                </span>
                <textarea
                  required
                  minLength={8}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-lg border border-ctex-border bg-ctex-elevated px-3 py-2.5 text-sm text-ctex-text outline-none transition focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20"
                  placeholder="e.g., Bank statement 2026-10-21 line 42 shows NGN 99.00 credit"
                />
              </label>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-ctex-border bg-ctex-surface px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-ctex-border px-4 py-2 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated disabled:opacity-50"
              disabled={saving}
            >
              {viewOnly ? "Close" : "Cancel"}
            </button>
            {!viewOnly && (
              <button
                type="submit"
                disabled={saving || reason.trim().length < 8 || rows.length === 0}
                className="rounded-lg bg-ctex-blue px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving
                  ? "Recording…"
                  : mode === "single"
                  ? "Record reconciliation"
                  : `Record ${rows.length} reconciliations`}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  // Portal to body so the layout can never clip or hide the modal
  return createPortal(modal, document.body);
}