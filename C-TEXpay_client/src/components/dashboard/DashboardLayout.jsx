import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { io } from "socket.io-client";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  KeyRound,
  Landmark,
  LayoutGrid,
  Link2,
  Loader2,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCircle2,
  Users,
  Wallet,
  Webhook,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useTransactionStore } from "../../store/transaction.store";
import { useMerchantMemberStore } from "../../store/merchantMember.store";

/*
|--------------------------------------------------------------------------
| ICONS
|--------------------------------------------------------------------------
*/
const ICONS = {
  dashboard: LayoutGrid,
  payments: CreditCard,
  transactions: Activity,
  customers: Users,
  links: Link2,
  apiKeys: KeyRound,
  webhooks: Webhook,
  wallet: Wallet,
  business: BriefcaseBusiness,
  developers: FileText,
  notifications: Bell,
  support: CircleHelp,
  merchants: Building2,
  withdrawals: Landmark,
  disputes: ShieldCheck,
  security: ShieldCheck,
  system: Settings,
  profile: UserCircle2,
  overview: Sparkles,
  fees: TrendingUp,
  team: Users,
};

const resolveIcon = (iconName) => ICONS[iconName] || LayoutGrid;

/*
|--------------------------------------------------------------------------
| Build a flat index: { [key]: { parent, child, section } }
|--------------------------------------------------------------------------
*/
const buildIndex = (navSections = []) => {
  const index = {};

  navSections.forEach((section) => {
    (section.items || []).forEach((item) => {
      index[item.key] = {
        key: item.key,
        label: item.label,
        path: item.path,
        sectionTitle: section.title,
        parent: null,
        child: null,
      };

      (item.children || []).forEach((child) => {
        index[child.key] = {
          key: child.key,
          label: child.label,
          path: child.path,
          sectionTitle: section.title,
          parent: item,
          child: null,
        };
      });
    });
  });

  return index;
};

/*
|--------------------------------------------------------------------------
| Find nav key from a given URL path (deepest match wins)
|--------------------------------------------------------------------------
*/
const findKeyFromPath = (index, pathname) => {
  if (!pathname) return null;

  let bestMatchKey = null;
  let bestMatchLength = -1;

  Object.values(index).forEach((entry) => {
    if (!entry.path) return;

    const isMatch =
      pathname === entry.path || pathname.startsWith(entry.path + "/");

    if (isMatch && entry.path.length > bestMatchLength) {
      bestMatchKey = entry.key;
      bestMatchLength = entry.path.length;
    }
  });

  return bestMatchKey;
};

