import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CreditCard,
  Globe2,
  History,
  KeyRound,
  Percent,
  Receipt,
  ShieldAlert,
  UserPlus,
  Users,
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
| BRAND TONES (taken from the landing page icon chips)
|--------------------------------------------------------------------------
*/
const TONES = {
  blue: {
    background: "linear-gradient(135deg,#2f95de,#0B68AD)",
    boxShadow: "0 10px 22px -10px #0B68AD",
  },
  green: {
    background: "linear-gradient(135deg,#22C55E,#15803D)",
    boxShadow: "0 10px 22px -10px #15803D",
  },
  orange: {
    background: "linear-gradient(135deg,#FBBF24,#EA580C)",
    boxShadow: "0 10px 22px -10px #EA580C",
  },
  oxblood: {
    background: "linear-gradient(135deg,#9F1239,#4C0519)",
    boxShadow: "0 10px 22px -10px #7F1D1D",
  },
};

const HERO_BG = "linear-gradient(160deg,#2f95de 0%,#0B68AD 100%)";

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
        tone: "blue",
        onClick: () => navigate("/merchant/dashboard/payment-links"),
      });
    }
    if (hasPermission(permissions, "transactions.read")) {
      actions.push({
        label: "View transactions",
        icon: Activity,
        tone: "green",
        onClick: () => navigate("/merchant/dashboard/transactions"),
      });
    }
    if (hasPermission(permissions, "team.manage")) {
      actions.push({
        label: "Add team member",
        icon: UserPlus,
        tone: "orange",
        onClick: () => navigate("/merchant/dashboard/team"),
      });
    }
    if (hasPermission(permissions, "api_keys.create")) {
      actions.push({
        label: "Manage API keys",
        icon: KeyRound,
        tone: "oxblood",
        onClick: () => navigate("/merchant/dashboard/api-keys"),
      });
    }
    if (hasPermission(permissions, "merchants.update")) {
      actions.push({
        label: "Edit business profile",
        icon: Building2,
        tone: "blue",
        onClick: () => navigate("/merchant/dashboard/business"),
      });
    }

    return actions;
  }, [permissions, navigate]);

  const profileName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "Merchant Admin";
  const profileRole = roles[0]?.name || "Member";
  const greetingName = user?.firstName || "there";

  /* Chart points: recent transactions, oldest → newest */
  const chartPoints = useMemo(
    () =>
      [...(recentTransactions || [])].reverse().map((t) => ({
        id: t.id,
        raw: t.amount,
        currency: t.currency,
        value: Number(t.amount || 0),
        label: t.createdAt
          ? new Date(t.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          : "—",
        date: formatDashboardDate(t.createdAt),
      })),
    [recentTransactions],
  );

  /*
  |--------------------------------------------------------------------------
  | Suspended merchant
  |--------------------------------------------------------------------------
  */
  if (merchantSuspended) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ctex-bg px-4 py-16 text-ctex-text">
        <section className="w-full max-w-xl rounded-[28px] border border-red-500/30 bg-ctex-surface p-8 text-center shadow-2xl">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white"
            style={TONES.oxblood}
          >
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
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
              href={SUPPORT_WHATSAPP_URL(
                "Hello C-TEX PAY Support, please help me with a suspended merchant workspace.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Contact support on WhatsApp
            </a>
            <button
              className="rounded-full border border-ctex-border bg-ctex-surface px-5 py-2.5 text-sm font-medium text-ctex-text transition hover:bg-ctex-panel"
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
            className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
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
  | Overview mode
  |--------------------------------------------------------------------------
  */
  const isLoading =
    merchantLoading || customersLoading || apiKeysLoading || membersLoading;

  const hasTransactions = hasPermission(permissions, "transactions.read");
  const summaryPending = transactionsLoading && !transactionSummary;
  const chartCurrency = recentTransactions?.[0]?.currency;

  /* Stat cells (same data as before) */
  const cells = [
    ...(hasTransactions
      ? [
          {
            label: "Transactions",
            icon: Receipt,
            tone: "blue",
            value: transactionSummary?.totalTransactions ?? 0,
            loading: summaryPending,
          },
          {
            label: "Success rate",
            icon: Percent,
            tone: "green",
            value: transactionSummary?.totalTransactions
              ? `${Math.round(
                  (transactionSummary.successfulTransactions /
                    transactionSummary.totalTransactions) *
                    100,
                )}%`
              : "—",
            loading: summaryPending,
          },
        ]
      : []),
    {
      label: "Customers",
      icon: Users,
      tone: "orange",
      value: stats.totalCustomers.toLocaleString(),
      detail: `${stats.activeCustomers} active`,
      loading: customersLoading,
      onClick: hasPermission(permissions, "customers.read")
        ? () => navigate("/merchant/dashboard/customers")
        : undefined,
    },
    {
      label: "API keys",
      icon: KeyRound,
      tone: "oxblood",
      value: stats.totalApiKeys.toLocaleString(),
      detail: `${stats.activeApiKeys} active`,
      loading: apiKeysLoading,
      onClick: hasPermission(permissions, "api_keys.read")
        ? () => navigate("/merchant/dashboard/api-keys")
        : undefined,
    },
    {
      label: "Team members",
      icon: UserPlus,
      tone: "blue",
      value: stats.totalMembers.toLocaleString(),
      detail: `${stats.roleCount} roles · ${stats.permissionCount} permissions`,
      loading: membersLoading,
      onClick: hasPermission(permissions, "team.read")
        ? () => navigate("/merchant/dashboard/team")
        : undefined,
    },
  ];

  const statGridCols =
    cells.length >= 5
      ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : cells.length === 4
      ? "sm:grid-cols-2 xl:grid-cols-4"
      : "sm:grid-cols-2 lg:grid-cols-3";

  const panelCard =
    "rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6";

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
          className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {merchantError}
        </motion.div>
      )}

      {/* ─── HERO : WELCOME + BUSINESS STATUS ─────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8"
        style={{ background: HERO_BG }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/70">
              Merchant workspace
            </p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
              Welcome back, {greetingName}
            </h2>
            <p className="mt-1.5 truncate text-sm text-white/75">
              {merchantLoading ? "Loading business…" : stats.merchantName}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <HeroPill icon={BadgeCheck}>
                <span className="lowercase first-letter:uppercase">
                  {stats.merchantStatus}
                </span>
              </HeroPill>
              <HeroPill
                icon={Activity}
                dot={
                  stats.onboardingStatus === "COMPLETED"
                    ? "bg-emerald-300"
                    : "bg-amber-300"
                }
              >
                <span className="capitalize">
                  Onboarding · {formatOnboarding(stats.onboardingStatus)}
                </span>
              </HeroPill>
              <HeroPill icon={Globe2}>{stats.country}</HeroPill>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPermission(permissions, "payment_links.create") && (
              <button
                type="button"
                onClick={() => navigate("/merchant/dashboard/payment-links")}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0B3E66] transition hover:-translate-y-px hover:bg-white/90"
              >
                <CreditCard className="h-4 w-4" />
                Create payment link
              </button>
            )}
            {hasPermission(permissions, "merchants.update") && (
              <button
                type="button"
                onClick={() => navigate("/merchant/dashboard/business")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
              >
                Edit business profile
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.section>

      {/* ─── STAT CARDS ───────────────────────────────────────── */}
      <div className={`mt-4 grid grid-cols-1 gap-4 ${statGridCols}`}>
        {cells.map((cell, i) => {
          const Icon = cell.icon;
          return (
            <motion.div
              key={cell.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04 * i }}
              onClick={cell.onClick}
              role={cell.onClick ? "button" : undefined}
              tabIndex={cell.onClick ? 0 : undefined}
              onKeyDown={
                cell.onClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        cell.onClick();
                      }
                    }
                  : undefined
              }
              className={[
                "group rounded-[24px] border border-ctex-border bg-ctex-surface p-5",
                cell.onClick
                  ? "cursor-pointer transition hover:-translate-y-0.5 hover:border-ctex-accent/40"
                  : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={TONES[cell.tone]}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </span>
                {cell.onClick && (
                  <ArrowUpRight className="h-4 w-4 text-ctex-text-muted transition group-hover:text-ctex-accent" />
                )}
              </div>

              <p className="mt-4 text-xs font-medium text-ctex-text-muted">
                {cell.label}
              </p>

              {cell.loading ? (
                <>
                  <div className="mt-2 h-7 w-24 animate-pulse rounded bg-ctex-border" />
                  {cell.detail !== undefined && (
                    <div className="mt-2 h-3 w-28 animate-pulse rounded bg-ctex-border" />
                  )}
                </>
              ) : (
                <>
                  <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-ctex-text">
                    {cell.value}
                  </p>
                  {cell.detail !== undefined && (
                    <p className="mt-1.5 text-xs text-ctex-text-muted">
                      {cell.detail}
                    </p>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ─── VOLUME CHART + QUICK ACTIONS ─────────────────────── */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {hasTransactions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={panelCard}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-ctex-accent">
                  Successful volume
                </p>
                <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-ctex-text sm:text-3xl">
                  {summaryPending ? (
                    <span className="inline-block h-8 w-40 animate-pulse rounded bg-ctex-panel" />
                  ) : (
                    formatMoneyMinor(transactionSummary?.successfulNetMinor)
                  )}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ctex-text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {transactionSummary?.successfulTransactions ?? 0} successful
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-ctex-text-muted/60" />
                    {transactionSummary?.totalTransactions ?? 0} total
                    transactions
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/merchant/dashboard/transactions")}
                className="inline-flex items-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-4 py-2 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel"
              >
                View history
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-ctex-panel/60 p-3 sm:p-4">
              {transactionsLoading && chartPoints.length === 0 ? (
                <div className="h-[220px] animate-pulse rounded-xl bg-ctex-panel" />
              ) : chartPoints.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-ctex-text-muted">
                  No transactions yet.
                </div>
              ) : (
                <TrendChart points={chartPoints} currency={chartCurrency} />
              )}
            </div>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className={[panelCard, hasTransactions ? "" : "xl:col-span-2"].join(" ")}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={TONES.orange}
            >
              <Zap className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <h3 className="text-sm font-semibold text-ctex-text">
              Quick actions
            </h3>
          </div>

          {quickActions.length === 0 ? (
            <p className="mt-4 text-sm text-ctex-text-muted">
              No actions available for your role.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <li key={action.label}>
                    <button
                      type="button"
                      onClick={action.onClick}
                      className="group flex w-full items-center gap-3 rounded-2xl bg-ctex-panel/60 px-3 py-2.5 text-left text-sm text-ctex-text transition hover:bg-ctex-panel"
                    >
                      <span
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white"
                        style={TONES[action.tone]}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {action.label}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-ctex-text-muted transition group-hover:text-ctex-accent" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </div>

      {/* ─── RECENT TRANSACTIONS ──────────────────────────────── */}
      {hasTransactions && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-4 rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={TONES.blue}
              >
                <History className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ctex-text">
                  Recent transactions
                </h3>
                <p className="mt-0.5 text-xs text-ctex-text-muted">
                  Latest payments in this workspace
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/merchant/dashboard/transactions")}
              className="rounded-full border border-ctex-border bg-ctex-surface px-4 py-2 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel"
            >
              View all →
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead className="text-xs text-ctex-text-muted">
                <tr>
                  <th className="bg-ctex-panel px-5 py-3 font-medium first:rounded-l-xl">
                    Reference
                  </th>
                  <th className="bg-ctex-panel px-5 py-3 font-medium">
                    Customer
                  </th>
                  <th className="bg-ctex-panel px-5 py-3 font-medium">Amount</th>
                  <th className="bg-ctex-panel px-5 py-3 font-medium">Status</th>
                  <th className="bg-ctex-panel px-5 py-3 font-medium last:rounded-r-xl">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
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
                    <tr key={t.id} className="group">
                      <td className="whitespace-nowrap border-b border-ctex-border px-5 py-3.5 group-hover:bg-ctex-panel/60">
                        <span className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: "rgba(11,104,173,.12)",
                              color: "#2f95de",
                            }}
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-mono text-xs font-medium text-ctex-text sm:text-[13px]">
                            {t.paymentReference}
                          </span>
                        </span>
                      </td>
                      <td className="border-b border-ctex-border px-5 py-3.5 text-sm text-ctex-text group-hover:bg-ctex-panel/60">
                        {t.customer?.name || "Guest"}
                      </td>
                      <td className="whitespace-nowrap border-b border-ctex-border px-5 py-3.5 text-sm font-semibold text-ctex-text group-hover:bg-ctex-panel/60">
                        {formatMoneyMinor(t.amount, t.currency)}
                      </td>
                      <td className="border-b border-ctex-border px-5 py-3.5 group-hover:bg-ctex-panel/60">
                        <StatusChip status={t.status} />
                      </td>
                      <td className="whitespace-nowrap border-b border-ctex-border px-5 py-3.5 text-xs text-ctex-text-muted group-hover:bg-ctex-panel/60">
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

      {/* ─── CUSTOMERS + API KEYS + TEAM ─────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <PanelCard
          title="Recent customers"
          subtitle="Latest 5"
          icon={Users}
          tone="orange"
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
          icon={KeyRound}
          tone="oxblood"
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
          icon={UserPlus}
          tone="blue"
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

const compactNumber = new Intl.NumberFormat("en-NG", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/* Pill used on the blue hero card */
function HeroPill({ icon: Icon, dot, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
      {dot ? (
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      ) : (
        <Icon className="h-3.5 w-3.5 text-white/80" />
      )}
      {children}
    </span>
  );
}

/* Line + area chart over the loaded recent transactions (oldest → newest) */
function TrendChart({ points, currency }) {
  const [hover, setHover] = useState(null);

  const W = 640;
  const H = 240;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const n = points.length;

  const rawMax = Math.max(...points.map((p) => p.value), 1);
  const step = Math.pow(10, Math.floor(Math.log10(rawMax))) / 2;
  const niceMax = Math.ceil(rawMax / step) * step;

  const x = (i) =>
    n === 1 ? (padL + W - padR) / 2 : padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - v / niceMax) * (H - padT - padB);

  const ticks = [0, 1, 2, 3, 4].map((t) => (niceMax / 4) * t);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`,
    )
    .join(" ");
  const areaPath =
    n > 1
      ? `${path} L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(
          1,
        )},${y(0).toFixed(1)} Z`
      : null;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(x(i) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const active = hover != null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Recent transaction amounts"
      >
        <defs>
          <linearGradient id="ctexVolumeFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              style={{ stopColor: "var(--ctex-accent)", stopOpacity: 0.28 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--ctex-accent)", stopOpacity: 0 }}
            />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--ctex-border)"
              strokeDasharray="3 4"
            />
            <text
              x={padL - 8}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="var(--ctex-text-muted)"
            >
              {compactNumber.format(t / 100)}
            </text>
          </g>
        ))}

        {points.map((p, i) => (
          <text
            key={p.id}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ctex-text-muted)"
          >
            {p.label}
          </text>
        ))}

        {areaPath && <path d={areaPath} fill="url(#ctexVolumeFill)" />}

        {active && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={padT}
            y2={H - padB}
            stroke="var(--ctex-border)"
          />
        )}

        <path
          d={path}
          fill="none"
          stroke="var(--ctex-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <circle
            key={`dot-${p.id}`}
            cx={x(i)}
            cy={y(p.value)}
            r="2.5"
            fill="var(--ctex-accent)"
          />
        ))}

        {active && (
          <circle
            cx={x(hover)}
            cy={y(active.value)}
            r="5"
            fill="var(--ctex-surface)"
            stroke="var(--ctex-accent)"
            strokeWidth="2.5"
          />
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-2xl border border-ctex-border bg-ctex-surface px-3 py-2 shadow-lg shadow-black/10"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: `${(y(active.value) / H) * 100}%`,
          }}
        >
          <p className="text-[11px] text-ctex-text-muted">{active.date}</p>
          <p className="text-sm font-semibold text-ctex-text">
            {formatMoneyMinor(active.raw, active.currency || currency)}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const tone = statusTone(status);
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium lowercase first-letter:uppercase",
        toneClasses(tone),
      ].join(" ")}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass(tone)}`} />
      {status}
    </span>
  );
}

function PanelCard({
  title,
  subtitle,
  action,
  loading,
  items,
  emptyLabel,
  icon: Icon,
  tone = "blue",
}) {
  const avatarTones = ["blue", "green", "orange", "oxblood"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-[28px] border border-ctex-border bg-ctex-surface"
    >
      <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white"
              style={TONES[tone]}
            >
              <Icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ctex-text">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-ctex-text-muted">{subtitle}</p>
            )}
          </div>
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="flex-shrink-0 rounded-full border border-ctex-border bg-ctex-surface px-3.5 py-1.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel"
          >
            {action.label}
          </button>
        )}
      </div>

      <div className="p-3 pt-1">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-2xl bg-ctex-panel"
              />
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ctex-border px-3 py-8 text-center text-xs text-ctex-text-muted">
            {emptyLabel}
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item, idx) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl px-2.5 py-2.5 transition hover:bg-ctex-panel/60"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
                    style={TONES[avatarTones[idx % avatarTones.length]]}
                  >
                    {String(item.primary || "?").trim().charAt(0) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ctex-text">
                      {item.primary}
                    </p>
                    <p className="truncate text-xs text-ctex-text-muted">
                      {item.secondary}
                    </p>
                  </div>
                </div>
                <span
                  className={[
                    "max-w-[110px] flex-shrink-0 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
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
          <div className="h-4 w-full animate-pulse rounded bg-ctex-panel" />
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

function dotClass(tone) {
  switch (tone) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "danger":
      return "bg-red-500";
    default:
      return "bg-ctex-text-muted";
  }
}