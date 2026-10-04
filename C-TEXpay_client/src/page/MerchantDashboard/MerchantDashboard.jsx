import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useCustomerStore } from "../../store/customer.store";
import { useApiKeyStore } from "../../store/apiKey.store";
import { useMerchantMemberStore } from "../../store/merchantMember.store";
import { useTransactionStore } from "../../store/transaction.store";
import { hasPermission } from "../../utils/permissions";

/*
|--------------------------------------------------------------------------
| NAV CONFIG
            permission: "settings.read",
|--------------------------------------------------------------------------
| Each item can declare a `permission` key. If the user doesn't have it,
| the item is hidden automatically.
*/
const buildNav = () => [
  {
    title: "Overview",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: "dashboard",
        path: "/merchant/dashboard",
      },
      {
        key: "payments",
        label: "Payments",
        icon: "payments",
        children: [
          {
            key: "transactions",
            label: "Transactions",
            path: "/merchant/dashboard/transactions",
            permission: "transactions.read",
          },
          {
            key: "payment-links",
            label: "Payment Links",
            path: "/merchant/dashboard/payment-links",
            permission: "payment_links.read",
          },
          {
            key: "customers",
            label: "Customers",
            path: "/merchant/dashboard/customers",
            permission: "customers.read",
          },
        ],
      },
      {
        key: "wallet",
        label: "Wallet",
        icon: "wallet",
        children: [
          {
            key: "wallet-balance",
            label: "Balance",
            path: "/merchant/dashboard/wallet",
            permission: "wallet.read",
          },
          {
            key: "wallet-transactions",
            label: "Transactions",
            path: "/merchant/dashboard/wallet/transactions",
            permission: "wallet.read",
          },
          {
            key: "withdraw",
            label: "Withdraw",
            path: "/merchant/dashboard/wallet/withdraw",
            permission: "wallet.withdraw",
          },
        ],
      },
      {
        key: "business",
        label: "Business",
        icon: "business",
        children: [
          {
            key: "business-profile",
            label: "Business Profile",
            path: "/merchant/dashboard/business",
            permission: "merchants.read",
          },
          {
            key: "team-members",
            label: "Team Members",
            path: "/merchant/dashboard/team",
            permission: "team.read",
          },
          {
            key: "roles-permissions",
            label: "Roles & Permissions",
            path: "/merchant/dashboard/roles",
            permission: "roles.read",
          },
          {
            key: "settings",
            label: "Settings",
            path: "/merchant/dashboard/settings",
            permission: "settings.read",
          },
        ],
      },
      {
        key: "developers",
        label: "Developers",
        icon: "developers",
        children: [
          {
            key: "api-docs",
            label: "API Documentation",
            path: "/merchant/dashboard/api-docs",
          },
          {
            key: "api-keys",
            label: "API Keys",
            path: "/merchant/dashboard/api-keys",
            permission: "api_keys.read",
          },
          {
            key: "webhooks",
            label: "Webhooks",
            path: "/merchant/dashboard/webhooks",
            permission: "webhooks.read",
          },
        ],
      },
      {
        key: "notifications",
        label: "Notifications",
        icon: "notifications",
        path: "/merchant/dashboard/notifications",
      },
      {
        key: "support",
        label: "Support",
        icon: "support",
        path: "/merchant/dashboard/support",
      },
    ],
  },
];

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/
const MerchantDashboard = () => {
  const navigate = useNavigate();

  const { user } = useAuthStore();

  const {
    merchant,
    businessProfile,
    permissions,
    roles,
    isLoading: merchantLoading,
    error: merchantError,
    getMyMerchant,
    getMyMembership,
  } = useMerchantStore();

  const {
    customers,
    pagination: customerPagination,
    isLoading: customersLoading,
    getCustomers,
  } = useCustomerStore();

  const { apiKeys, isLoading: apiKeysLoading, getApiKeys } = useApiKeyStore();

  const { members, isLoading: membersLoading, getMembers } =
    useMerchantMemberStore();
  const {
    transactions: recentTransactions,
    summary: transactionSummary,
    isLoading: transactionsLoading,
    getTransactions,
    getSummary,
  } = useTransactionStore();

  /*
  |--------------------------------------------------------------------------
  | Bootstrap: fetch everything in parallel
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    getMyMerchant();
    getMyMembership();

    if (hasPermission(permissions, "customers.read")) {
      getCustomers({ page: 1, limit: 5 });
    }

    if (hasPermission(permissions, "api_keys.read")) {
      getApiKeys();
    }

    if (hasPermission(permissions, "team.read")) {
      getMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasPermission(permissions, "transactions.read")) return;
    getSummary();
    getTransactions({ page: 1, limit: 5, sortBy: "createdAt", direction: "DESC" });
  }, [permissions, getSummary, getTransactions]);

  /*
  |--------------------------------------------------------------------------
  | Filter nav by permissions
  |--------------------------------------------------------------------------
  */
  const navSections = useMemo(() => {
    const sections = buildNav();

    const filterItem = (item) => {
      if (item.permission && !hasPermission(permissions, item.permission)) {
        return null;
      }
      if (item.children) {
        const filteredChildren = item.children.filter((child) => {
          if (
            child.permission &&
            !hasPermission(permissions, child.permission)
          ) {
            return false;
          }
          return true;
        });

        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      return item;
    };

    return sections.map((section) => ({
      ...section,
      items: section.items.map(filterItem).filter(Boolean),
    }));
  }, [permissions]);

  /*
  |--------------------------------------------------------------------------
  | Derived stats
  |--------------------------------------------------------------------------
  */
  const stats = useMemo(() => {
    const activeCustomers = customers.filter(
      (c) => c.status === "ACTIVE"
    ).length;

    const activeApiKeys = apiKeys.filter(
      (k) => k.status === "ACTIVE"
    ).length;

    const totalMembers = members.filter(
      (m) => m.status === "ACTIVE"
    ).length;

    return {
      merchantName: businessProfile?.businessName || "Your Business",
      merchantStatus: merchant?.status || "—",
      onboardingStatus: merchant?.onboardingStatus || "NOT_STARTED",
      currency: businessProfile?.country || "—",
      activeCustomers,
      totalCustomers: customerPagination?.total ?? customers.length,
      activeApiKeys,
      totalApiKeys: apiKeys.length,
      totalMembers,
      roleCount: roles.length,
      permissionCount: permissions.length,
    };
  }, [
    customers,
    customerPagination,
    apiKeys,
    members,
    roles,
    permissions,
    merchant,
    businessProfile,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Quick actions (permission-aware)
  |--------------------------------------------------------------------------
  */
  const quickActions = useMemo(() => {
    const actions = [];

    if (hasPermission(permissions, "payment_links.create")) {
      actions.push({
        label: "Create payment link",
        onClick: () => navigate("/merchant/dashboard/payment-links/new"),
      });
    }

    if (hasPermission(permissions, "transactions.read")) {
      actions.push({
        label: "View transactions",
        onClick: () => navigate("/merchant/dashboard/transactions"),
      });
    }

    if (hasPermission(permissions, "team.manage")) {
      actions.push({
        label: "Add team member",
        onClick: () => navigate("/merchant/dashboard/team"),
      });
    }

    if (hasPermission(permissions, "api_keys.create")) {
      actions.push({
        label: "Manage API keys",
        onClick: () => navigate("/merchant/dashboard/api-keys"),
      });
    }

    if (hasPermission(permissions, "merchants.update")) {
      actions.push({
        label: "Edit business profile",
        onClick: () => navigate("/merchant/dashboard/business"),
      });
    }

    return actions;
  }, [permissions, navigate]);

  const isLoading =
    merchantLoading || customersLoading || apiKeysLoading || membersLoading;

  return (
    <DashboardLayout
      title={stats.merchantName}
      subtitle="Overview dashboard"
      navSections={navSections}
      profileName={
        user ? `${user.firstName} ${user.lastName}`.trim() : "Merchant Admin"
      }
      profileRole={roles[0]?.name || "Member"}
    >
      {/* Error banner */}
      {merchantError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {merchantError}
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Business Status"
          value={formatStatus(stats.merchantStatus)}
          detail={`Onboarding: ${formatOnboarding(stats.onboardingStatus)}`}
          loading={merchantLoading}
        />
        <StatCard
          title="Customers"
          value={stats.totalCustomers.toLocaleString()}
          detail={`${stats.activeCustomers} active`}
          loading={customersLoading}
        />
        <StatCard
          title="API Keys"
          value={stats.totalApiKeys.toLocaleString()}
          detail={`${stats.activeApiKeys} active`}
          loading={apiKeysLoading}
        />
        <StatCard
          title="Team"
          value={stats.totalMembers.toLocaleString()}
          detail={`${stats.roleCount} roles · ${stats.permissionCount} permissions`}
          loading={membersLoading}
        />
        {hasPermission(permissions, "transactions.read") && (
          <StatCard
            title="Successful volume"
            value={formatMoneyMinor(transactionSummary?.successfulVolumeMinor)}
            detail={`${transactionSummary?.successfulTransactions ?? 0} successful · ${transactionSummary?.totalTransactions ?? 0} total`}
            loading={transactionsLoading && !transactionSummary}
          />
        )}
      </div>

      {hasPermission(permissions, "transactions.read") && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-lg shadow-black/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ctex-border px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-ctex-text">Recent transactions</h3>
              <p className="mt-1 text-xs text-ctex-text-muted">Latest payments in this merchant workspace</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/merchant/dashboard/transactions")}
              className="text-sm font-medium text-ctex-blue hover:underline"
            >
              View history
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ctex-border">
              <thead className="bg-ctex-elevated/50 text-left text-xs text-ctex-text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Payment reference</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ctex-border">
                {transactionsLoading && recentTransactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-ctex-text-muted">Loading recent transactions…</td></tr>
                ) : recentTransactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-ctex-text-muted">No transactions yet.</td></tr>
                ) : recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-ctex-elevated/30">
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-ctex-text">{transaction.paymentReference}</td>
                    <td className="px-5 py-3 text-sm text-ctex-text">{transaction.customer?.name || "Guest"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-ctex-text">{formatMoneyMinor(transaction.amount, transaction.currency)}</td>
                    <td className="px-5 py-3 text-xs text-ctex-text-muted">{transaction.status}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-ctex-text-muted">{formatDashboardDate(transaction.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Recent customers */}
        <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ctex-text">
              Recent customers
            </h3>
            {hasPermission(permissions, "customers.read") && (
              <button
                type="button"
                onClick={() => navigate("/merchant/dashboard/customers")}
                className="text-sm text-ctex-blue hover:underline"
              >
                View all
              </button>
            )}
          </div>

          <RecentList
            loading={customersLoading}
            emptyLabel="No customers yet."
            items={customers.slice(0, 5).map((c) => ({
              id: c.id,
              primary: `${c.firstName} ${c.lastName}`,
              secondary: c.email,
              trailing: c.status,
              trailingTone: statusTone(c.status),
            }))}
          />
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
          <h3 className="text-lg font-semibold text-ctex-text">
            Quick actions
          </h3>

          {quickActions.length === 0 ? (
            <p className="mt-4 text-sm text-ctex-text-muted">
              No actions available for your role.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="flex w-full items-center justify-between rounded-xl border border-ctex-border bg-ctex-elevated px-3 py-2.5 text-sm text-ctex-text transition hover:border-ctex-blue hover:text-ctex-blue"
                >
                  {action.label}
                  <span>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secondary row */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* API keys summary */}
        <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ctex-text">
              API keys
            </h3>
            {hasPermission(permissions, "api_keys.read") && (
              <button
                type="button"
                onClick={() => navigate("/merchant/dashboard/api-keys")}
                className="text-sm text-ctex-blue hover:underline"
              >
                Manage
              </button>
            )}
          </div>

          <RecentList
            loading={apiKeysLoading}
            emptyLabel="No API keys yet."
            items={apiKeys.slice(0, 5).map((k) => ({
              id: k.id,
              primary: k.name,
              secondary: `${k.environment} · ${k.prefix || "••••"}`,
              trailing: k.status,
              trailingTone: statusTone(k.status),
            }))}
          />
        </div>

        {/* Team summary */}
        <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ctex-text">Team</h3>
            {hasPermission(permissions, "team.read") && (
              <button
                type="button"
                onClick={() => navigate("/merchant/dashboard/team")}
                className="text-sm text-ctex-blue hover:underline"
              >
                Manage
              </button>
            )}
          </div>

          <RecentList
            loading={membersLoading}
            emptyLabel="No team members yet."
            items={members.slice(0, 5).map((m) => ({
              id: m.id,
              primary: m.user
                ? `${m.user.firstName} ${m.user.lastName}`
                : "Unknown",
              secondary: m.user?.email || "—",
              trailing: m.roles?.map((r) => r.name).join(", ") || "No role",
              trailingTone: "neutral",
            }))}
          />
        </div>
      </div>

      {isLoading && (
        <p className="mt-6 text-center text-xs text-ctex-text-muted">
          Syncing latest data…
        </p>
      )}
    </DashboardLayout>
  );
};

export default MerchantDashboard;

/*
|--------------------------------------------------------------------------
| SUB-COMPONENTS
|--------------------------------------------------------------------------
*/

function StatCard({ title, value, detail, loading }) {
  return (
    <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
      <p className="text-sm text-ctex-text-muted">{title}</p>

      {loading ? (
        <>
          <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-ctex-elevated" />
          <div className="mt-2 h-3 w-32 animate-pulse rounded bg-ctex-elevated" />
        </>
      ) : (
        <>
          <h3 className="mt-3 text-3xl font-semibold text-ctex-text">
            {value}
          </h3>
          <p className="mt-2 text-xs text-ctex-text-muted">{detail}</p>
        </>
      )}
    </div>
  );
}

function RecentList({ items, loading, emptyLabel }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-ctex-elevated"
          />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ctex-border px-4 py-6 text-center text-sm text-ctex-text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-xl border border-ctex-border bg-ctex-elevated px-3 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ctex-text">
              {item.primary}
            </p>
            <p className="truncate text-xs text-ctex-text-muted">
              {item.secondary}
            </p>
          </div>
          <span
            className={[
              "ml-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              toneClasses(item.trailingTone),
            ].join(" ")}
          >
            {item.trailing}
          </span>
        </div>
      ))}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function formatStatus(status) {
  if (!status) return "—";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatOnboarding(status) {
  return status.replace(/_/g, " ").toLowerCase();
}

function formatMoneyMinor(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);
}

function formatDashboardDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function statusTone(status) {
  switch (status) {
    case "ACTIVE":
    case "COMPLETED":
      return "success";
    case "PENDING":
    case "IN_PROGRESS":
    case "NOT_STARTED":
      return "warning";
    case "SUSPENDED":
    case "REVOKED":
    case "EXPIRED":
    case "REMOVED":
    case "BLOCKED":
    case "INACTIVE":
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