const DashboardLayout = ({
  title,
  subtitle,
  navSections,
  profileName = "Operator",
  profileRole,
  notificationCount = null,
  notificationsPath = null,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const getMyNotifications = useMerchantMemberStore((state) => state.getMyNotifications);
  const addNotification = useMerchantMemberStore((state) => state.addNotification);
  const addNotifications = useMerchantMemberStore((state) => state.addNotifications);
  const storeUnreadCount = useMerchantMemberStore((state) => state.getUnreadNotificationCount());
  const resolvedNotificationCount = notificationCount ?? storeUnreadCount;
  const resolvedNotificationsPath = notificationsPath || (
    location.pathname.startsWith("/merchant/dashboard")
      ? "/merchant/dashboard/notifications"
      : "/user/dashboard/notifications"
  );

  // ---- Auth + merchant stores (for logout) ----
  const { logout, isLoading: authLoading } = useAuthStore();
  const {
    clearMerchant,
    memberships,
    selectedMerchantId,
    setActiveMerchant,
  } = useMerchantStore();

  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getMyNotifications();

    const token = localStorage.getItem("accessToken");
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    if (!token || !apiBase) return undefined;

    let socketOrigin;
    try {
      socketOrigin = new URL(apiBase).origin;
    } catch {
      return undefined;
    }

    const socket = io(socketOrigin, {
      auth: (callback) => callback({ token: localStorage.getItem("accessToken") }),
      transports: ["websocket", "polling"],
    });
    socket.on("notification:new", addNotification);
    socket.on("notification:new:bulk", addNotifications);

    return () => socket.disconnect();
  }, [getMyNotifications, addNotification, addNotifications]);

  const index = useMemo(() => buildIndex(navSections), [navSections]);

  const [mobileOpen, setMobileOpen] = useState(false);

  const urlKey = useMemo(
    () => findKeyFromPath(index, location.pathname),
    [index, location.pathname]
  );

  const [manualSelectedKey, setManualSelectedKey] = useState(
    () => urlKey || navSections?.[0]?.items?.[0]?.key || "dashboard"
  );

  const selectedKey = urlKey || manualSelectedKey;

  const [expanded, setExpanded] = useState(() => {
    const map = {};
    navSections?.forEach((section) => {
      (section.items || []).forEach((item) => {
        if (item.children?.length) {
          map[item.key] = true;
        }
      });
    });
    return map;
  });

  /*
  |--------------------------------------------------------------------------
  | Breadcrumbs
  |--------------------------------------------------------------------------
  */
  const breadcrumbs = useMemo(() => {
    const entry = index[selectedKey];
    const crumbs = [];

    crumbs.push({ label: title || "Workspace", key: "__root__" });

    if (!entry) return crumbs;

    if (entry.parent) {
      crumbs.push({
        label: entry.parent.label,
        key: entry.parent.key,
        path: entry.parent.path,
      });
      crumbs.push({
        label: entry.label,
        key: entry.key,
        path: entry.path,
      });
    } else {
      crumbs.push({
        label: entry.label,
        key: entry.key,
        path: entry.path,
      });
    }

    return crumbs;
  }, [index, selectedKey, title]);

  const activeLabel =
    breadcrumbs[breadcrumbs.length - 1]?.label || title || "Workspace";

  const toggleExpanded = (key) => {
    setExpanded((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleItemClick = (item) => {
    const hasChildren = Boolean(item.children?.length);

    if (hasChildren) {
      toggleExpanded(item.key);
    }

    setManualSelectedKey(item.key);

    if (item.path) {
      navigate(item.path);
    }
  };

  const handleWorkspaceChange = (event) => {
    if (!setActiveMerchant(event.target.value)) return;
    window.location.reload();
  };

  const handleChildClick = (child) => {
    setManualSelectedKey(child.key);
    if (child.path) {
      navigate(child.path);
    }
    setMobileOpen(false);
  };

  /*
  |--------------------------------------------------------------------------
  | SIGN OUT
  |--------------------------------------------------------------------------
  | 1. Call authService.logout() (revokes refresh token + clears localStorage)
  | 2. Clear merchant-scoped state
  | 3. Redirect to /login
  */
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);

    try {
      await logout();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      clearMerchant();
      useTransactionStore.getState().clearAll();
      useMerchantMemberStore.getState().reset();
      setMobileOpen(false);
      navigate("/login", { replace: true });
      setSigningOut(false);
    }
  };

  const isSigningOut = signingOut || authLoading;

  /* --------------------------- Sidebar (desktop) --------------------------- */
  const sidebar = (
    <aside className="hidden w-[260px] shrink-0 border-r border-ctex-border bg-ctex-surface/80 p-4 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-ctex-border bg-ctex-elevated/50 px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ctex-blue text-sm font-bold text-white shadow-lg shadow-ctex-blue/25">
            C
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ctex-text-muted">
              C-TEX
            </p>
            <p className="text-base font-semibold text-ctex-text">PAY</p>
          </div>
        </div>
        <span className="rounded-full border border-ctex-border bg-ctex-bg px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-ctex-text-muted">
          {title}
        </span>
      </div>

      <nav className="space-y-4 overflow-y-auto pb-4">
        {(navSections || []).map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-ctex-text-muted">
              {section.title}
            </p>

            <div className="space-y-1">
              {(section.items || []).map((item) => {
                const Icon = resolveIcon(item.icon);
                const hasChildren = Boolean(item.children?.length);
                const isExpanded = expanded[item.key];

                const childSelected = (item.children || []).some(
                  (c) => c.key === selectedKey
                );
                const isSelected = selectedKey === item.key || childSelected;

                return (
                  <div key={item.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={[
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150",
                        isSelected
                          ? "bg-ctex-blue/10 text-ctex-blue ring-1 ring-ctex-blue/20"
                          : "text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={16} />
                        {item.label}
                      </span>

                      {hasChildren &&
                        (isExpanded ? (
                          <ChevronDown size={15} />
                        ) : (
                          <ChevronRight size={15} />
                        ))}
                    </button>

                    {hasChildren && isExpanded && (
                      <div className="ml-6 space-y-1 border-l border-ctex-border pl-3">
                        {(item.children || []).map((child) => (
                          <button
                            type="button"
                            key={child.key}
                            onClick={() => handleChildClick(child)}
                            className={[
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                              selectedKey === child.key
                                ? "bg-ctex-elevated text-ctex-text"
                                : "text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text",
                            ].join(" ")}
                          >
                            <span>{child.label}</span>
                            {selectedKey === child.key && (
                              <ChevronRight size={12} />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-ctex-border bg-ctex-elevated/60 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ctex-blue/10 text-ctex-blue">
            <UserCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ctex-text">
              {profileName}
            </p>
            <p className="truncate text-[11px] text-ctex-text-muted">
              {profileRole || `${title} account`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-3 py-2 text-sm font-medium text-ctex-text-muted transition hover:border-red-500/50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningOut ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Signing out…
            </>
          ) : (
            <>
              <LogOut size={14} />
              Sign out
            </>
          )}
        </button>
      </div>
    </aside>
  );

  /* ---------------------------- Render ---------------------------- */
  return (
    <div className="min-h-screen bg-ctex-bg text-ctex-text">
      <div className="flex min-h-screen">
        {sidebar}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 border-b border-ctex-border bg-ctex-bg/80 backdrop-blur-xl">
            <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ctex-border bg-ctex-surface text-ctex-text lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={18} />
                </button>

                <div className="min-w-0">
                  <nav
                    aria-label="Breadcrumb"
                    className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-ctex-text-muted"
                  >
                    {breadcrumbs.map((crumb, idx) => {
                      const isLast = idx === breadcrumbs.length - 1;
                      return (
                        <span
                          key={crumb.key}
                          className="flex items-center gap-1"
                        >
                          <span
                            className={
                              isLast
                                ? "text-ctex-text-muted"
                                : "text-ctex-text-muted/70"
                            }
                          >
                            {crumb.label}
                          </span>
                          {!isLast && (
                            <ChevronRight
                              size={10}
                              className="text-ctex-text-muted/50"
                            />
                          )}
                        </span>
                      );
                    })}
                  </nav>

                  <h1 className="truncate text-lg font-semibold text-ctex-text sm:text-xl">
                    {activeLabel}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                {memberships.length > 1 && (
                  <label className="flex max-w-44 items-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-2 py-2 text-xs text-ctex-text-muted sm:max-w-56 sm:px-3">
                    <Building2 size={15} aria-hidden="true" />
                    <select
                      aria-label="Active merchant workspace"
                      value={selectedMerchantId || ""}
                      onChange={handleWorkspaceChange}
                      className="min-w-0 bg-transparent text-xs text-ctex-text outline-none"
                    >
                      {memberships.map((membership, index) => (
                        <option key={membership.id} value={membership.merchantId}>
                          {membership.isOwner
                            ? "My merchant account"
                            : `Team workspace ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <label className="hidden items-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-3 py-2 text-sm text-ctex-text-muted md:flex">
                  <Search size={15} />
                  <input
                    placeholder="Search"
                    className="w-40 bg-transparent text-sm text-ctex-text placeholder:text-ctex-text-muted/70 outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => navigate(resolvedNotificationsPath)}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ctex-border bg-ctex-surface text-ctex-text-muted transition hover:text-ctex-blue"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  {resolvedNotificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ctex-blue px-1 text-[9px] font-semibold text-white">
                      {resolvedNotificationCount > 9 ? "9+" : resolvedNotificationCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
            <div className="mb-6 rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-ctex-blue">
                    {title}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ctex-text sm:text-3xl">
                    {subtitle}
                  </h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-ctex-border bg-ctex-elevated px-3 py-2 text-xs text-ctex-text-muted">
                  <Sparkles size={14} className="text-ctex-blue" />
                  Live operations
                </div>
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -32, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="flex h-full w-[82vw] max-w-sm flex-col overflow-y-auto border-r border-ctex-border bg-ctex-surface p-4"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ctex-blue text-sm font-bold text-white">
                    C
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-ctex-text-muted">
                      C-TEX
                    </p>
                    <p className="text-base font-semibold text-ctex-text">PAY</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ctex-border text-ctex-text-muted"
                  aria-label="Close navigation"
                >
                  <X size={16} />
                </button>
              </div>

              <nav className="flex-1 space-y-4 overflow-y-auto pb-4">
                {(navSections || []).map((section) => (
                  <div key={section.title} className="space-y-2">
                    <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-ctex-text-muted">
                      {section.title}
                    </p>

                    <div className="space-y-1">
                      {(section.items || []).map((item) => {
                        const Icon = resolveIcon(item.icon);
                        const hasChildren = Boolean(item.children?.length);
                        const isExpanded = expanded[item.key];
                        const childSelected = (item.children || []).some(
                          (c) => c.key === selectedKey
                        );
                        const isSelected =
                          selectedKey === item.key || childSelected;

                        return (
                          <div key={item.key} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (hasChildren) {
                                  toggleExpanded(item.key);
                                }
                                setManualSelectedKey(item.key);
                                if (item.path) {
                                  navigate(item.path);
                                  setMobileOpen(false);
                                }
                              }}
                              className={[
                                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm",
                                isSelected
                                  ? "bg-ctex-blue/10 text-ctex-blue"
                                  : "text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text",
                              ].join(" ")}
                            >
                              <span className="flex items-center gap-3">
                                <Icon size={16} />
                                {item.label}
                              </span>
                              {hasChildren &&
                                (isExpanded ? (
                                  <ChevronDown size={15} />
                                ) : (
                                  <ChevronRight size={15} />
                                ))}
                            </button>

                            {hasChildren && isExpanded && (
                              <div className="ml-6 space-y-1 border-l border-ctex-border pl-3">
                                {(item.children || []).map((child) => (
                                  <button
                                    key={child.key}
                                    type="button"
                                    onClick={() => handleChildClick(child)}
                                    className={[
                                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs",
                                      selectedKey === child.key
                                        ? "bg-ctex-elevated text-ctex-text"
                                        : "text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text",
                                    ].join(" ")}
                                  >
                                    {child.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Mobile profile + sign out */}
              <div className="mt-4 rounded-2xl border border-ctex-border bg-ctex-elevated/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ctex-blue/10 text-ctex-blue">
                    <UserCircle2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ctex-text">
                      {profileName}
                    </p>
                    <p className="truncate text-[11px] text-ctex-text-muted">
                      {profileRole || `${title} account`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-3 py-2 text-sm font-medium text-ctex-text-muted transition hover:border-red-500/50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Signing out…
                    </>
                  ) : (
                    <>
                      <LogOut size={14} />
                      Sign out
                    </>
                  )}
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;