import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useMerchantMemberStore } from "../../store/merchantMember.store";
import { hasPermission } from "../../utils/permissions";

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    ownedMerchant,
    businessProfile,
    memberships,
    roles,
    permissions,
    getMyMerchant,
    getMyMembership,
  } = useMerchantStore();
  const { notifications, getUnreadNotificationCount } =
    useMerchantMemberStore();

  useEffect(() => {
    getMyMerchant().catch(() => {});
    getMyMembership().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownsMerchant = Boolean(ownedMerchant);
  const isTeamMember = memberships.length > 0;
  const unread = getUnreadNotificationCount();

  const workspaceName =
    (ownsMerchant ? businessProfile?.businessName : null) ||
    (isTeamMember ? "Team workspace access" : null);

  /*
  |--------------------------------------------------------------------------
  | Quick actions — permission-gated
  |--------------------------------------------------------------------------
  */
  const quickActions = useMemo(() => {
    const actions = [];

    if (!ownsMerchant) {
      actions.push({
        label: "Create your business",
        description: "Unlock merchant tools and accept payments.",
        onClick: () => navigate("/user/dashboard/create-business"),
        tone: "primary",
      });
    }

    // Has workspace → permission-gated merchant links
    if (hasPermission(permissions, "customers.read")) {
      actions.push({
        label: "Customers",
        description: "View and manage your customer list.",
        onClick: () => navigate("/merchant/dashboard/customers"),
      });
    }

    if (hasPermission(permissions, "team.read")) {
      actions.push({
        label: "Team members",
        description: "See who's on your team and manage their roles.",
        onClick: () => navigate("/merchant/dashboard/team"),
      });
    }

    if (hasPermission(permissions, "api_keys.read")) {
      actions.push({
        label: "API keys",
        description: "Create and manage API credentials.",
        onClick: () => navigate("/merchant/dashboard/api-keys"),
      });
    }

    // If a member (not owner), show "Business profile" as read-only link
    if (isTeamMember && !ownsMerchant) {
      actions.push({
        label: "Business profile",
        description: "View details of the business you belong to.",
        onClick: () => navigate("/merchant/dashboard/business"),
      });
    }

    // If owner, they can edit their own business
    if (ownsMerchant) {
      actions.push({
        label: "Edit business",
        description: "Update your business information.",
        onClick: () => navigate("/user/dashboard/business"),
      });
    }

    return actions;
  }, [
    ownsMerchant,
    isTeamMember,
    permissions,
    navigate,
  ]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-ctex-blue">
              Welcome back
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ctex-text sm:text-3xl">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="mt-1 text-sm text-ctex-text-muted">{user?.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-ctex-border bg-ctex-elevated px-3 py-1 text-xs text-ctex-text-muted">
              Role: {user?.role || "USER"}
            </span>
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-medium",
                user?.emailVerified
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border border-amber-500/30 bg-amber-500/10 text-amber-500",
              ].join(" ")}
            >
              {user?.emailVerified ? "Email verified" : "Email unverified"}
            </span>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Workspace"
          value={
            ownsMerchant
              ? "Owner"
              : isTeamMember
              ? "Team member"
              : "None yet"
          }
          detail={workspaceName || "No business linked"}
        />
        <StatCard
          label="Roles"
          value={roles.length || 0}
          detail={roles.map((r) => r.name).join(", ") || "No roles assigned"}
        />
        <StatCard
          label="Permissions"
          value={permissions.length || 0}
          detail="Granted to you"
        />
        <StatCard
          label="Notifications"
          value={unread}
          detail={unread > 0 ? "Unread" : "All caught up"}
        />
      </div>

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div>
          <h3 className="mb-3 text-base font-semibold text-ctex-text">
            Quick actions
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={action.onClick}
                className={[
                  "rounded-2xl border p-5 text-left transition-all",
                  action.tone === "primary"
                    ? "border-ctex-blue/40 bg-ctex-blue/5 hover:border-ctex-blue"
                    : "border-ctex-border bg-ctex-surface hover:border-ctex-blue/40",
                ].join(" ")}
              >
                <p className="font-semibold text-ctex-text">{action.label}</p>
                <p className="mt-1 text-xs text-ctex-text-muted">
                  {action.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-ctex-blue">
                  Open <span>→</span>
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Recent notifications */}
      {notifications.length > 0 && (
        <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-ctex-text">
              Recent notifications
            </h3>
            <Link
              to="/user/dashboard/notifications"
              className="text-xs font-medium text-ctex-blue hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-xl border border-ctex-border bg-ctex-elevated/50 p-3"
              >
                <span
                  className={[
                    "mt-1 h-2 w-2 flex-shrink-0 rounded-full",
                    n.read ? "bg-ctex-border" : "bg-ctex-blue",
                  ].join(" ")}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm text-ctex-text">
                    {n.title || n.message || "Notification"}
                  </p>
                  <p className="truncate text-xs text-ctex-text-muted">
                    {n.body || n.description || ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
      <p className="text-xs uppercase tracking-wide text-ctex-text-muted">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-ctex-text">{value}</p>
      <p className="mt-1 text-xs text-ctex-text-muted">{detail}</p>
    </div>
  );
}