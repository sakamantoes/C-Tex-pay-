import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Receipt,
  Search,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useTransactionStore } from "../../store/transaction.store";
import { buildMerchantNav } from "./merchantNav";

/* --------------------------------------------------------------------------
   BRAND TONES (shared with MerchantDashboard)
   -------------------------------------------------------------------------- */
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

const PAGE_SIZES = [10, 20, 50];
const STATUS_OPTIONS = ["PENDING", "SUCCESS", "FAILED", "EXPIRED", "CANCELLED"];

/* --------------------------------------------------------------------------
   HELPERS
   -------------------------------------------------------------------------- */
function formatMoney(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status) {
  switch (status) {
    case "SUCCESS":
    case "SUCCESSFUL":
      return "success";
    case "PENDING":
      return "warning";
    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

function toneClasses(tone) {
  switch (tone) {
    case "success":
      return "bg-emerald-500/10 text-emerald-500";
    case "warning":
      return "bg-amber-500/10 text-amber-500";
    case "danger":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-ctex-border/40 text-ctex-text-muted";
  }
}

function dotClass(tone) {
  switch (tone) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "danger":
      return "bg-red-500";
    default:
      return "bg-ctex-text-muted";
  }
}

/* --------------------------------------------------------------------------
   PAYMENT TYPE BADGE
   -------------------------------------------------------------------------- */
const PAYMENT_TYPE_LABELS = {
  PAYMENT_LINK: {
    label: "Payment link",
    className: "bg-ctex-blue/10 text-ctex-blue",
  },
  DIRECT_CHECKOUT: {
    label: "Hosted checkout",
    className: "bg-indigo-500/10 text-indigo-500",
  },
  API: {
    label: "API",
    className: "bg-violet-500/10 text-violet-500",
  },
  BANK_TRANSFER: {
    label: "Bank transfer",
    className: "bg-ctex-border/40 text-ctex-text-muted",
  },
};

function PaymentTypeBadge({ type }) {
  const config = PAYMENT_TYPE_LABELS[type] || PAYMENT_TYPE_LABELS.BANK_TRANSFER;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function StatusChip({ status }) {
  const tone = statusTone(status);
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        toneClasses(tone),
      ].join(" ")}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass(tone)}`} />
      {status}
    </span>
  );
}

/* --------------------------------------------------------------------------
   PAGE
   -------------------------------------------------------------------------- */
export default function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const initialPaymentReference = searchParams.get("paymentReference") || "";
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions } = useMerchantStore();
  const {
    transactions,
    meta,
    selectedTransaction,
    isLoading,
    error,
    getTransactions,
    getTransaction,
    clearSelectedTransaction,
    clearError,
  } = useTransactionStore();

  const [filters, setFilters] = useState({
    paymentReference: initialPaymentReference,
    merchantReference: "",
    status: "",
    paymentMethod: "",
    from: "",
    to: "",
    minAmount: "",
    maxAmount: "",
    sortBy: "createdAt",
    direction: "DESC",
  });
  const [appliedFilters, setAppliedFilters] = useState(() =>
    initialPaymentReference ? { paymentReference: initialPaymentReference } : {}
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    getTransactions({ page, limit, ...appliedFilters });
  }, [page, limit, appliedFilters, getTransactions]);

  useEffect(() => {
    if (!detailOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDetailOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailOpen]);

  /* Lock body scroll while filters sheet is open on mobile */
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    clearError();
    const next = {};
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      if (key === "from" || key === "to") {
        next[key] = new Date(value).toISOString();
      } else {
        next[key] = value;
      }
    }
    setPage(1);
    setAppliedFilters(next);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setFilters({
      paymentReference: "",
      merchantReference: "",
      status: "",
      paymentMethod: "",
      from: "",
      to: "",
      minAmount: "",
      maxAmount: "",
      sortBy: "createdAt",
      direction: "DESC",
    });
    setPage(1);
    setAppliedFilters({});
  };

  const openDetail = async (reference) => {
    setDetailOpen(true);
    await getTransaction(reference);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    clearSelectedTransaction();
  };

  const navSections = buildMerchantNav(permissions);

  const profileName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "Merchant Admin";
  const profileRole = roles[0]?.name || "Member";

  const start = meta.total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, meta.total);

  const activeFilterCount = Object.entries(appliedFilters).filter(
    ([, v]) => v
  ).length;

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant workspace"}
      subtitle="Transactions"
      navSections={navSections}
      profileName={profileName}
      profileRole={profileRole}
    >
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[24px] p-5 text-white sm:rounded-[28px] sm:p-8"
        style={{ background: HERO_BG }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-white/10 blur-2xl sm:h-72 sm:w-72"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl sm:right-24 sm:h-64 sm:w-64"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/70 sm:text-[11px] sm:tracking-[0.3em]">
              Payment history
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
              {meta.total.toLocaleString()} transaction
              {meta.total === 1 ? "" : "s"}
            </h2>
            <p className="mt-1.5 text-xs text-white/75 sm:text-sm">
              Search and review payments in this workspace.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-1.5 sm:mt-5 sm:gap-2">
              <HeroPill icon={BadgeCheck}>
                <span className="capitalize">
                  {businessProfile?.businessName || "Workspace"}
                </span>
              </HeroPill>
              {activeFilterCount > 0 && (
                <HeroPill icon={Receipt}>
                  {activeFilterCount} filter
                  {activeFilterCount === 1 ? "" : "s"}
                </HeroPill>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0B3E66] transition hover:bg-white/90 sm:w-auto"
            >
              <Search className="h-4 w-4" />
              {filtersOpen ? "Hide filters" : "Search & filter"}
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0B3E66] px-1.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.section>

      {/* ─── FILTERS ──────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            key="filters"
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden sm:mt-4"
          >
            <form
              onSubmit={applyFilters}
              className="rounded-2xl border border-ctex-border bg-ctex-surface p-4 sm:rounded-[28px] sm:p-6"
            >
              <div className="mb-4 flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={TONES.orange}
                >
                  <Search className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <h3 className="text-sm font-semibold text-ctex-text">
                  Filters
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field
                  label="Payment reference"
                  name="paymentReference"
                  value={filters.paymentReference}
                  onChange={updateFilter}
                  placeholder="CTEXPAY_…"
                />
                <Field
                  label="Merchant reference"
                  name="merchantReference"
                  value={filters.merchantReference}
                  onChange={updateFilter}
                  placeholder="Order number"
                />
                <SelectField
                  label="Status"
                  name="status"
                  value={filters.status}
                  onChange={updateFilter}
                  options={[
                    { value: "", label: "All statuses" },
                    ...STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
                  ]}
                />
                <SelectField
                  label="Payment method"
                  name="paymentMethod"
                  value={filters.paymentMethod}
                  onChange={updateFilter}
                  options={[
                    { value: "", label: "All methods" },
                    { value: "ACCOUNT_TRANSFER", label: "Account transfer" },
                  ]}
                />
                <Field
                  label="From"
                  name="from"
                  type="datetime-local"
                  value={filters.from}
                  onChange={updateFilter}
                />
                <Field
                  label="To"
                  name="to"
                  type="datetime-local"
                  value={filters.to}
                  onChange={updateFilter}
                />
                <Field
                  label="Min amount"
                  name="minAmount"
                  type="number"
                  min="0"
                  value={filters.minAmount}
                  onChange={updateFilter}
                />
                <Field
                  label="Max amount"
                  name="maxAmount"
                  type="number"
                  min="0"
                  value={filters.maxAmount}
                  onChange={updateFilter}
                />
                <SelectField
                  label="Sort by"
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={updateFilter}
                  options={[
                    { value: "createdAt", label: "Created at" },
                    { value: "amount", label: "Amount" },
                    { value: "status", label: "Status" },
                  ]}
                />
                <SelectField
                  label="Direction"
                  name="direction"
                  value={filters.direction}
                  onChange={updateFilter}
                  options={[
                    { value: "DESC", label: "Descending" },
                    { value: "ASC", label: "Ascending" },
                  ]}
                />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-full border border-ctex-border bg-ctex-surface px-4 py-2.5 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text sm:w-auto sm:py-2"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-full bg-ctex-accent px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60 sm:w-auto sm:py-2"
                >
                  Apply filters
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ERROR ──────────────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-500 sm:mt-4 sm:text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* ─── TABLE / CARDS ──────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mt-3 overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface sm:mt-4 sm:rounded-[28px]"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white sm:h-10 sm:w-10"
              style={TONES.blue}
            >
              <ArrowLeftRight className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ctex-text">
                Transactions
              </h3>
              <p className="mt-0.5 truncate text-[11px] text-ctex-text-muted sm:text-xs">
                Showing {start}–{end} of {meta.total.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-ctex-text-muted">
            <select
              aria-label="Rows per page"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-full border border-ctex-border bg-ctex-surface px-2.5 py-1.5 text-[11px] text-ctex-text sm:px-3 sm:text-xs"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── MOBILE CARD LIST (hidden on md+) ─────────────── */}
        <div className="space-y-2 px-3 pb-3 md:hidden">
          {isLoading && transactions.length === 0 && (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl bg-ctex-panel"
                />
              ))}
            </>
          )}

          {!isLoading && transactions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ctex-border bg-ctex-surface/50 px-4 py-12 text-center text-sm text-ctex-text-muted">
              No transactions match these filters.
            </div>
          )}

          {transactions.map((transaction) => (
            <MobileTransactionCard
              key={transaction.id}
              transaction={transaction}
              onOpen={() => openDetail(transaction.paymentReference)}
            />
          ))}
        </div>

        {/* ─── DESKTOP TABLE (hidden below md) ─────────────── */}
        <div className="hidden overflow-x-auto px-2 md:block sm:px-3">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead className="text-xs text-ctex-text-muted">
              <tr>
                <Th>Payment</Th>
                <Th>Type</Th>
                <Th>Customer</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>
                  <span className="sr-only">Details</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && transactions.length === 0 && (
                <SkeletonRows rows={5} cols={7} />
              )}

              {!isLoading && transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-ctex-text-muted"
                  >
                    No transactions match these filters.
                  </td>
                </tr>
              )}

              {transactions.map((transaction) => (
                <tr key={transaction.id} className="group">
                  <Td>
                    <span className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: "rgba(11,104,173,.12)",
                          color: "#2f95de",
                        }}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-xs font-medium text-ctex-text sm:text-[13px]">
                          {transaction.paymentReference}
                        </span>
                        <span className="block truncate text-[11px] text-ctex-text-muted">
                          {transaction.merchantReference ||
                            "No merchant reference"}
                        </span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <PaymentTypeBadge type={transaction.type} />
                  </Td>
                  <Td>
                    <span className="block truncate text-sm text-ctex-text">
                      {transaction.customer?.name || "Guest"}
                    </span>
                    <span className="block truncate text-[11px] text-ctex-text-muted">
                      {transaction.customer?.email || "—"}
                    </span>
                  </Td>
                  <Td>
                    <div className="whitespace-nowrap">
                      <span className="block text-sm font-semibold text-ctex-text">
                        {formatMoney(transaction.amount, transaction.currency)}
                      </span>
                      {transaction.fees && (
                        <span className="block text-[11px] text-emerald-500">
                          Net{" "}
                          {formatMoney(
                            transaction.fees.merchantNetAmount,
                            transaction.currency
                          )}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <StatusChip status={transaction.status} />
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap text-[11px] text-ctex-text-muted">
                      {formatDate(transaction.createdAt)}
                    </span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => openDetail(transaction.paymentReference)}
                      className="inline-flex items-center gap-1 rounded-full border border-ctex-border bg-ctex-surface px-3 py-1.5 text-[11px] font-medium text-ctex-text transition hover:bg-ctex-panel"
                    >
                      Details
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-ctex-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-center text-[11px] text-ctex-text-muted sm:text-left sm:text-xs">
            Showing {start}–{end} of {meta.total.toLocaleString()}
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => current - 1)}
              className="flex-1 rounded-full border border-ctex-border bg-ctex-surface px-3.5 py-2 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel disabled:opacity-40 sm:flex-none sm:py-1.5"
            >
              ← Prev
            </button>
            <span className="flex-shrink-0 text-center text-[11px] text-ctex-text-muted sm:text-xs">
              Page {page} of {Math.max(meta.totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={page >= meta.totalPages || isLoading}
              onClick={() => setPage((current) => current + 1)}
              className="flex-1 rounded-full border border-ctex-border bg-ctex-surface px-3.5 py-2 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel disabled:opacity-40 sm:flex-none sm:py-1.5"
            >
              Next →
            </button>
          </div>
        </div>
      </motion.section>

      {/* ─── DETAIL MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {detailOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDetail();
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="transaction-detail-title"
              className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-ctex-border bg-ctex-surface shadow-2xl sm:max-h-[90vh] sm:max-w-xl sm:rounded-[28px]"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-2 sm:hidden">
                <div className="h-1.5 w-12 rounded-full bg-ctex-border" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-ctex-border p-4 sm:p-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white sm:h-10 sm:w-10"
                    style={TONES.blue}
                  >
                    <ArrowLeftRight className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ctex-text-muted">
                      Transaction details
                    </p>
                    <h2
                      id="transaction-detail-title"
                      className="mt-1 break-all font-mono text-sm font-semibold text-ctex-text sm:text-base"
                    >
                      {selectedTransaction?.paymentReference || "Loading…"}
                    </h2>
                    {selectedTransaction?.type && (
                      <div className="mt-2">
                        <PaymentTypeBadge type={selectedTransaction.type} />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  aria-label="Close transaction details"
                  className="flex-shrink-0 rounded-full p-2 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body — scrollable */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {isLoading && !selectedTransaction ? (
                  <p className="py-8 text-sm text-ctex-text-muted">
                    Loading transaction…
                  </p>
                ) : selectedTransaction ? (
                  <>
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Detail
                        label="Payment reference"
                        value={selectedTransaction.paymentReference}
                      />
                      <Detail
                        label="Merchant reference"
                        value={selectedTransaction.merchantReference || "—"}
                      />
                      <Detail
                        label="Type"
                        value={selectedTransaction.type || "BANK_TRANSFER"}
                      />
                      <Detail
                        label="Amount"
                        value={formatMoney(
                          selectedTransaction.amount,
                          selectedTransaction.currency
                        )}
                      />
                      <Detail
                        label="Status"
                        value={selectedTransaction.status}
                      />
                      <Detail
                        label="Payment method"
                        value={selectedTransaction.paymentMethod}
                      />
                      <Detail
                        label="Currency"
                        value={selectedTransaction.currency}
                      />
                      <Detail
                        label="Customer"
                        value={selectedTransaction.customer?.name || "Guest"}
                      />
                      <Detail
                        label="Customer email"
                        value={selectedTransaction.customer?.email || "—"}
                      />
                      <Detail
                        label="Customer phone"
                        value={selectedTransaction.customer?.phone || "—"}
                      />
                      <Detail
                        label="Created"
                        value={formatDate(selectedTransaction.createdAt)}
                      />
                      <Detail
                        label="Updated"
                        value={formatDate(selectedTransaction.updatedAt)}
                      />
                    </dl>

                    {selectedTransaction.fees && (
                      <div className="mt-4 rounded-2xl border border-ctex-border bg-ctex-panel/60 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                            style={TONES.green}
                          >
                            <Building2
                              className="h-3.5 w-3.5"
                              strokeWidth={2.2}
                            />
                          </span>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ctex-text-muted">
                            Fee breakdown
                          </p>
                        </div>
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Detail
                            label="Gross amount"
                            value={formatMoney(
                              selectedTransaction.fees.grossAmount,
                              selectedTransaction.fees.currency
                            )}
                          />
                          <Detail
                            label="C-TEX service fee"
                            value={formatMoney(
                              selectedTransaction.fees.totalFee,
                              selectedTransaction.fees.currency
                            )}
                          />
                          <Detail
                            label="Merchant net settlement"
                            value={formatMoney(
                              selectedTransaction.fees.merchantNetAmount,
                              selectedTransaction.fees.currency
                            )}
                          />
                          <Detail
                            label="Provider fee treatment"
                            value={selectedTransaction.fees.providerFeeTreatment}
                          />
                          {selectedTransaction.fees.providerFee !== null && (
                            <Detail
                              label="Provider processing fee"
                              value={formatMoney(
                                selectedTransaction.fees.providerFee,
                                selectedTransaction.fees.currency
                              )}
                            />
                          )}
                          <Detail
                            label="Calculation version"
                            value={selectedTransaction.fees.calculationVersion}
                          />
                        </dl>
                      </div>
                    )}
                  </>
                ) : (
                  <p role="alert" className="py-8 text-sm text-red-500">
                    {error || "Unable to load transaction."}
                  </p>
                )}
              </div>

              {/* Sticky footer button (mobile) */}
              <div className="border-t border-ctex-border bg-ctex-surface p-3 sm:hidden">
                <button
                  type="button"
                  onClick={closeDetail}
                  className="w-full rounded-full bg-ctex-accent px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Done
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

/* --------------------------------------------------------------------------
   SUB-COMPONENTS
   -------------------------------------------------------------------------- */

/** Mobile-only card representation of a transaction row */
function MobileTransactionCard({ transaction, onOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-ctex-border bg-ctex-surface p-3 transition hover:border-ctex-accent/30"
    >
      {/* Row 1: payment reference + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(11,104,173,.12)", color: "#2f95de" }}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-medium text-ctex-text">
              {transaction.paymentReference}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-ctex-text-muted">
              {transaction.merchantReference || "No merchant reference"}
            </p>
          </div>
        </div>
        <StatusChip status={transaction.status} />
      </div>

      {/* Row 2: type + amount */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <PaymentTypeBadge type={transaction.type} />
        <div className="text-right">
          <p className="text-sm font-semibold text-ctex-text">
            {formatMoney(transaction.amount, transaction.currency)}
          </p>
          {transaction.fees && (
            <p className="text-[11px] text-emerald-500">
              Net{" "}
              {formatMoney(
                transaction.fees.merchantNetAmount,
                transaction.currency
              )}
            </p>
          )}
        </div>
      </div>

      {/* Row 3: customer + date + action */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ctex-border pt-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ctex-text">
            {transaction.customer?.name || "Guest"}
          </p>
          <p className="truncate text-[11px] text-ctex-text-muted">
            {transaction.customer?.email || "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-ctex-border bg-ctex-surface px-3 py-1.5 text-[11px] font-medium text-ctex-text transition hover:bg-ctex-panel"
        >
          Details
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>

      {/* Row 4: created date */}
      <p className="mt-2 text-[10px] uppercase tracking-wide text-ctex-text-muted">
        {formatDate(transaction.createdAt)}
      </p>
    </motion.div>
  );
}

function HeroPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs">
      <Icon className="h-3 w-3 text-white/80 sm:h-3.5 sm:w-3.5" />
      {children}
    </span>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
}) {
  return (
    <label className="block text-xs text-ctex-text-muted">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        step={type === "number" ? "1" : undefined}
        className="mt-1.5 h-11 w-full rounded-xl border border-ctex-border bg-ctex-panel/60 px-3 text-sm text-ctex-text outline-none transition focus:border-ctex-accent sm:h-10"
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <label className="block text-xs text-ctex-text-muted">
      {label}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1.5 h-11 w-full rounded-xl border border-ctex-border bg-ctex-panel/60 px-3 text-sm text-ctex-text outline-none transition focus:border-ctex-accent sm:h-10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Th({ children }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap bg-ctex-panel px-5 py-3 font-medium first:rounded-l-xl last:rounded-r-xl"
    >
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td className="border-b border-ctex-border px-5 py-3.5 text-sm transition group-hover:bg-ctex-panel/60">
      {children}
    </td>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-ctex-text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-ctex-text">
        {value}
      </dd>
    </div>
  );
}

function SkeletonRows({ rows, cols }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-5 py-4">
              <div className="h-4 w-full animate-pulse rounded bg-ctex-panel" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}