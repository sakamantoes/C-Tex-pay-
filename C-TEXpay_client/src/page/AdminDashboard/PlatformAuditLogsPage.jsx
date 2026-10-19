import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

const LIMIT = 25;

export default function PlatformAuditLogsPage({ platformRole }) {
  const { user } = useAuthStore();
  const base = platformRole === "SUPER_ADMIN" ? "/super-admin" : "/admin";
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navSections = useMemo(() => [{ title: "Platform", items: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: `${base}/dashboard` },
    { key: "merchants", label: "Merchants", icon: "business", path: `${base}/merchants` },
    { key: "transactions", label: "Transactions", icon: "transactions", path: `${base}/transactions` },
    { key: "fees", label: "Fee configuration", icon: "fees", path: `${base}/fees` },
    { key: "audit-logs", label: "Audit logs", icon: "security", path: `${base}/audit-logs` },
  ] }], [base]);

  useEffect(() => {
    let active = true;
    platformAdminService.getAuditLogs({ page, limit: LIMIT })
      .then((response) => { if (active) { setLogs(response.data || []); setPagination(response.pagination || { totalItems: 0, totalPages: 0 }); } })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Unable to load audit records."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  const displayName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || platformRole;
  return <DashboardLayout title={platformRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"} subtitle="Administrative audit log" navSections={navSections} profileName={displayName} profileRole={user?.role}>
    <div className="mb-5"><h2 className="text-xl font-semibold text-ctex-text">Administrative audit log</h2><p className="mt-1 text-sm text-ctex-text-muted">Read-only record of sensitive platform actions.</p></div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}
    <div className="overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-ctex-border"><thead className="bg-ctex-elevated/50 text-left text-xs text-ctex-text-muted"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Change</th></tr></thead><tbody className="divide-y divide-ctex-border">{loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ctex-text-muted">Loading audit records…</td></tr> : logs.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ctex-text-muted">No audit records available.</td></tr> : logs.map((log) => <tr key={log.id} className="align-top"><td className="whitespace-nowrap px-4 py-3 text-xs text-ctex-text-muted">{new Date(log.createdAt).toLocaleString()}</td><td className="px-4 py-3 text-xs text-ctex-text">{log.actor ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.email})` : log.actorUserId}</td><td className="px-4 py-3 text-xs font-medium text-ctex-text">{log.action}</td><td className="px-4 py-3 text-xs text-ctex-text-muted">{log.resourceType}<span className="mt-1 block font-mono text-[10px]">{log.resourceId}</span></td><td className="max-w-xs px-4 py-3 text-xs text-ctex-text-muted">{log.reason || "—"}</td><td className="px-4 py-3 font-mono text-[10px] text-ctex-text-muted">{JSON.stringify({ before: log.beforeValue, after: log.afterValue })}</td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-ctex-border px-4 py-3 text-xs text-ctex-text-muted"><span>{pagination.totalItems || 0} records · Page {page} of {Math.max(pagination.totalPages || 0, 1)}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= (pagination.totalPages || 0) || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-ctex-border px-3 py-1.5 disabled:opacity-40">Next</button></div></div></div>
  </DashboardLayout>;
}
