import DashboardLayout from "../../components/dashboard/DashboardLayout";

const adminNav = [
  {
    title: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard" },
      { key: "merchants", label: "Merchants", icon: "merchants", children: [
          { key: "all-merchants", label: "All Merchants" },
          { key: "pending-merchants", label: "Pending Merchants" },
          { key: "merchant-details", label: "Merchant Details" },
        ],
      },
      { key: "transactions", label: "Transactions", icon: "transactions", children: [
          { key: "all-transactions", label: "All Transactions" },
          { key: "successful", label: "Successful" },
          { key: "failed", label: "Failed" },
          { key: "pending", label: "Pending" },
        ],
      },
      { key: "payments", label: "Payments", icon: "payments" },
      { key: "customers", label: "Customers", icon: "customers" },
      { key: "withdrawals", label: "Withdrawals", icon: "withdrawals", children: [
          { key: "withdrawals-pending", label: "Pending" },
          { key: "withdrawals-completed", label: "Completed" },
          { key: "withdrawals-failed", label: "Failed" },
        ],
      },
      { key: "disputes", label: "Disputes", icon: "disputes", children: [
          { key: "disputes-open", label: "Open" },
          { key: "disputes-resolved", label: "Resolved" },
        ],
      },
      { key: "support", label: "Support", icon: "support", children: [
          { key: "tickets", label: "Tickets" },
          { key: "complaints", label: "Complaints" },
        ],
      },
      { key: "system-activity", label: "System Activity", icon: "system" },
      { key: "notifications", label: "Notifications", icon: "notifications" },
      { key: "profile", label: "Profile", icon: "profile" },
    ],
  },
];

const AdminDashboard = () => {
  return (
    <DashboardLayout
      title="Admin"
      subtitle="Platform oversight"
      navSections={adminNav}
      profileName="Admin Operator"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Merchants", "248", "+12 this week"],
          ["Transactions", "$1.9M", "+8.4%"],
          ["Withdrawals", "$421K", "16 pending"],
          ["Disputes", "23", "5 active"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
            <p className="text-sm text-ctex-text-muted">{label}</p>
            <h3 className="mt-3 text-3xl font-semibold text-ctex-text">{value}</h3>
            <p className="mt-2 text-xs text-ctex-text-muted">{detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
        <h3 className="text-lg font-semibold text-ctex-text">Recent platform actions</h3>
        <div className="mt-4 space-y-3">
          {[
            "Merchant onboarding review pending for 4 businesses",
            "3 transactions flagged for manual verification",
            "New API key created by a merchant team",
            "Webhook failure on provider East resolved",
          ].map((entry) => (
            <div key={entry} className="rounded-xl border border-ctex-border bg-ctex-elevated px-3 py-3 text-sm text-ctex-text-muted">
              {entry}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
