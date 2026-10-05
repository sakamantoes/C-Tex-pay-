import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

function formatMoneyMinor(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);
}

export default function PlatformDashboard({ platformRole }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const basePath = platformRole === "SUPER_ADMIN" ? "/super-admin" : "/admin";

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      platformAdminService.getOverview(),
      platformAdminService.getPayments({ page: 1, limit: 8, sortBy: "createdAt", sortDir: "DESC" }),
    ]).then(([summaryResult, paymentsResult]) => {
      if (!active) return;
      const errors = [];
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value.data);
      else errors.push(summaryResult.reason.response?.data?.message || "Could not load overview metrics.");
      if (paymentsResult.status === "fulfilled") setPayments(paymentsResult.value.data?.payments || []);
      else errors.push(paymentsResult.reason.response?.data?.message || "Could not load recent transactions.");
      if (errors.length) setError(errors.join(" "));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const navSections = useMemo(() => [{
    title: "Platform",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard", path: `${basePath}/dashboard` },
      { key: "transactions", label: "Transactions", icon: "transactions", path: `${basePath}/transactions` },
      { key: "fees", label: "Fee configuration", icon: "fees", path: `${basePath}/fees` },
    ],
  }], [basePath]);

  const displayName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || platformRole;
  const cards = [
    { label: "Merchants", value: summary?.merchants.total ?? "—", detail: `${summary?.merchants.active ?? 0} active · ${summary?.merchants.pending ?? 0} pending` },
    { label: "Transactions", value: summary?.transactions.total ?? "—", detail: `${summary?.transactions.successful ?? 0} successful · ${summary?.transactions.failed ?? 0} failed` },
    { label: "Successful volume", value: summary ? formatMoneyMinor(summary.transactions.successfulVolumeMinor, summary.currency) : "—", detail: `${summary?.transactions.successful ?? 0} successful payments` },
    { label: "Pending transactions", value: summary?.transactions.pending ?? "—", detail: "Across all merchant accounts" },
  ];

  return (
    <DashboardLayout
      title={platformRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
      subtitle="Platform operations"
      navSections={navSections}
      profileName={displayName}
      profileRole={user?.role}
    >
      {error && <div role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

      <section aria-label="Platform metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-ctex-border bg-ctex-surface p-5">
            <p className="text-sm text-ctex-text-muted">{card.label}</p>
            {loading ? <div className="mt-3 h-8 w-32 animate-pulse rounded bg-ctex-elevated" /> : <p className="mt-3 break-words text-2xl font-semibold text-ctex-text">{card.value}</p>}
            <p className="mt-2 text-xs text-ctex-text-muted">{card.detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ctex-border px-4 py-3">
          <div><h2 className="text-base font-semibold text-ctex-text">Recent platform transactions</h2><p className="mt-1 text-xs text-ctex-text-muted">Latest payment records across merchant accounts</p></div>
          <button type="button" onClick={() => navigate(`${basePath}/transactions`)} className="rounded-lg border border-ctex-border px-3 py-2 text-xs font-medium text-ctex-text hover:bg-ctex-elevated">View transactions</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ctex-border">
            <thead className="bg-ctex-elevated/40 text-left text-xs text-ctex-text-muted"><tr><th className="px-4 py-3 font-medium">Payment reference</th><th className="px-4 py-3 font-medium">Merchant</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Created</th></tr></thead>
            <tbody className="divide-y divide-ctex-border">
              {loading && payments.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ctex-text-muted">Loading transactions…</td></tr> : payments.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ctex-text-muted">No transactions found.</td></tr> : payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-ctex-elevated/30">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ctex-text">{payment.paymentReference}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ctex-text-muted">{payment.merchantId?.slice(0, 8) || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ctex-text">{formatMoneyMinor(payment.amount, payment.currency)}</td>
                  <td className="px-4 py-3 text-xs text-ctex-text-muted">{payment.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ctex-text-muted">{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
