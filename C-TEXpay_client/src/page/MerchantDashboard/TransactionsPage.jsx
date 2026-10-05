import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useTransactionStore } from "../../store/transaction.store";

const PAGE_SIZES = [10, 20, 50];
const STATUS_OPTIONS = ["PENDING", "SUCCESS", "FAILED", "EXPIRED", "CANCELLED"];

function formatMoney(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusClass(status) {
  if (status === "SUCCESS") return "bg-emerald-500/10 text-emerald-500";
  if (status === "PENDING") return "bg-amber-500/10 text-amber-500";
  return "bg-red-500/10 text-red-500";
}

export default function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const initialPaymentReference = searchParams.get("paymentReference") || "";
  const { user } = useAuthStore();
  const { businessProfile, roles } = useMerchantStore();
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
      } else if (key === "minAmount" || key === "maxAmount") {
        next[key] = value;
      } else {
        next[key] = value;
      }
    }
    setPage(1);
    setAppliedFilters(next);
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

  const start = meta.total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, meta.total);

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant workspace"}
      subtitle="Transactions"
      profileName={user ? `${user.firstName} ${user.lastName}`.trim() : "User"}
      profileRole={roles[0]?.name || "Member"}
      navSections={[
        {
          title: "Overview",
          items: [
            { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/merchant/dashboard" },
            { key: "transactions", label: "Transactions", icon: "transactions", path: "/merchant/dashboard/transactions" },
            { key: "customers", label: "Customers", icon: "customers", path: "/merchant/dashboard/customers" },
          ],
        },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ctex-text">Payment history</h2>
          <p className="mt-1 text-sm text-ctex-text-muted">Search and review payments in this workspace.</p>
        </div>
        <p className="text-sm text-ctex-text-muted">
          {meta.total.toLocaleString()} transaction{meta.total === 1 ? "" : "s"}
        </p>
      </div>

      <form onSubmit={applyFilters} className="mb-4 rounded-2xl border border-ctex-border bg-ctex-surface p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Payment reference" name="paymentReference" value={filters.paymentReference} onChange={updateFilter} placeholder="CTEXPAY_…" />
          <Field label="Merchant reference contains" name="merchantReference" value={filters.merchantReference} onChange={updateFilter} placeholder="Order number" />
          <label className="block text-xs text-ctex-text-muted">
            Status
            <select name="status" value={filters.status} onChange={updateFilter} className="mt-1.5 h-10 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue">
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="block text-xs text-ctex-text-muted">
            Payment method
            <select name="paymentMethod" value={filters.paymentMethod} onChange={updateFilter} className="mt-1.5 h-10 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue">
              <option value="">All methods</option>
              <option value="ACCOUNT_TRANSFER">Account transfer</option>
            </select>
          </label>
          <Field label="From" name="from" type="datetime-local" value={filters.from} onChange={updateFilter} />
          <Field label="To" name="to" type="datetime-local" value={filters.to} onChange={updateFilter} />
          <Field label="Minimum amount (minor units)" name="minAmount" type="number" min="0" value={filters.minAmount} onChange={updateFilter} />
          <Field label="Maximum amount (minor units)" name="maxAmount" type="number" min="0" value={filters.maxAmount} onChange={updateFilter} />
          <label className="block text-xs text-ctex-text-muted">
            Sort
            <select name="sortBy" value={filters.sortBy} onChange={updateFilter} className="mt-1.5 h-10 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue">
              <option value="createdAt">Newest first</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
            </select>
          </label>
          <label className="block text-xs text-ctex-text-muted">
            Direction
            <select name="direction" value={filters.direction} onChange={updateFilter} className="mt-1.5 h-10 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue">
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={resetFilters} className="rounded-xl border border-ctex-border px-4 py-2 text-sm text-ctex-text-muted hover:bg-ctex-elevated">Reset</button>
          <button type="submit" disabled={isLoading} className="rounded-xl bg-ctex-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ctex-blue-light disabled:opacity-60">Apply filters</button>
        </div>
      </form>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ctex-border">
            <thead className="bg-ctex-elevated/60 text-left text-xs text-ctex-text-muted">
              <tr>
                <Th>Payment</Th>
                <Th>Customer</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th><span className="sr-only">Details</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ctex-border">
              {isLoading && transactions.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-ctex-text-muted">Loading transactions…</td></tr>
              )}
              {!isLoading && transactions.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-ctex-text-muted">No transactions match these filters.</td></tr>
              )}
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-ctex-elevated/30">
                  <Td>
                    <span className="font-medium text-ctex-text">{transaction.paymentReference}</span>
                    <span className="mt-1 block text-xs text-ctex-text-muted">
                      {transaction.merchantReference || "No merchant reference"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-ctex-text">{transaction.customer?.name || "Guest"}</span>
                    <span className="mt-1 block text-xs text-ctex-text-muted">{transaction.customer?.email || "—"}</span>
                  </Td>
                  <Td>
                    <div className="whitespace-nowrap">
                      <span className="font-medium text-ctex-text">
                        {formatMoney(transaction.amount, transaction.currency)}
                      </span>
                      {transaction.fees && (
                        <span className="mt-1 block text-xs text-emerald-500">
                          Net {formatMoney(transaction.fees.merchantNetAmount, transaction.currency)}
                        </span>
                      )}
                      {transaction.fees && transaction.fees.totalFee > 0 && (
                        <span className="block text-[11px] text-ctex-text-muted">
                          Fee {formatMoney(transaction.fees.totalFee, transaction.currency)}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </Td>
                  <Td>
                    <span className="whitespace-nowrap text-xs text-ctex-text-muted">
                      {formatDate(transaction.createdAt)}
                    </span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => openDetail(transaction.paymentReference)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ctex-blue hover:bg-ctex-blue/10"
                    >
                      Details
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ctex-border px-4 py-3">
          <div className="flex items-center gap-3 text-xs text-ctex-text-muted">
            <span>Showing {start}–{end} of {meta.total.toLocaleString()}</span>
            <select
              aria-label="Rows per page"
              value={limit}
              onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}
              className="rounded-lg border border-ctex-border bg-ctex-elevated/60 px-2 py-1.5 text-xs text-ctex-text"
            >
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} / page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-ctex-border px-3 py-1.5 text-xs text-ctex-text disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-ctex-text-muted">
              Page {page} of {Math.max(meta.totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={page >= meta.totalPages || isLoading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-ctex-border px-3 py-1.5 text-xs text-ctex-text disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {detailOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="transaction-detail-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-2xl"
              initial={{ y: 12, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, scale: 0.98 }}
            >
              <div className="flex items-start justify-between gap-3 border-b border-ctex-border pb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ctex-text-muted">C-TEX PAY transaction</p>
                  <h2 id="transaction-detail-title" className="mt-1 break-all text-lg font-semibold text-ctex-text">
                    {selectedTransaction?.paymentReference || "Transaction details"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  aria-label="Close transaction details"
                  className="rounded-lg p-2 text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text"
                >
                  <X size={18} />
                </button>
              </div>

              {isLoading && !selectedTransaction ? (
                <p className="py-8 text-sm text-ctex-text-muted">Loading transaction…</p>
              ) : selectedTransaction ? (
                <>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Detail label="Payment reference" value={selectedTransaction.paymentReference} />
                    <Detail label="Merchant reference" value={selectedTransaction.merchantReference || "—"} />
                    <Detail label="Amount" value={formatMoney(selectedTransaction.amount, selectedTransaction.currency)} />
                    <Detail label="Status" value={selectedTransaction.status} />
                    <Detail label="Payment method" value={selectedTransaction.paymentMethod} />
                    <Detail label="Currency" value={selectedTransaction.currency} />
                    <Detail label="Customer" value={selectedTransaction.customer?.name || "Guest"} />
                    <Detail label="Customer email" value={selectedTransaction.customer?.email || "—"} />
                    <Detail label="Customer phone" value={selectedTransaction.customer?.phone || "—"} />
                    <Detail label="Created" value={formatDate(selectedTransaction.createdAt)} />
                    <Detail label="Updated" value={formatDate(selectedTransaction.updatedAt)} />
                  </dl>

                  {selectedTransaction.fees && (
                    <div className="mt-4 rounded-xl border border-ctex-border bg-ctex-elevated/40 p-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                        Fee breakdown
                      </p>
                      <dl className="grid gap-3 sm:grid-cols-2">
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
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, min }) {
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
        className="mt-1.5 h-10 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue"
      />
    </label>
  );
}

function Th({ children }) {
  return <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-3 text-sm">{children}</td>;
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ctex-text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ctex-text">{value}</dd>
    </div>
  );
}