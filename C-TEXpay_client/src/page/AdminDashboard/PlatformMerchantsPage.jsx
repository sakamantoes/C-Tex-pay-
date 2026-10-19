import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

const LIMIT = 20;
const navFor = (base) => [{
  title: "Platform",
  items: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: `${base}/dashboard` },
    { key: "merchants", label: "Merchants", icon: "business", path: `${base}/merchants` },
    { key: "transactions", label: "Transactions", icon: "transactions", path: `${base}/transactions` },
    { key: "fees", label: "Fee configuration", icon: "fees", path: `${base}/fees` },
    { key: "audit-logs", label: "Audit logs", icon: "security", path: `${base}/audit-logs` },
  ],
}];

export default function PlatformMerchantsPage({ platformRole }) {
  const { merchantId } = useParams();
  const { user } = useAuthStore();
  const basePath = platformRole === "SUPER_ADMIN" ? "/super-admin" : "/admin";
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, totalItems: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [onboardingStatus, setOnboardingStatus] = useState("");
  const [applied, setApplied] = useState({});
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const displayName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || platformRole;

  const reloadDetail = useCallback(async () => {
    if (!merchantId) return;
    const response = await platformAdminService.getMerchant(merchantId);
    setDetail(response.data);
  }, [merchantId]);

  useEffect(() => {
    let active = true;
    platformAdminService.getMerchants({ page, limit: LIMIT, ...applied })
      .then((response) => {
        if (!active) return;
        setRows(response.data || []);
        setPagination(response.pagination || { page, limit: LIMIT, totalItems: 0, totalPages: 0 });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load merchants.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, applied]);

  useEffect(() => {
    if (!merchantId) return undefined;
    let active = true;
    platformAdminService.getMerchant(merchantId)
      .then((response) => { if (active) setDetail(response.data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Unable to load merchant details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [merchantId]);

  const navSections = useMemo(() => navFor(basePath), [basePath]);
  const applyFilters = (event) => {
    event.preventDefault();
    setError(""); setLoading(true); setPage(1);
    setApplied({ ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}), ...(onboardingStatus ? { onboardingStatus } : {}) });
  };

  const updateStatus = async () => {
    if (!detail || saving || reason.trim().length < 8) return;
    const nextStatus = detail.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const confirmation = nextStatus === "SUSPENDED"
      ? "Suspend this merchant? New merchant activity will be blocked. Existing payments, verification, and webhook updates will remain available."
      : "Reactivate this merchant and restore permitted merchant activity?";
    if (!window.confirm(confirmation)) return;
    setSaving(true); setError("");
    try {
      await platformAdminService.setMerchantStatus(detail.id, { status: nextStatus, reason: reason.trim() });
      setReason("");
      await reloadDetail();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update merchant status.");
    } finally { setSaving(false); }
  };

  return (
    <DashboardLayout title={platformRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"} subtitle="Merchant management" navSections={navSections} profileName={displayName} profileRole={user?.role}>
      <div className="mb-5"><h2 className="text-xl font-semibold text-ctex-text">Merchant management</h2><p className="mt-1 text-sm text-ctex-text-muted">Search merchant accounts, review onboarding details, and manage account status.</p></div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}

      {merchantId ? (
        <section className="rounded-xl border border-ctex-border bg-ctex-surface p-5">
          <Link to={`${basePath}/merchants`} className="text-sm text-ctex-blue hover:underline">← All merchants</Link>
          {loading || detail?.id !== merchantId ? <p className="py-10 text-sm text-ctex-text-muted">Loading merchant…</p> : detail && <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-semibold text-ctex-text">{detail.businessProfile?.businessName || detail.merchantCode}</h3><p className="mt-1 font-mono text-xs text-ctex-text-muted">{detail.merchantCode} · {detail.id}</p></div><span className="rounded-full bg-ctex-elevated px-3 py-1 text-xs text-ctex-text">{detail.status} · {detail.onboardingStatus}</span></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Info label="Owner" value={`${detail.owner?.firstName || ""} ${detail.owner?.lastName || ""}`.trim()} extra={detail.owner?.email} />
              <Info label="Business contact" value={detail.businessProfile?.email || "—"} extra={detail.businessProfile?.phone || ""} />
              <Info label="Registered" value={detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "—"} extra={`Owner account: ${detail.owner?.status || "—"}`} />
              <Info label="Team memberships" value={String(detail.members?.length || 0)} extra={(detail.members || []).filter((member) => member.status === "ACTIVE").length + " active"} />
              <Info label="API keys" value={String(detail.apiKeys?.length || 0)} extra="Only key metadata is shown; key material is never returned." />
              <Info label="Webhook" value={detail.webhookConfig?.enabled ? "Enabled" : detail.webhookConfig ? "Disabled" : "Not configured"} extra={detail.webhookConfig?.url || ""} />
            </div>
            <div className="mt-6"><h4 className="font-semibold text-ctex-text">Recent payments</h4><div className="mt-2 overflow-x-auto rounded-lg border border-ctex-border"><table className="min-w-full text-left text-xs"><thead className="bg-ctex-elevated text-ctex-text-muted"><tr><th className="px-3 py-2">Reference</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th></tr></thead><tbody className="divide-y divide-ctex-border">{(detail.recentPayments || []).map((payment) => <tr key={payment.id}><td className="px-3 py-2 font-mono">{payment.paymentReference}</td><td className="px-3 py-2">{payment.currency} {payment.amount}</td><td className="px-3 py-2">{payment.status}</td><td className="px-3 py-2">{new Date(payment.createdAt).toLocaleString()}</td></tr>)}{!detail.recentPayments?.length && <tr><td className="px-3 py-5 text-center text-ctex-text-muted" colSpan={4}>No payment records.</td></tr>}</tbody></table></div></div>
            {(detail.status === "ACTIVE" || detail.status === "SUSPENDED") && <div className="mt-6 border-t border-ctex-border pt-5"><h4 className="font-semibold text-ctex-text">{detail.status === "ACTIVE" ? "Suspend merchant" : "Reactivate merchant"}</h4><p className="mt-1 text-xs text-ctex-text-muted">An audit entry is created with your reason. Suspending blocks new merchant activity but preserves payment verification and existing records.</p><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Reason (at least 8 characters)" className="h-10 min-w-0 flex-1 rounded-lg border border-ctex-border bg-ctex-elevated/50 px-3 text-sm text-ctex-text" /><button type="button" disabled={saving || reason.trim().length < 8} onClick={updateStatus} className="rounded-lg bg-ctex-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : detail.status === "ACTIVE" ? "Suspend merchant" : "Reactivate merchant"}</button></div></div>}
          </>}
        </section>
      ) : <>
        <form onSubmit={applyFilters} className="mb-4 grid gap-3 rounded-xl border border-ctex-border bg-ctex-surface p-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Merchant code, business name, or owner email" className="h-10 rounded-lg border border-ctex-border bg-ctex-elevated/50 px-3 text-sm text-ctex-text" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-ctex-border bg-ctex-elevated/50 px-3 text-sm text-ctex-text"><option value="">All statuses</option>{["ACTIVE", "PENDING", "INACTIVE", "SUSPENDED"].map((value) => <option key={value}>{value}</option>)}</select><select value={onboardingStatus} onChange={(event) => setOnboardingStatus(event.target.value)} className="h-10 rounded-lg border border-ctex-border bg-ctex-elevated/50 px-3 text-sm text-ctex-text"><option value="">All onboarding</option>{["NOT_STARTED", "IN_PROGRESS", "COMPLETED"].map((value) => <option key={value}>{value}</option>)}</select><button type="submit" className="rounded-lg bg-ctex-blue px-4 py-2 text-sm font-semibold text-white">Search</button></form>
        <div className="overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-ctex-border"><thead className="bg-ctex-elevated/50 text-left text-xs text-ctex-text-muted"><tr><th className="px-4 py-3">Business</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Onboarding</th><th className="px-4 py-3">Created</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-ctex-border">{loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ctex-text-muted">Loading merchants…</td></tr> : !rows.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ctex-text-muted">No merchants found.</td></tr> : rows.map((merchant) => <tr key={merchant.id}><td className="px-4 py-3"><span className="block text-sm text-ctex-text">{merchant.businessProfile?.businessName || "Unnamed business"}</span><span className="font-mono text-[10px] text-ctex-text-muted">{merchant.merchantCode}</span></td><td className="px-4 py-3 text-xs text-ctex-text-muted">{merchant.owner?.email || "—"}</td><td className="px-4 py-3 text-xs text-ctex-text">{merchant.status}</td><td className="px-4 py-3 text-xs text-ctex-text-muted">{merchant.onboardingStatus}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-ctex-text-muted">{new Date(merchant.createdAt).toLocaleDateString()}</td><td className="px-4 py-3 text-right"><Link to={`${basePath}/merchants/${merchant.id}`} className="text-xs font-semibold text-ctex-blue hover:underline">View details</Link></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-ctex-border px-4 py-3 text-xs text-ctex-text-muted"><span>{pagination.totalItems.toLocaleString()} merchants · Page {page} of {Math.max(pagination.totalPages, 1)}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40">Next</button></div></div></div>
      </>}
    </DashboardLayout>
  );
}

function Info({ label, value, extra }) {
  return <div className="rounded-lg border border-ctex-border bg-ctex-elevated/30 p-3"><p className="text-[11px] uppercase tracking-wide text-ctex-text-muted">{label}</p><p className="mt-1 break-words text-sm font-medium text-ctex-text">{value || "—"}</p>{extra && <p className="mt-1 break-words text-xs text-ctex-text-muted">{extra}</p>}</div>;
}
