import { useEffect, useMemo } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useMerchantMemberStore } from "../../store/merchantMember.store";
import DashboardLayout from "../../components/dashboard/DashboardLayout";

/*
|--------------------------------------------------------------------------
| NAV
|--------------------------------------------------------------------------
| Three states drive the workspace section:
|
|   ownsMerchant   → "Business Profile" (owned, editable)
|   isTeamMember   → "My Team" + "Business Info" (read-only reference)
|   neither        → "Create Business" (become a merchant)
|--------------------------------------------------------------------------
*/
const buildUserNav = ({ ownsMerchant, isTeamMember }) => {
  const workspaceItems = [];

  if (!ownsMerchant) {
    workspaceItems.push({
      key: "create-business",
      label: "Create Business",
      icon: "business",
      path: "/user/dashboard/create-business",
    });
  }

  // Owns a merchant → show editable business profile
  if (ownsMerchant) {
    workspaceItems.push({
      key: "business-profile",
      label: "Business Profile",
      icon: "business",
      path: "/user/dashboard/business",
    });
  }

  if (isTeamMember) {
    workspaceItems.push({
      key: "team-workspace",
      label: "Team Workspace",
      icon: "team",
      path: "/merchant/dashboard",
    });
  }

  return [
    {
      title: "Account",
      items: [
        {
          key: "overview",
          label: "Overview",
          icon: "dashboard",
          path: "/user/dashboard/overview",
        },
        {
          key: "profile",
          label: "My Profile",
          icon: "profile",
          path: "/user/dashboard/profile",
        },
        {
          key: "notifications",
          label: "Notifications",
          icon: "notifications",
          path: "/user/dashboard/notifications",
        },
      ],
    },
    ...(workspaceItems.length > 0
      ? [{ title: "Workspace", items: workspaceItems }]
      : []),
  ];
};

export default function UserDashboard() {
  const location = useLocation();
  const { user } = useAuthStore();

  const {
    // state
    businessProfile,
    roles,
    // actions
    getMyMerchant,
    getMyMembership,
    // derived helpers (see merchant.store.js)
    isMerchantOwner,
    isTeamMember,
  } = useMerchantStore();

  const { getMyNotifications, getUnreadNotificationCount } =
    useMerchantMemberStore();

  /*
  |--------------------------------------------------------------------------
  | Bootstrap: fetch owned merchant + membership + notifications
  |--------------------------------------------------------------------------
  | `getMyMerchant` returns 404 if user owns nothing — treated as a
  | legitimate state by the store (no error).
  | `getMyMembership` returns 404 if user has no membership.
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    getMyMerchant().catch(() => {});
    getMyMembership().catch(() => {});
    getMyNotifications().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Derived flags — pulled from store helpers, not ad-hoc checks
  |--------------------------------------------------------------------------
  */
  const ownsMerchant = isMerchantOwner();
  const hasMembership = isTeamMember();

  /*
  |--------------------------------------------------------------------------
  | Nav — rebuilt whenever permissions or ownership flags change
  |--------------------------------------------------------------------------
  */
  const navSections = useMemo(
    () =>
      buildUserNav({
        ownsMerchant,
        isTeamMember: hasMembership,
      }),
    [ownsMerchant, hasMembership]
  );

  const displayName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.email ||
    "User";

  const primaryRole = roles[0]?.name || "Member";

  /*
  |--------------------------------------------------------------------------
  | Subtitle: owned business > membership business > generic
  |--------------------------------------------------------------------------
  */
  const subtitle = ownsMerchant
    ? businessProfile?.businessName || "Your merchant account"
    : "Your account";

  /*
  |--------------------------------------------------------------------------
  | Auto-redirect: /user/dashboard → /user/dashboard/overview
  |--------------------------------------------------------------------------
  */
  if (location.pathname === "/user/dashboard") {
    return <Navigate to="/user/dashboard/overview" replace />;
  }

  return (
    <DashboardLayout
      title="User Dashboard"
      subtitle={subtitle}
      navSections={navSections}
      profileName={displayName}
      profileRole={primaryRole}
      notificationCount={getUnreadNotificationCount()}
    >
      <Outlet />
    </DashboardLayout>
  );
}