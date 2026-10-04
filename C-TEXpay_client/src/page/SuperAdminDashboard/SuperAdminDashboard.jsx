import DashboardLayout from "../../components/dashboard/DashboardLayout";

const superAdminNav = [
  {
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      { key: "merchants", label: "Merchants", icon: "merchants", children: [
          { key: "all-merchants", label: "All Merchants" },
          { key: "pending", label: "Pending" },
          { key: "suspended", label: "Suspended" },
          { key: "merchant-details", label: "Merchant Details" },
        ],
      },
      { key: "transactions", label: "Transactions", icon: "transactions", children: [
          { key: "all-transactions", label: "All Transactions" },
          { key: "successful", label: "Successful" },
          { key: "failed", label: "Failed" },
          { key: "pending", label: "Pending" },
          { key: "reversed", label: "Reversed" },
        ],
      },
      { key: "customers", label: "Customers", icon: "customers" },
      { key: "withdrawals", label: "Withdrawals", icon: "withdrawals", children: [
          { key: "withdrawals-pending", label: "Pending" },
          { key: "withdrawals-completed", label: "Completed" },
          { key: "withdrawals-failed", label: "Failed" },
          { key: "withdrawals-reversed", label: "Reversed" },
        ],
      },
      { key: "disputes", label: "Disputes", icon: "disputes" },
      { key: "payment-providers", label: "Payment Providers", icon: "payments", children: [
          { key: "providers", label: "Providers" },
          { key: "provider-health", label: "Provider Health" },
          { key: "provider-config", label: "Provider Configuration" },
        ],
      },
      { key: "fees", label: "Fees", icon: "fees", children: [
          { key: "platform-fees", label: "Platform Fees" },
          { key: "merchant-fees", label: "Merchant Fees" },
          { key: "fee-config", label: "Fee Configuration" },
        ],
      },
      { key: "users-staff", label: "Users & Staff", icon: "users", children: [
          { key: "admins", label: "Admins" },
          { key: "staff", label: "Staff" },
          { key: "roles", label: "Roles" },
          { key: "permissions", label: "Permissions" },
        ],
      },
      { key: "security", label: "Security", icon: "security", children: [
          { key: "audit-logs", label: "Audit Logs" },
          { key: "api-activity", label: "API Activity" },
          { key: "security-events", label: "Security Events" },
        ],
      },
      { key: "system", label: "System", icon: "system", children: [
          { key: "settings", label: "Settings" },
          { key: "email-config", label: "Email Configuration" },
          { key: "webhook-config", label: "Webhook Configuration" },
          { key: "platform-config", label: "Platform Configuration" },
        ],
      },
      { key: "support", label: "Support", icon: "support" },
      { key: "notifications", label: "Notifications", icon: "notifications" },
      { key: "profile", label: "Profile", icon: "profile" },
    ],
  },
];

const SuperAdminDashboard = () => {
  return (
    <DashboardLayout
      title="Super Admin"
      subtitle="Platform control center"
      navSections={superAdminNav}
      profileName="Platform Owner"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Merchants", "312", "18 pending"],
          ["Gross Volume", "$8.4M", "+19.7%"],
          ["Failed Txns", "94", "2.1% failure rate"],
          ["Uptime", "99.98%", "Stable"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
            <p className="text-sm text-ctex-text-muted">{label}</p>
            <h3 className="mt-3 text-3xl font-semibold text-ctex-text">{value}</h3>
            <p className="mt-2 text-xs text-ctex-text-muted">{detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
          <h3 className="text-lg font-semibold text-ctex-text">Platform status</h3>
          <div className="mt-4 space-y-3">
            {[
              ["Gateway availability", "99.98%"],
              ["Provider health", "Healthy"],
              ["Security incidents", "2 resolved"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-ctex-border bg-ctex-elevated px-3 py-3">
                <span className="text-ctex-text-muted">{label}</span>
                <span className="font-semibold text-ctex-text">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
          <h3 className="text-lg font-semibold text-ctex-text">Operations</h3>
          <div className="mt-4 space-y-2">
            {[
              "Review pending merchants",
              "Audit fee settings",
              "Inspect provider health",
              "Download security logs",
            ].map((action) => (
              <button
                key={action}
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-ctex-border bg-ctex-elevated px-3 py-2.5 text-sm text-ctex-text transition hover:border-ctex-blue hover:text-ctex-blue"
              >
                {action}
                <span>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
