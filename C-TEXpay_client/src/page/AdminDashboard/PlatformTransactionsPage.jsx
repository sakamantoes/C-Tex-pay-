import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

const LIMIT = 20;
const STATUSES = ["PENDING", "SUCCESS", "FAILED", "EXPIRED", "CANCELLED"];

function formatMoneyMinor(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);
}

const createNav = (basePath) => [{
  title: "Platform",
  items: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: `${basePath}/dashboard` },
    { key: "transactions", label: "Transactions", icon: "transactions", path: `${basePath}/transactions` },
    { key: "fees", label: "Fee configuration", icon: "fees", path: `${basePath}/fees` },
  ],
}];

export default function PlatformTransactionsPage({ platformRole }) {
  const { user } = useAuthStore();
  const basePath = platformRole === "SUPER_ADMIN" ? "/super-admin" : "/admin";
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, totalItems: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [applied, setApplied] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    platformAdminService.getPayments({ page, limit: LIMIT, ...applied })
      .then((response) => {
        if (!active) return;
        setPayments(response.data?.payments || []);
        setPagination(response.data?.pagination || { page, limit: LIMIT, totalItems: 0, totalPages: 0 });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load platform transactions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, applied]);

  const applyFilters = (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    setPage(1);
    setApplied({
      ...(status ? { status } : {}),
      ...(merchantId.trim() ? { merchantId: merchantId.trim() } : {}),
      ...(paymentReference.trim() ? { paymentReference: paymentReference.trim() } : {}),
    });
  };

  const resetFilters = () => {
    setStatus("");
    setMerchantId("");
    setPaymentReference("");
    setLoading(true);
    setPage(1);
    setApplied({});
    setError("");
  };

  const start = pagination.totalItems === 0 ? 0 : (page - 1) * LIMIT + 1;
  const end = Math.min(page * LIMIT, pagination.totalItems);
  const displayName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || platformRole;

  return (
    <DashboardLayout
      title={platformRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
      subtitle="Platform transactions"
      navSections={createNav(basePath)}
      profileName={displayName}
      profileRole={user?.role}
    >
      <div className="mb-5"><h2 className="text-xl font-semibold text-ctex-text">All transactions</h2><p className="mt-1 text-sm text-ctex-text-muted">Platform-wide payment records, with merchant-scoped filters.</p></div>

      <form onSubmit={applyFilters} className="mb-4 grid gap-3 rounded-xl border border-ctex-border bg-ctex-surface p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto]">
        <label className="text-xs text-ctex-text-muted">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated/50 px-3 text-sm text-ctex-text"><option value="">All statuses</option>{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="text-xs text-ctex-text-muted">Merchant ID<input value={merchantId} onChange={(event) => setMerchantId(event.target.value)} placeholder="Merchant UUID" className="mt-1.5 h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated/50 px-3 text-sm text-ctex-text" /></label>
        <label className="text-xs text-ctex-text-muted">Payment reference<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Exact C-TEX PAY reference" className="mt-1.5 h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated/50 px-3 text-sm text-ctex-text" /></label>
        <button type="submit" disabled={loading} className="self-end rounded-lg bg-ctex-blue px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">Apply</button>
        <button type="button" onClick={resetFilters} className="self-end rounded-lg border border-ctex-border px-4 py-2.5 text-xs font-medium text-ctex-text">Reset</button>
      </form>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ctex-border">
            <thead className="bg-ctex-elevated/50 text-left text-xs text-ctex-text-muted"><tr><th className="px-4 py-3 font-medium">Payment reference</th><th className="px-4 py-3 font-medium">Merchant</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Created</th></tr></thead>
            <tbody className="divide-y divide-ctex-border">
              {loading && payments.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ctex-text-muted">Loading platform transactions…</td></tr> : payments.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ctex-text-muted">No transactions found.</td></tr> : payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-ctex-elevated/30"><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ctex-text">{payment.paymentReference}</td><td className="px-4 py-3 font-mono text-xs text-ctex-text-muted">{payment.merchantId?.slice(0, 8) || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-sm text-ctex-text">{formatMoneyMinor(payment.amount, payment.currency)}</td><td className="px-4 py-3 text-xs text-ctex-text-muted">{payment.status}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-ctex-text-muted">{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ctex-border px-4 py-3 text-xs text-ctex-text-muted"><span>Showing {start}–{end} of {pagination.totalItems.toLocaleString()}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => current - 1); }} className="rounded-lg border border-ctex-border px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => { setLoading(true); setPage((current) => current + 1); }} className="rounded-lg border border-ctex-border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </div>
    </DashboardLayout>
  );
}
