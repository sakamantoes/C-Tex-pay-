import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { io } from "socket.io-client";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
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
  PanelLeftClose,
  PanelLeftOpen,
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

/* --------------------------------------------------------------------------
   BRAND TONES (shared with MerchantDashboard)
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   ICONS
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   Build a flat index of nav keys → metadata
   -------------------------------------------------------------------------- */
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
      };
      (item.children || []).forEach((child) => {
        index[child.key] = {
          key: child.key,
          label: child.label,
          path: child.path,
          sectionTitle: section.title,
          parent: item,
        };
      });
    });
  });

  return index;
};

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

/* --------------------------------------------------------------------------
   Small UI primitives
   -------------------------------------------------------------------------- */

function Kbd({ children }) {
  return (
    <kbd className="hidden rounded-md border border-ctex-border bg-ctex-surface px-1.5 py-0.5 text-[10px] font-medium text-ctex-text-muted sm:inline-flex">
      {children}
    </kbd>
  );
}

function IconButton({ label, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "relative inline-flex h-9 w-9 items-center justify-center rounded-xl",
        "border border-ctex-border bg-ctex-surface text-ctex-text-muted",
        "transition-all duration-200 hover:border-ctex-accent/40 hover:text-ctex-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctex-accent/40",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* Thin, unobtrusive scrollbar for the sidebar nav */
const NAV_SCROLL_CLASS =
  "[scrollbar-width:thin] [scrollbar-color:var(--ctex-border)_transparent] " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ctex-border " +
  "hover:[&::-webkit-scrollbar-thumb]:bg-ctex-text-muted/40";

/* --------------------------------------------------------------------------
   Main layout
   -------------------------------------------------------------------------- */
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
  const prefersReducedMotion = useReducedMotion();

  const getMyNotifications = useMerchantMemberStore(
    (s) => s.getMyNotifications
  );
  const addNotification = useMerchantMemberStore((s) => s.addNotification);
  const addNotifications = useMerchantMemberStore((s) => s.addNotifications);
  const storeUnreadCount = useMerchantMemberStore((s) =>
    s.getUnreadNotificationCount()
  );

  const resolvedNotificationCount = notificationCount ?? storeUnreadCount;
  const resolvedNotificationsPath =
    notificationsPath ||
    (location.pathname.startsWith("/merchant/dashboard")
      ? "/merchant/dashboard/notifications"
      : "/user/dashboard/notifications");

  const { logout, isLoading: authLoading, user } = useAuthStore();
  const {
    clearMerchant,
    memberships = [],
    selectedMerchantId,
    setActiveMerchant,
  } = useMerchantStore();

  /* ---------- UI state ---------- */
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  /* Collapsed-rail flyout state (fixed-positioned so the scrollable nav can't clip it) */
  const [flyoutKey, setFlyoutKey] = useState(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });

  const profileRef = useRef(null);
  const workspaceRef = useRef(null);
  const flyoutRef = useRef(null);

  /* ---------- Notifications bootstrap + sockets ---------- */
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
      auth: (cb) => cb({ token: localStorage.getItem("accessToken") }),
      transports: ["websocket", "polling"],
    });
    socket.on("notification:new", addNotification);
    socket.on("notification:new:bulk", addNotifications);

    return () => socket.disconnect();
  }, [getMyNotifications, addNotification, addNotifications]);

  /* ---------- Click-outside for popovers ---------- */
  useEffect(() => {
    const handleClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (
        workspaceRef.current &&
        !workspaceRef.current.contains(event.target)
      ) {
        setWorkspaceOpen(false);
      }
      if (flyoutRef.current && !flyoutRef.current.contains(event.target)) {
        setFlyoutKey(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ---------- Escape closes overlays ---------- */
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setProfileOpen(false);
        setWorkspaceOpen(false);
        setFlyoutKey(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  /* ---------- Close popovers when rail state changes ---------- */
  useEffect(() => {
    setProfileOpen(false);
    setFlyoutKey(null);
  }, [railCollapsed]);

  /* ---------- Close flyout on window resize ---------- */
  useEffect(() => {
    const handleResize = () => setFlyoutKey(null);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------- Invited USER → add Personal Dashboard section ---------- */
  const effectiveNavSections = useMemo(() => {
    const sections = navSections || [];
    if (
      user?.role !== "USER" ||
      !location.pathname.startsWith("/merchant/dashboard")
    ) {
      return sections;
    }
    return [
      ...sections,
      {
        title: "Personal",
        items: [
          {
            key: "personal-dashboard",
            label: "Personal dashboard",
            icon: "profile",
            path: "/user/dashboard/overview",
          },
        ],
      },
    ];
  }, [location.pathname, navSections, user?.role]);

  const index = useMemo(
    () => buildIndex(effectiveNavSections),
    [effectiveNavSections]
  );

  const urlKey = useMemo(
    () => findKeyFromPath(index, location.pathname),
    [index, location.pathname]
  );

  const [manualSelectedKey, setManualSelectedKey] = useState(
    () => urlKey || effectiveNavSections?.[0]?.items?.[0]?.key || "dashboard"
  );
  const selectedKey = urlKey || manualSelectedKey;

  const [expanded, setExpanded] = useState(() => {
    const map = {};
    effectiveNavSections?.forEach((section) => {
      (section.items || []).forEach((item) => {
        if (item.children?.length) map[item.key] = true;
      });
    });
    return map;
  });

  const breadcrumbs = useMemo(() => {
    const entry = index[selectedKey];
    const crumbs = [{ label: title || "Workspace", key: "__root__" }];
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

  const toggleExpanded = (key) =>
    setExpanded((current) => ({ ...current, [key]: !current[key] }));

  const handleItemClick = (item, event) => {
    const hasChildren = Boolean(item.children?.length);

    if (railCollapsed && hasChildren) {
      /* Position the fixed flyout next to the clicked icon */
      const rect = event?.currentTarget?.getBoundingClientRect?.();
      if (rect) {
        const estimatedHeight = (item.children?.length || 0) * 36 + 52;
        const maxTop = Math.max(8, window.innerHeight - estimatedHeight - 12);
        setFlyoutPos({
          top: Math.min(Math.max(8, rect.top), maxTop),
          left: rect.right + 8,
        });
      }
      setFlyoutKey((prev) => (prev === item.key ? null : item.key));
      setManualSelectedKey(item.key);
      return;
    }

    if (hasChildren) toggleExpanded(item.key);
    setManualSelectedKey(item.key);
    if (item.path) navigate(item.path);
  };

  const handleChildClick = (child) => {
    setManualSelectedKey(child.key);
    if (child.path) navigate(child.path);
    setMobileOpen(false);
    setFlyoutKey(null);
  };

  const handleWorkspaceChange = (membership) => {
    setWorkspaceOpen(false);
    if (!setActiveMerchant(membership.merchantId)) return;
    window.location.reload();
  };

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
      setProfileOpen(false);
      setFlyoutKey(null);
      navigate("/login", { replace: true });
      setSigningOut(false);
    }
  };

  const isSigningOut = signingOut || authLoading;
  const activeMembership = memberships.find(
    (m) => m.merchantId === selectedMerchantId
  );

  /* --------------------------------------------------------------------
     SIDEBAR NAV (shared between desktop + mobile)
     -------------------------------------------------------------------- */
  const renderNav = ({ compact = false, onNavigate } = {}) => (
    <nav
      onScroll={() => {
        if (flyoutKey) setFlyoutKey(null);
      }}
      className={[
        "min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden overscroll-contain px-2 pb-4",
        NAV_SCROLL_CLASS,
      ].join(" ")}
    >
      {effectiveNavSections.map((section) => (
        <div key={section.title} className="space-y-1">
          {!compact && (
            <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-ctex-text-muted/70">
              {section.title}
            </p>
          )}

          {(section.items || []).map((item) => {
            const Icon = resolveIcon(item.icon);
            const hasChildren = Boolean(item.children?.length);
            const isExpanded = expanded[item.key];
            const childSelected = (item.children || []).some(
              (c) => c.key === selectedKey
            );
            const isSelected = selectedKey === item.key || childSelected;
            const flyoutActive = flyoutKey === item.key;
            const isActive = isSelected || flyoutActive;

            return (
              <div key={item.key} className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    handleItemClick(item, event);
                    if (!hasChildren && item.path && onNavigate) onNavigate();
                  }}
                  title={compact ? item.label : undefined}
                  aria-haspopup={compact && hasChildren ? "menu" : undefined}
                  aria-expanded={
                    compact && hasChildren ? flyoutActive : undefined
                  }
                  className={[
                    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    compact ? "justify-center px-2" : "justify-between",
                    isActive
                      ? "text-ctex-text"
                      : "text-ctex-text-muted hover:bg-ctex-panel hover:text-ctex-text",
                  ].join(" ")}
                >
                  {/* Left-edge active indicator */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-ctex-accent"
                    />
                  )}

                  {isActive && !compact && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-xl bg-ctex-panel"
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 400, damping: 34 }
                      }
                    />
                  )}
                  {isActive && compact && (
                    <span className="absolute inset-0 -z-10 rounded-xl bg-ctex-panel" />
                  )}

                  <span
                    className={[
                      "flex items-center gap-3",
                      compact ? "justify-center" : "",
                    ].join(" ")}
                  >
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className={isActive ? "text-ctex-accent" : ""}
                    />
                    {!compact && <span className="truncate">{item.label}</span>}
                  </span>

                  {hasChildren && !compact && (
                    <span className="text-ctex-text-muted">
                      {isExpanded ? (
                        <ChevronDown size={15} />
                      ) : (
                        <ChevronRight size={15} />
                      )}
                    </span>
                  )}

                  {!hasChildren && !compact && isSelected && (
                    <ChevronRight
                      size={15}
                      className="flex-shrink-0 text-ctex-text-muted"
                    />
                  )}
                </button>

                {/* Expanded rail accordion */}
                <AnimatePresence initial={false}>
                  {hasChildren && isExpanded && !compact && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-8 mt-1 space-y-0.5 border-l border-ctex-border pl-3">
                        {(item.children || []).map((child) => (
                          <button
                            key={child.key}
                            type="button"
                            onClick={() => {
                              handleChildClick(child);
                              if (onNavigate) onNavigate();
                            }}
                            className={[
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                              selectedKey === child.key
                                ? "font-medium text-ctex-text"
                                : "text-ctex-text-muted hover:text-ctex-text",
                            ].join(" ")}
                          >
                            <span className="truncate">{child.label}</span>
                            {selectedKey === child.key && (
                              <span className="h-1 w-1 rounded-full bg-ctex-accent" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Collapsed rail flyout (fixed → never clipped by the scrolling nav) */}
                <AnimatePresence>
                  {compact && flyoutActive && hasChildren && (
                    <motion.div
                      ref={flyoutRef}
                      key="flyout"
                      initial={{ opacity: 0, x: -6, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      style={{ top: flyoutPos.top, left: flyoutPos.left }}
                      className="fixed z-50 w-56 overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface shadow-2xl shadow-black/10"
                    >
                      <div className="border-b border-ctex-border px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ctex-text-muted">
                          {item.label}
                        </p>
                      </div>
                      <div className="max-h-[70vh] overflow-y-auto p-1">
                        {(item.children || []).map((child) => (
                          <button
                            key={child.key}
                            type="button"
                            onClick={() => handleChildClick(child)}
                            className={[
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition",
                              selectedKey === child.key
                                ? "bg-ctex-panel font-medium text-ctex-text"
                                : "text-ctex-text-muted hover:bg-ctex-panel hover:text-ctex-text",
                            ].join(" ")}
                          >
                            <span className="truncate">{child.label}</span>
                            {selectedKey === child.key && (
                              <span className="h-1 w-1 rounded-full bg-ctex-accent" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );

  /* --------------------------------------------------------------------
     PROFILE POPOVER
     -------------------------------------------------------------------- */
  const renderProfilePopover = () => (
    <AnimatePresence>
      {profileOpen && (
        <motion.div
          initial={{
            opacity: 0,
            y: railCollapsed ? 0 : 8,
            x: railCollapsed ? -6 : 0,
            scale: 0.98,
          }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: railCollapsed ? 0 : 8,
            x: railCollapsed ? -6 : 0,
            scale: 0.98,
          }}
          transition={{ duration: 0.15 }}
          className={[
            "z-40 overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface shadow-2xl shadow-black/10",
            railCollapsed
              ? "absolute bottom-3 left-[calc(100%+8px)] w-56"
              : "absolute bottom-[calc(100%-4px)] left-3 right-3",
          ].join(" ")}
        >
          {railCollapsed && (
            <div className="border-b border-ctex-border px-3 py-2">
              <p className="truncate text-xs font-semibold text-ctex-text">
                {profileName}
              </p>
              <p className="truncate text-[11px] text-ctex-text-muted">
                {profileRole || `${title} account`}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              navigate("/merchant/dashboard/business");
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ctex-text-muted hover:bg-ctex-panel hover:text-ctex-text"
          >
            <UserCircle2 size={16} />
            My profile
          </button>
          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              navigate("/merchant/dashboard/settings");
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ctex-text-muted hover:bg-ctex-panel hover:text-ctex-text"
          >
            <Settings size={16} />
            Security
          </button>
          <div className="border-t border-ctex-border">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-60"
            >
              {isSigningOut ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing out…
                </>
              ) : (
                <>
                  <LogOut size={16} />
                  Sign out
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* --------------------------------------------------------------------
     RENDER
     -------------------------------------------------------------------- */
  return (
    <div className="flex h-screen w-full overflow-hidden bg-ctex-surface text-ctex-text">
      {/* ================= DESKTOP SIDEBAR ================= */}
      <motion.aside
        animate={{ width: railCollapsed ? 76 : 264 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 260, damping: 30 }
        }
        className="relative hidden h-screen min-h-0 flex-shrink-0 flex-col border-r border-ctex-border bg-ctex-surface lg:flex"
      >
        {/* ---------- Brand row ---------- */}
        <div
          className={[
            "flex flex-shrink-0 items-center px-3 py-4",
            railCollapsed ? "justify-center" : "justify-between",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            title="Go to homepage"
            className={[
              "flex items-center rounded-xl py-1 transition hover:bg-ctex-panel",
              railCollapsed ? "justify-center px-1" : "gap-3 px-1",
            ].join(" ")}
          >
            {/* Brand chip uses the TONES gradient (from MerchantDashboard) */}
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={TONES.blue}
            >
              C
            </span>
            {!railCollapsed && (
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] uppercase tracking-[0.18em] text-ctex-text-muted">
                  C-TEX
                </span>
                <span className="text-sm font-semibold text-ctex-text">
                  PAY
                </span>
              </span>
            )}
          </button>

          {!railCollapsed && (
            <IconButton
              label="Collapse sidebar"
              onClick={() => setRailCollapsed(true)}
            >
              <PanelLeftClose size={16} />
            </IconButton>
          )}
        </div>

        {/* ---------- Dedicated expand row (collapsed only) ---------- */}
        {railCollapsed && (
          <div className="mb-2 flex flex-shrink-0 justify-center border-t border-ctex-border/60 pt-3">
            <IconButton
              label="Expand sidebar"
              onClick={() => setRailCollapsed(false)}
            >
              <PanelLeftOpen size={16} />
            </IconButton>
          </div>
        )}

        {/* ---------- Nav (scrolls between the brand row and profile row) ---------- */}
        <div className="flex min-h-0 flex-1 flex-col border-t border-ctex-border/60 pt-4">
          {renderNav({ compact: railCollapsed })}
        </div>

        {/* ---------- Profile ---------- */}
        <div
          ref={profileRef}
          className={[
            "relative flex-shrink-0 border-t border-ctex-border p-3",
            railCollapsed ? "flex justify-center" : "",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            title={railCollapsed ? profileName : undefined}
            className={[
              "flex items-center gap-3 rounded-xl p-2 transition hover:bg-ctex-panel",
              railCollapsed ? "justify-center" : "w-full",
              profileOpen ? "bg-ctex-panel" : "",
            ].join(" ")}
          >
            {/* Avatar chip uses the blue tone gradient */}
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white"
              style={TONES.blue}
            >
              <UserCircle2 size={18} />
            </span>
            {!railCollapsed && (
              <>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium text-ctex-text">
                    {profileName}
                  </span>
                  <span className="block truncate text-[11px] text-ctex-text-muted">
                    {profileRole || `${title} account`}
                  </span>
                </span>
                <ChevronRight
                  size={15}
                  className="flex-shrink-0 text-ctex-text-muted"
                />
              </>
            )}
          </button>

          {renderProfilePopover()}
        </div>
      </motion.aside>

      {/* ================= MAIN COLUMN ================= */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex-shrink-0 bg-ctex-surface">
          <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 lg:px-8 lg:py-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ctex-border bg-ctex-surface text-ctex-text lg:hidden"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-ctex-text sm:text-lg">
                {activeLabel}
              </h1>
              <nav
                aria-label="Breadcrumb"
                className="mt-0.5 flex items-center gap-1 overflow-hidden text-xs text-ctex-text-muted"
              >
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <span
                      key={crumb.key}
                      className="flex min-w-0 items-center gap-1"
                    >
                      <span
                        className={[
                          "truncate",
                          isLast
                            ? "text-ctex-text-muted"
                            : "text-ctex-text-muted/70",
                        ].join(" ")}
                      >
                        {crumb.label}
                      </span>
                      {!isLast && (
                        <ChevronRight
                          size={10}
                          className="flex-shrink-0 text-ctex-text-muted/50"
                        />
                      )}
                    </span>
                  );
                })}
              </nav>
            </div>

            {/* Workspace switcher */}
            {memberships.length > 1 && (
              <div ref={workspaceRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setWorkspaceOpen((v) => !v)}
                  className="flex h-9 items-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-2.5 text-xs font-medium text-ctex-text transition hover:border-ctex-accent/40 sm:px-3"
                >
                  <Building2 size={14} className="text-ctex-accent" />
                  <span className="max-w-[120px] truncate">
                    {activeMembership?.isOwner
                      ? "My merchant"
                      : "Team workspace"}
                  </span>
                  <ChevronDown
                    size={14}
                    className={[
                      "transition-transform",
                      workspaceOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>

                <AnimatePresence>
                  {workspaceOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface shadow-2xl shadow-black/10"
                    >
                      <div className="border-b border-ctex-border px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ctex-text-muted">
                          Switch workspace
                        </p>
                      </div>
                      <div className="max-h-72 overflow-y-auto p-1">
                        {memberships.map((m) => {
                          const active = m.merchantId === selectedMerchantId;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleWorkspaceChange(m)}
                              className={[
                                "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition",
                                active
                                  ? "bg-ctex-panel text-ctex-text"
                                  : "text-ctex-text-muted hover:bg-ctex-panel hover:text-ctex-text",
                              ].join(" ")}
                            >
                              <span
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
                                style={
                                  active
                                    ? TONES.blue
                                    : { background: "var(--ctex-panel)" }
                                }
                              >
                                {m.isOwner ? "M" : "T"}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                  {m.isOwner
                                    ? "My merchant account"
                                    : "Team workspace"}
                                </span>
                                <span className="block truncate text-[11px] text-ctex-text-muted">
                                  {m.merchantCode || m.merchantId?.slice(0, 8)}
                                </span>
                              </span>
                              {active && (
                                <Check
                                  size={14}
                                  className="text-ctex-accent"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Search bar from MerchantDashboard */}
            <label className="hidden h-9 items-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-3 text-sm text-ctex-text-muted md:flex">
              <Search size={15} />
              <input
                placeholder="Search"
                className="w-32 bg-transparent text-sm text-ctex-text placeholder:text-ctex-text-muted/60 outline-none lg:w-44"
              />
              <Kbd>⌘K</Kbd>
            </label>

            <button
              type="button"
              onClick={() => navigate(resolvedNotificationsPath)}
              aria-label="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ctex-border bg-ctex-surface text-ctex-text-muted transition hover:border-ctex-accent/40 hover:text-ctex-accent"
            >
              <Bell size={16} />
              {resolvedNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ctex-accent px-1 text-[9px] font-semibold text-white">
                  {resolvedNotificationCount > 9
                    ? "9+"
                    : resolvedNotificationCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate("/merchant/dashboard/business")}
              aria-label="My profile"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white lg:hidden"
              style={TONES.blue}
            >
              <UserCircle2 size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-8 pt-2 sm:px-5 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-ctex-accent">{title}</p>
              <h2 className="mt-1 truncate text-xl font-semibold text-ctex-text sm:text-2xl">
                {subtitle}
              </h2>
            </div>
            <div className="flex w-fit items-center gap-2 rounded-full border border-ctex-border bg-ctex-surface px-3 py-1.5 text-[11px] font-medium text-ctex-text-muted">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live operations
            </div>
          </div>

          {children}
        </main>
      </div>

      {/* ================= MOBILE DRAWER ================= */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full min-h-0 w-[84vw] max-w-sm flex-col overflow-hidden border-r border-ctex-border bg-ctex-surface"
            >
              <div className="flex flex-shrink-0 items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={TONES.blue}
                  >
                    C
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-ctex-text-muted">
                      C-TEX
                    </span>
                    <span className="text-sm font-semibold text-ctex-text">
                      PAY
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ctex-border text-ctex-text-muted"
                >
                  <X size={16} />
                </button>
              </div>

              {renderNav({ onNavigate: () => setMobileOpen(false) })}

              <div className="flex-shrink-0 border-t border-ctex-border p-3">
                <div className="flex items-center gap-3 rounded-xl p-2">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                    style={TONES.blue}
                  >
                    <UserCircle2 size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
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
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-3 py-2 text-sm font-medium text-ctex-text-muted transition hover:border-red-500/50 hover:text-red-500 disabled:opacity-60"
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