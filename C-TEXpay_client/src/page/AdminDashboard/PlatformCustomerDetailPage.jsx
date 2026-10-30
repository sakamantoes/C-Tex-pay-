import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import platformAdminService from "../../service/platformAdmin.service";

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

export default function PlatformCustomerDetailPage({ platformRole }) {
  const { merchantId, customerId } = useParams();
  const { user } = useAuthStore();
  const basePath = platformRole === "SUPER_ADMIN" ? "/super-admin" : "/admin";
  const navSections = useMemo(() => navFor(basePath), [basePath]);
  const displayName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || platformRole;

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await platformAdminService.getMerchantCustomer(
        merchantId,
        customerId
      );
      setCustomer(response.data?.customer || null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to load customer."
      );
    } finally {
      setLoading(false);
    }
  }, [merchantId, customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout
      title={platformRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
      subtitle="Customer detail"
      navSections={navSections}
      profileName={displayName}
      profileRole={user?.role}
    >
      <Link
        to={`${basePath}/merchants/${merchantId}`}
        className="text-sm text-ctex-blue hover:underline"
      >
        ← Back to merchant
      </Link>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-sm text-ctex-text-muted">Loading customer…</p>
      ) : !customer ? (
        <p className="py-10 text-sm text-ctex-text-muted">Customer not found.</p>
      ) : (
        <section className="mt-4 rounded-xl border border-ctex-border bg-ctex-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-ctex-text">
                {`${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Unnamed customer"}
              </h3>
              <p className="mt-1 font-mono text-xs text-ctex-text-muted">
                {customer.customerCode} · {customer.id}
              </p>
            </div>
            <span className="rounded-full bg-ctex-elevated px-3 py-1 text-xs text-ctex-text">
              {customer.status}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Info label="Email" value={customer.email || "—"} />
            <Info label="Phone" value={customer.phone || "—"} />
            <Info
              label="Created"
              value={customer.createdAt ? new Date(customer.createdAt).toLocaleString() : "—"}
            />
            <Info
              label="Last updated"
              value={customer.updatedAt ? new Date(customer.updatedAt).toLocaleString() : "—"}
            />
            <Info label="Merchant" value={merchantId} extra="Internal ID" />
            <Info label="Customer ID" value={customer.id} extra="Internal UUID" />
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}

function Info({ label, value, extra }) {
  return (
    <div className="rounded-lg border border-ctex-border bg-ctex-elevated/30 p-3">
      <p className="text-[11px] uppercase tracking-wide text-ctex-text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-ctex-text">{value || "—"}</p>
      {extra && <p className="mt-1 break-words text-xs text-ctex-text-muted">{extra}</p>}
    </div>
  );
}