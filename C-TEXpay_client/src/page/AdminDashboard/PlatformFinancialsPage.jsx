import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

const LIMIT = 25;
const money = (value) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(Number(value || 0) / 100);

export default function PlatformFinancialsPage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, totalItems: 0, totalPages: 0 });
  const [filters, setFilters] = useState({});
  const [form, setForm] = useState({ dateFrom: "", dateTo: "", provider: "", settlementStatus: "", merchantId: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navSections = useMemo(() => [{ title: "Platform", items: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/super-admin/dashboard" },
    { key: "merchants", label: "Merchants", icon: "business", path: "/super-admin/merchants" },
    { key: "transactions", label: "Transactions", icon: "transactions", path: "/super-admin/transactions" },
    { key: "financials", label: "Financial breakdown", icon: "fees", path: "/super-admin/financials" },
    { key: "withdrawal-fees", label: "Withdrawal charges", icon: "fees", path: "/super-admin/withdrawal-fees" },
    { key: "fees", label: "Payment fee configuration", icon: "fees", path: "/super-admin/fees" },
    { key: "audit-logs", label: "Audit logs", icon: "security", path: "/super-admin/audit-logs" },
  ] }], []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { page, limit: LIMIT, ...filters };
      const [nextSummary, nextRecords] = await Promise.all([
        platformAdminService.getFinancialSummary(filters),
        platformAdminService.getFinancialPayments(params),
      ]);
      setSummary(nextSummary);
      setRecords(nextRecords.data || []);
      setPagination(nextRecords.pagination || { page, limit: LIMIT, totalItems: 0, totalPages: 0 });
    } catch (e) { setError(e.response?.data?.message || "Could not load financial reports."); }
    finally { setLoading(false); }
  }, [filters, page]);
  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const applyFilters = (event) => {
    event.preventDefault();
    const next = {};
    if (form.dateFrom) next.dateFrom = new Date(`${form.dateFrom}T00:00:00`).toISOString();
    if (form.dateTo) next.dateTo = new Date(`${form.dateTo}T23:59:59.999`).toISOString();
    if (form.provider) next.provider = form.provider;
    if (form.settlementStatus) next.settlementStatus = form.settlementStatus;
    if (form.merchantId.trim()) next.merchantId = form.merchantId.trim();
    setPage(1); setFilters(next);
  };
  const p = summary?.payments || {};
  const w = summary?.withdrawals || {};
  const cards = [
    ["Successful payment volume", p.grossVolume],
    ["Confirmed provider charges", p.confirmedProviderCharges],
    ["Estimated provider charges", p.estimatedProviderCharges],
    ["Provider-reported charges", p.providerReportedCharges],
    ["C-TEX payment service fees", p.ctexServiceFeeRevenue],
    ["Merchant net payable", p.merchantNetPayable],
    ["Actual provider settlements", p.actualProviderSettlements],
    ["Confirmed gross processing margin", p.ctexGrossProcessingMargin],
    ["Estimated gross processing margin", p.estimatedCtexGrossProcessingMargin],
    ["Pending expected settlements", p.pendingExpectedSettlement],
    ["Successful withdrawals", w.successfulPayoutAmount],
    ["Withdrawal charges collected", w.ctexWithdrawalChargesCollected],
  ];

  return <DashboardLayout title="Super Admin" subtitle="Financial breakdown" navSections={navSections} profileName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Super Admin"} profileRole={user?.role}>
    <div className="mb-4"><h2 className="text-xl font-semibold text-ctex-text">Successful payment financials</h2><p className="mt-1 text-sm text-ctex-text-muted">{summary?.scope || "Provider-confirmed successful payments only"}. Estimated provider costs and settlements are labeled separately.</p></div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(([label, value]) => <div key={label} className="rounded-xl border border-ctex-border bg-ctex-surface p-4"><p className="text-xs text-ctex-text-muted">{label}</p><p className="mt-2 text-lg font-semibold text-ctex-text">{loading && value === undefined ? "Loading…" : money(value)}</p></div>)}
    </section>
    <section className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-ctex-border bg-ctex-surface p-4"><p className="text-sm text-ctex-text-muted">Settlement discrepancies</p><p className="mt-1 text-xl font-semibold text-ctex-text">{Number(p.settlementDiscrepancyCount || 0).toLocaleString()}</p><p className="text-xs text-ctex-text-muted">Difference: {money(p.settlementDiscrepancyAmount)}</p></div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-ctex-text-muted">Gross processing margin is before operating costs, taxes, refunds, chargebacks, payout costs, and other expenses. Provider-reported amounts are not represented as bank-settled cash.</div>
    </section>
    <form onSubmit={applyFilters} className="my-5 grid gap-3 rounded-xl border border-ctex-border bg-ctex-surface p-4 sm:grid-cols-2 xl:grid-cols-6">
      <label className="text-xs text-ctex-text-muted">Success from<input type="date" value={form.dateFrom} onChange={e => setForm({ ...form, dateFrom: e.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text" /></label>
      <label className="text-xs text-ctex-text-muted">Success to<input type="date" value={form.dateTo} onChange={e => setForm({ ...form, dateTo: e.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text" /></label>
      <label className="text-xs text-ctex-text-muted">Provider<select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"><option value="">All providers</option><option>MONNIFY</option><option>XIXAPAY</option></select></label>
      <label className="text-xs text-ctex-text-muted">Settlement status<select value={form.settlementStatus} onChange={e => setForm({ ...form, settlementStatus: e.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text"><option value="">All</option>{["PENDING", "REPORTED", "CONFIRMED", "DISCREPANCY", "UNAVAILABLE"].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="text-xs text-ctex-text-muted">Merchant ID<input value={form.merchantId} onChange={e => setForm({ ...form, merchantId: e.target.value })} placeholder="Merchant UUID" className="mt-1 block h-10 w-full rounded-lg border border-ctex-border bg-ctex-elevated px-2 text-sm text-ctex-text" /></label>
      <button className="self-end rounded-lg bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white">Apply filters</button>
    </form>
    <section className="overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface">
      <div className="border-b border-ctex-border px-4 py-3"><h3 className="font-semibold text-ctex-text">Payment financial records</h3><p className="text-xs text-ctex-text-muted">{pagination.totalItems.toLocaleString()} records · successful payments only</p></div>
      <div className="overflow-x-auto"><table className="min-w-[1500px] w-full text-left text-xs"><thead className="bg-ctex-elevated text-ctex-text-muted"><tr>{["Success date", "Merchant", "C-TEX reference", "Provider reference", "Provider", "Gross", "Provider fee (est.)", "C-TEX fee", "Merchant net", "Expected settle", "Reported settle", "Actual settle", "Margin (est.)", "Status", "Details"].map(h => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={15} className="p-8 text-center text-ctex-text-muted">Loading report…</td></tr> : records.length === 0 ? <tr><td colSpan={15} className="p-8 text-center text-ctex-text-muted">No successful financial records match these filters.</td></tr> : records.map(row => { const pay = row.payment || {}; const merchantName = pay.merchant?.businessProfile?.businessName || pay.merchant?.merchantCode || pay.merchantId; return <tr key={row.id} className="border-t border-ctex-border text-ctex-text">
          <td className="whitespace-nowrap px-3 py-3">{row.paymentSuccessAt ? new Date(row.paymentSuccessAt).toLocaleString() : "—"}</td><td>{merchantName || "—"}</td><td className="font-mono">{pay.paymentReference || "—"}</td><td className="font-mono">{pay.providerReference || row.providerReference || "—"}</td><td>{row.provider || pay.provider || "—"}</td><td>{money(row.grossAmount)}</td><td>{row.providerFeeEstimate == null ? "Unknown" : money(row.providerFeeEstimate)}</td><td>{money(row.serviceFee)}</td><td>{money(row.merchantNetAmount)}</td><td>{row.expectedSettlementAmount == null ? "Unknown" : money(row.expectedSettlementAmount)}</td><td>{row.providerReportedSettlementAmount == null ? "—" : money(row.providerReportedSettlementAmount)}</td><td>{row.actualSettlementAmount == null ? "Pending" : money(row.actualSettlementAmount)}</td><td>{row.estimatedCtexGrossMargin == null ? "Unknown" : money(row.estimatedCtexGrossMargin)}</td><td>{row.settlementStatus}</td><td><details><summary className="cursor-pointer text-ctex-blue">View / reconcile</summary><div className="absolute z-10 w-[min(90vw,28rem)] rounded-lg border border-ctex-border bg-ctex-surface p-3 shadow-xl"><p>Financial status: {row.financialStatus}</p><p>Provider fee reported: {row.providerReportedFee == null ? "Unknown" : money(row.providerReportedFee)}</p><p>Confirmed provider fee: {row.providerFee == null ? "Unknown" : money(row.providerFee)}</p><p>Actual margin: {row.ctexGrossMargin == null ? "Unknown" : money(row.ctexGrossMargin)}</p><p>Reconciliation difference: {row.reconciliationDifference == null ? "—" : money(row.reconciliationDifference)}</p><SettlementReconcileForm paymentReference={pay.paymentReference} onSaved={load} /></div></details></td>
        </tr>; })}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-ctex-border p-3 text-xs text-ctex-text-muted"><span>Page {page} / {Math.max(1, pagination.totalPages)}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages || loading} onClick={() => setPage(page + 1)} className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
    </section>
  </DashboardLayout>;
}

function SettlementReconcileForm({ paymentReference, onSaved }) {
  const [actualSettlement, setActualSettlement] = useState("");
  const [actualProviderFee, setActualProviderFee] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      await platformAdminService.reconcileFinancialSettlement(paymentReference, {
        actualSettlementAmount: Math.round(Number(actualSettlement) * 100),
        ...(actualProviderFee === "" ? {} : { actualProviderFee: Math.round(Number(actualProviderFee) * 100) }),
        reason: reason.trim(),
      });
      setMessage("Settlement evidence recorded and audited.");
      setActualSettlement(""); setActualProviderFee(""); setReason("");
      await onSaved();
    } catch (e) { setMessage(e.response?.data?.message || "Could not save settlement evidence."); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="mt-3 space-y-2 border-t border-ctex-border pt-3">
    <p className="text-xs font-semibold">Record reviewed settlement evidence</p>
    <label className="block text-[11px]">Actual settlement received (NGN)<input required type="number" min="0" step="0.01" value={actualSettlement} onChange={e => setActualSettlement(e.target.value)} className="mt-1 h-8 w-full rounded border border-ctex-border bg-ctex-elevated px-2 text-xs" /></label>
    <label className="block text-[11px]">Actual provider fee (optional, NGN)<input type="number" min="0" step="0.01" value={actualProviderFee} onChange={e => setActualProviderFee(e.target.value)} className="mt-1 h-8 w-full rounded border border-ctex-border bg-ctex-elevated px-2 text-xs" /></label>
    <label className="block text-[11px]">Evidence / reconciliation note<input required minLength={8} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 h-8 w-full rounded border border-ctex-border bg-ctex-elevated px-2 text-xs" /></label>
    <button disabled={saving} className="rounded bg-ctex-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Recording…" : "Record reconciliation"}</button>
    {message && <p role="status" className="text-[11px]">{message}</p>}
  </form>;
}
