import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CreditCard,
  KeyRound,
  Plus,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { SUPPORT_WHATSAPP_URL } from "../../constants/support";
import { useCustomerStore } from "../../store/customer.store";
import { useApiKeyStore } from "../../store/apiKey.store";
import { useMerchantMemberStore } from "../../store/merchantMember.store";
import { useTransactionStore } from "../../store/transaction.store";
import { hasPermission } from "../../utils/permissions";
import { buildMerchantNav } from "./merchantNav";

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
| Two modes:
|   1. Overview — no `children`. Renders the overview dashboard.
|   2. Layout shell — `children` present. Renders the shared chrome only.
|--------------------------------------------------------------------------
*/
const MerchantDashboard = ({ children, subtitle, title }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const {
    merchant,
    businessProfile,
    permissions,
    roles,
    isLoading: merchantLoading,
    error: merchantError,
    memberships,
    selectedMerchantId,
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

  const isOverview = !children;

  const selectedMembership = memberships.find(
    (item) => item.merchantId === selectedMerchantId,
  );
  const merchantSuspended = selectedMembership?.merchantStatus === "SUSPENDED";

  /*
  |--------------------------------------------------------------------------
  | Data bootstrap (overview only)
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (!isOverview) return;
    if (!permissions || permissions.length === 0) return;

    if (hasPermission(permissions, "customers.read")) {
      getCustomers({ page: 1, limit: 5 });
    }
    if (hasPermission(permissions, "api_keys.read")) getApiKeys();
    if (hasPermission(permissions, "team.read")) getMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOverview, permissions]);

  useEffect(() => {
    if (!isOverview) return;
    if (!hasPermission(permissions, "transactions.read")) return;

    getSummary();
    getTransactions({
      page: 1,
      limit: 5,
      sortBy: "createdAt",
      direction: "DESC",
    });
  }, [isOverview, permissions, getSummary, getTransactions]);

  const navSections = useMemo(() => buildMerchantNav(permissions), [permissions]);

  /*
  |--------------------------------------------------------------------------
  | Derived stats
  |--------------------------------------------------------------------------
  */
  const stats = useMemo(() => {
    const activeCustomers = customers.filter(
      (c) => c.status === "ACTIVE",
    ).length;

    const activeApiKeys = apiKeys.filter((k) => k.status === "ACTIVE").length;
    const totalMembers = members.filter((m) => m.status === "ACTIVE").length;

    return {
      merchantName: businessProfile?.businessName || "Your Business",
      merchantStatus: merchant?.status || "—",
      onboardingStatus: merchant?.onboardingStatus || "NOT_STARTED",
      country: businessProfile?.country || "—",
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
  | Quick actions
  |--------------------------------------------------------------------------
  */
  const quickActions = useMemo(() => {
    const actions = [];

    if (hasPermission(permissions, "payment_links.create")) {
      actions.push({
        label: "Create payment link",
        icon: CreditCard,
        onClick: () => navigate("/merchant/dashboard/payment-links"),
      });
    }
    if (hasPermission(permissions, "transactions.read")) {
      actions.push({
        label: "View transactions",
        icon: Activity,
        onClick: () => navigate("/merchant/dashboard/transactions"),
      });
    }
    if (hasPermission(permissions, "team.manage")) {
      actions.push({
        label: "Add team member",
        icon: UserPlus,
        onClick: () => navigate("/merchant/dashboard/team"),
      });
    }
    if (hasPermission(permissions, "api_keys.create")) {
      actions.push({
        label: "Manage API keys",
        icon: KeyRound,
        onClick: () => navigate("/merchant/dashboard/api-keys"),
      });
    }
    if (hasPermission(permissions, "merchants.update")) {
      actions.push({
        label: "Edit business profile",
        icon: Building2,
        onClick: () => navigate("/merchant/dashboard/business"),
      });
    }

    return actions;
  }, [permissions, navigate]);

  const profileName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "Merchant Admin";
  const profileRole = roles[0]?.name || "Member";

  /*
  |--------------------------------------------------------------------------
  | Suspended merchant
  |--------------------------------------------------------------------------
  */
  if (merchantSuspended) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ctex-bg px-4 py-16 text-ctex-text">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/30 bg-ctex-surface p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">
            Merchant workspace suspended
          </h1>
          <p className="mt-3 text-sm text-ctex-text-muted">
            This merchant account is suspended. Merchant operations are
            unavailable while the account is restricted.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
              href={SUPPORT_WHATSAPP_URL(
                "Hello C-TEX PAY Support, please help me with a suspended merchant workspace.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Contact support on WhatsApp
            </a>
            <button
              className="rounded-xl border border-ctex-border bg-ctex-surface px-4 py-2.5 text-sm font-medium text-ctex-text transition hover:bg-ctex-elevated"
              onClick={() => navigate("/user/dashboard/overview")}
            >
              Return to user dashboard
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Layout shell mode
  |--------------------------------------------------------------------------
  */
  if (!isOverview) {
    return (
      <DashboardLayout
        title={title || stats.merchantName}
        subtitle={subtitle || "Workspace"}
        navSections={navSections}
        profileName={profileName}
        profileRole={profileRole}
      >
        {merchantError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
          >
            {merchantError}
          </motion.div>
        )}
        {children}
      </DashboardLayout>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Overview mode — new design
  |--------------------------------------------------------------------------
  */
  const isLoading =
    merchantLoading || customersLoading || apiKeysLoading || membersLoading;

  const hasTransactions = hasPermission(permissions, "transactions.read");

  return (
    <DashboardLayout
      title={stats.merchantName}
      subtitle="Overview dashboard"
      navSections={navSections}
      profileName={profileName}
      profileRole={profileRole}
    >
      {merchantError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {merchantError}
        </motion.div>
      )}

      {/* ─── HERO ROW ─────────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Volume / revenue hero */}
        {hasTransactions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-ctex-border bg-gradient-to-br from-ctex-blue/10 via-ctex-surface to-ctex-surface p-5 shadow-lg shadow-black/10 sm:p-6 xl:col-span-2"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-ctex-blue/20 blur-3xl"
            />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ctex-blue/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ctex-blue">
                    <TrendingUp className="h-3 w-3" />
                    Successful volume
                  </span>
                </div>
                <p className="mt-4 truncate text-3xl font-bold text-ctex-text sm:text-4xl">
                  {transactionsLoading && !transactionSummary ? (
                    <span className="inline-block h-9 w-40 animate-pulse rounded bg-ctex-elevated" />
                  ) : (
                    formatMoneyMinor(transactionSummary?.successfulNetMinor)
                  )}
                </p>
                <p className="mt-2 text-sm text-ctex-text-muted">
                  {transactionSummary?.successfulTransactions ?? 0} successful ·{" "}
                  {transactionSummary?.totalTransactions ?? 0} total transactions
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/merchant/dashboard/transactions")}
                className="inline-flex items-center gap-1.5 self-start rounded-xl bg-ctex-blue px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light"
              >
                View history
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Mini metric row */}
            <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MiniMetric
                label="Transactions"
                value={transactionSummary?.totalTransactions ?? 0}
                loading={transactionsLoading && !transactionSummary}
              />
              <MiniMetric
                label="Success rate"
                value={
                  transactionSummary?.totalTransactions
                    ? `${Math.round(
                        (transactionSummary.successfulTransactions /
                          transactionSummary.totalTransactions) *
                          100,
                      )}%`
                    : "—"
                }
                loading={transactionsLoading && !transactionSummary}
              />
              <MiniMetric
                label="Customers"
                value={stats.totalCustomers}
                loading={customersLoading}
              />
            </div>
          </motion.div>
        )}

        {/* Business status card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-ctex-text-muted">
              Business status
            </p>
            <StatusChip status={stats.merchantStatus} />
          </div>

          <div className="mt-4 space-y-3">
            <InfoRow
              label="Business"
              value={stats.merchantName}
              loading={merchantLoading}
            />
            <InfoRow
              label="Onboarding"
              value={formatOnboarding(stats.onboardingStatus)}
              loading={merchantLoading}
              tone={
                stats.onboardingStatus === "COMPLETED" ? "success" : "warning"
              }
            />
            <InfoRow
              label="Country"
              value={stats.country}
              loading={merchantLoading}
            />
          </div>

          {hasPermission(permissions, "merchants.update") && (
            <button
              type="button"
              onClick={() => navigate("/merchant/dashboard/business")}
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 py-2 text-xs font-medium text-ctex-text transition hover:border-ctex-blue/40 hover:text-ctex-blue"
            >
              Edit business profile
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>
      </div>

      {/* ─── STAT CARDS ROW ───────────────────────────────────── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={Users}
          label="Customers"
          value={stats.totalCustomers.toLocaleString()}
          detail={`${stats.activeCustomers} active`}
          loading={customersLoading}
          onClick={
            hasPermission(permissions, "customers.read")
              ? () => navigate("/merchant/dashboard/customers")
              : undefined
          }
          tone="blue"
        />
        <StatCard
          icon={KeyRound}
          label="API keys"
          value={stats.totalApiKeys.toLocaleString()}
          detail={`${stats.activeApiKeys} active`}
          loading={apiKeysLoading}
          onClick={
            hasPermission(permissions, "api_keys.read")
              ? () => navigate("/merchant/dashboard/api-keys")
              : undefined
          }
          tone="amber"
        />
        <StatCard
          icon={Users}
          label="Team members"
          value={stats.totalMembers.toLocaleString()}
          detail={`${stats.roleCount} roles · ${stats.permissionCount} permissions`}
          loading={membersLoading}
          onClick={
            hasPermission(permissions, "team.read")
              ? () => navigate("/merchant/dashboard/team")
              : undefined
          }
          tone="emerald"
        />
      </div>

      {/* ─── TRANSACTIONS + QUICK ACTIONS ─────────────────────── */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {hasTransactions && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="overflow-hidden rounded-2xl border border-ctex-border bg-ctex-surface shadow-lg shadow-black/10"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ctex-border px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-ctex-text">
                  Recent transactions
                </h3>
                <p className="mt-0.5 text-xs text-ctex-text-muted">
                  Latest payments in this workspace
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/merchant/dashboard/transactions")}
                className="text-xs font-medium text-ctex-blue hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-ctex-elevated/40">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-ctex-text-muted">
                    <th className="px-5 py-2.5 font-semibold">Reference</th>
                    <th className="px-5 py-2.5 font-semibold">Customer</th>
                    <th className="px-5 py-2.5 font-semibold">Amount</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ctex-border">
                  {transactionsLoading && recentTransactions.length === 0 ? (
                    <SkeletonRow cols={5} />
                  ) : recentTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-sm text-ctex-text-muted"
                      >
                        No transactions yet.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((t) => (
                      <tr
                        key={t.id}
                        className="transition hover:bg-ctex-elevated/30"
                      >
                        <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-ctex-text">
                          {t.paymentReference}
                        </td>
                        <td className="px-5 py-3 text-sm text-ctex-text">
                          {t.customer?.name || "Guest"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-ctex-text">
                          {formatMoneyMinor(t.amount, t.currency)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusChip status={t.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-ctex-text-muted">
                          {formatDashboardDate(t.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-ctex-blue" />
            <h3 className="text-base font-semibold text-ctex-text">
              Quick actions
            </h3>
          </div>

          {quickActions.length === 0 ? (
            <p className="mt-4 text-sm text-ctex-text-muted">
              No actions available for your role.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className="group flex w-full items-center gap-3 rounded-xl border border-ctex-border bg-ctex-elevated/50 px-3 py-2.5 text-left text-sm text-ctex-text transition hover:border-ctex-blue/40 hover:bg-ctex-elevated"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ctex-blue/10 text-ctex-blue transition group-hover:bg-ctex-blue group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {action.label}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-ctex-text-muted transition group-hover:text-ctex-blue" />
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ─── CUSTOMERS + API KEYS + TEAM ─────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <PanelCard
          title="Recent customers"
          subtitle="Latest 5"
          action={
            hasPermission(permissions, "customers.read")
              ? {
                  label: "View all",
                  onClick: () => navigate("/merchant/dashboard/customers"),
                }
              : null
          }
          loading={customersLoading}
          items={customers.slice(0, 5).map((c) => ({
            id: c.id,
            primary: `${c.firstName} ${c.lastName}`,
            secondary: c.email,
            trailing: c.status,
            trailingTone: statusTone(c.status),
          }))}
          emptyLabel="No customers yet."
        />

        <PanelCard
          title="API keys"
          subtitle="Environment & status"
          action={
            hasPermission(permissions, "api_keys.read")
              ? {
                  label: "Manage",
                  onClick: () => navigate("/merchant/dashboard/api-keys"),
                }
              : null
          }
          loading={apiKeysLoading}
          items={apiKeys.slice(0, 5).map((k) => ({
            id: k.id,
            primary: k.name,
            secondary: `${k.environment} · ${k.prefix || "••••"}`,
            trailing: k.status,
            trailingTone: statusTone(k.status),
          }))}
          emptyLabel="No API keys yet."
        />

        <PanelCard
          title="Team"
          subtitle="Roles & members"
          action={
            hasPermission(permissions, "team.read")
              ? {
                  label: "Manage",
                  onClick: () => navigate("/merchant/dashboard/team"),
                }
              : null
          }
          loading={membersLoading}
          items={members.slice(0, 5).map((m) => ({
            id: m.id,
            primary: m.user
              ? `${m.user.firstName} ${m.user.lastName}`
              : "Unknown",
            secondary: m.user?.email || "—",
            trailing: m.roles?.map((r) => r.name).join(", ") || "No role",
            trailingTone: "neutral",
          }))}
          emptyLabel="No team members yet."
        />
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

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  loading,
  onClick,
  tone = "blue",
}) {
  const toneClasses = {
    blue: "bg-blue-500/10 text-blue-500",
    amber: "bg-amber-500/10 text-amber-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
  }[tone] || "bg-ctex-blue/10 text-ctex-blue";

  return (
    <motion.div
      whileHover={onClick ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      className={[
        "group rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10",
        onClick ? "cursor-pointer hover:border-ctex-blue/40" : "",
      ].join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <span
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl",
            toneClasses,
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </span>
        {onClick && (
          <ArrowUpRight className="h-4 w-4 text-ctex-text-muted transition group-hover:text-ctex-blue" />
        )}
      </div>

      {loading ? (
        <>
          <div className="mt-4 h-7 w-20 animate-pulse rounded bg-ctex-elevated" />
          <div className="mt-2 h-3 w-28 animate-pulse rounded bg-ctex-elevated" />
        </>
      ) : (
        <>
          <p className="mt-4 text-xs uppercase tracking-wide text-ctex-text-muted">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold leading-tight text-ctex-text">
            {value}
          </p>
          <p className="mt-1 text-xs text-ctex-text-muted">{detail}</p>
        </>
      )}
    </motion.div>
  );
}

function MiniMetric({ label, value, loading }) {
  return (
    <div className="rounded-xl border border-ctex-border/60 bg-ctex-bg/40 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-wider text-ctex-text-muted">
        {label}
      </p>
      {loading ? (
        <div className="mt-1.5 h-4 w-12 animate-pulse rounded bg-ctex-elevated" />
      ) : (
        <p className="mt-0.5 text-base font-semibold text-ctex-text">{value}</p>
      )}
    </div>
  );
}

function InfoRow({ label, value, loading, tone }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-500"
      : tone === "warning"
      ? "text-amber-500"
      : "text-ctex-text";

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ctex-text-muted">{label}</span>
      {loading ? (
        <span className="h-3.5 w-20 animate-pulse rounded bg-ctex-elevated" />
      ) : (
        <span className={`truncate font-medium ${toneClass}`}>{value}</span>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const tone = statusTone(status);
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        toneClasses(tone),
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function PanelCard({ title, subtitle, action, loading, items, emptyLabel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-ctex-border bg-ctex-surface shadow-lg shadow-black/10"
    >
      <div className="flex items-start justify-between gap-3 border-b border-ctex-border px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ctex-text">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-ctex-text-muted">{subtitle}</p>
          )}
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="flex-shrink-0 text-xs font-medium text-ctex-blue hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>

      <div className="p-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-ctex-elevated"
              />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ctex-border px-3 py-8 text-center text-xs text-ctex-text-muted">
            {emptyLabel}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition hover:bg-ctex-elevated/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ctex-text">
                    {item.primary}
                  </p>
                  <p className="truncate text-xs text-ctex-text-muted">
                    {item.secondary}
                  </p>
                </div>
                <span
                  className={[
                    "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    toneClasses(item.trailingTone),
                  ].join(" ")}
                >
                  {item.trailing}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 w-full animate-pulse rounded bg-ctex-elevated" />
        </td>
      ))}
    </tr>
  );
}

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function formatOnboarding(status) {
  if (!status) return "—";
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
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status) {
  switch (status) {
    case "ACTIVE":
    case "COMPLETED":
    case "SUCCESS":
    case "SUCCESSFUL":
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
    case "FAILED":
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