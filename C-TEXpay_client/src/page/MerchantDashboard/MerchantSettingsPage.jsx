import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  Link2,
  Lock,
  Mail,
  Settings,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { hasPermission } from "../../utils/permissions";
import merchantSettingService from "../../service/merchantSettings.js";
import { buildMerchantNav } from "./merchantNav";

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

const HERO_BG = "linear-gradient(160deg,#2f95de 0%,#0B68AD 100%)";

const DEFAULT_NOTIFICATION_SETTINGS = {
  notifyPaymentSuccessInApp: true,
  notifyPaymentSuccessEmail: true,
  notificationEmail: "",
};

const DEFAULT_URL_SETTINGS = {
  successRedirectUrl: "",
  failureRedirectUrl: "",
  cancelRedirectUrl: "",
};

/* =========================================================
 * PAGE
 * ======================================================= */
export default function MerchantSettingsPage() {
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions } = useMerchantStore();
  const canUpdate = hasPermission(permissions, "settings.update");

  const navSections = useMemo(() => buildMerchantNav(permissions), [permissions]);

  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [urls, setUrls] = useState(DEFAULT_URL_SETTINGS);
  const [savingUrls, setSavingUrls] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ----------------------------------------------------------
   * Load both settings in one request
   * -------------------------------------------------------- */
  useEffect(() => {
    let active = true;

    merchantSettingService
      .getSettings()
      .then((settings) => {
        if (!active || !settings) return;

        setNotifications({
          notifyPaymentSuccessInApp: settings.notifyPaymentSuccessInApp ?? true,
          notifyPaymentSuccessEmail: settings.notifyPaymentSuccessEmail ?? true,
          notificationEmail: settings.notificationEmail || "",
        });

        setUrls({
          successRedirectUrl: settings.successRedirectUrl || "",
          failureRedirectUrl: settings.failureRedirectUrl || "",
          cancelRedirectUrl: settings.cancelRedirectUrl || "",
        });
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load merchant settings."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  /* ----------------------------------------------------------
   * Save notification preferences
   * -------------------------------------------------------- */
  const handleSaveNotifications = async (event) => {
    event.preventDefault();
    if (!canUpdate || savingNotifications) return;

    setError("");
    setSavingNotifications(true);

    try {
      const settings = await merchantSettingService.updateSettings({
        notifyPaymentSuccessInApp: notifications.notifyPaymentSuccessInApp,
        notifyPaymentSuccessEmail: notifications.notifyPaymentSuccessEmail,
        notificationEmail: notifications.notificationEmail.trim() || null,
      });

      if (settings) {
        setNotifications({
          notifyPaymentSuccessInApp: settings.notifyPaymentSuccessInApp ?? true,
          notifyPaymentSuccessEmail: settings.notifyPaymentSuccessEmail ?? true,
          notificationEmail: settings.notificationEmail || "",
        });
      }

      toast.success("Merchant notification settings saved.");
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        "Unable to save merchant settings.";
      setError(message);
      toast.error(message);
    } finally {
      setSavingNotifications(false);
    }
  };

  /* ----------------------------------------------------------
   * Save redirect URLs
   * -------------------------------------------------------- */
  const handleSaveUrls = async () => {
    if (!canUpdate || savingUrls) return;

    setError("");
    setSavingUrls(true);

    try {
      const settings = await merchantSettingService.updateUrls({
        successRedirectUrl: urls.successRedirectUrl.trim(),
        failureRedirectUrl: urls.failureRedirectUrl.trim(),
        cancelRedirectUrl: urls.cancelRedirectUrl.trim(),
      });

      if (settings) {
        setUrls({
          successRedirectUrl: settings.successRedirectUrl || "",
          failureRedirectUrl: settings.failureRedirectUrl || "",
          cancelRedirectUrl: settings.cancelRedirectUrl || "",
        });
      }

      toast.success("Redirect URLs saved.");
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        "Unable to save redirect URLs.";
      setError(message);
      toast.error(message);
    } finally {
      setSavingUrls(false);
    }
  };

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "Merchant user";

  const notificationCount = [
    notifications.notifyPaymentSuccessInApp,
    notifications.notifyPaymentSuccessEmail,
    urls.successRedirectUrl,
    urls.failureRedirectUrl,
    urls.cancelRedirectUrl,
  ].filter(Boolean).length;

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant workspace"}
      subtitle="Merchant settings"
      navSections={navSections}
      profileName={displayName || "Merchant user"}
      profileRole={roles[0]?.name || "Member"}
    >
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[28px] p-5 text-white sm:p-6 lg:p-8"
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

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/70 sm:text-[11px]">
              Workspace settings
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
              Merchant preferences
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              Control payment notifications and where customers land after
              checkout.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
              <HeroPill icon={Bell}>
                {notificationCount} active preference
                {notificationCount === 1 ? "" : "s"}
              </HeroPill>
              {!canUpdate && (
                <HeroPill icon={Lock} tone="warn">
                  Read-only access
                </HeroPill>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── ERROR ─────────────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {error}
        </motion.div>
      )}

      {/* ─── LOADING ──────────────────────────────────────────── */}
      {loading ? (
        <div className="mt-4 space-y-4">
          <div className="h-56 animate-pulse rounded-[28px] bg-ctex-surface" />
          <div className="h-56 animate-pulse rounded-[28px] bg-ctex-surface" />
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {/* ─── NOTIFICATIONS ───────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6"
          >
            <div className="mb-5 flex items-start gap-3">
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
                style={TONES.blue}
              >
                <Bell className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ctex-text sm:text-base">
                  Payment notifications
                </h2>
                <p className="mt-1 text-xs text-ctex-text-muted sm:text-sm">
                  Choose how this merchant workspace is notified when a payment
                  is confirmed successful.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNotifications} className="space-y-3">
              <ToggleCard
                icon={Bell}
                tone="blue"
                title="In-app notifications"
                description="Create an unread dashboard notification when a payment becomes successful."
                checked={notifications.notifyPaymentSuccessInApp}
                onChange={(checked) =>
                  setNotifications((current) => ({
                    ...current,
                    notifyPaymentSuccessInApp: checked,
                  }))
                }
                disabled={!canUpdate}
              />

              <ToggleCard
                icon={Mail}
                tone="green"
                title="Email notifications"
                description="Queue a payment confirmation email with automatic retries."
                checked={notifications.notifyPaymentSuccessEmail}
                onChange={(checked) =>
                  setNotifications((current) => ({
                    ...current,
                    notifyPaymentSuccessEmail: checked,
                  }))
                }
                disabled={!canUpdate}
              />

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                  Notification email override{" "}
                  <span className="font-normal lowercase tracking-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="email"
                  maxLength={255}
                  value={notifications.notificationEmail}
                  onChange={(event) =>
                    setNotifications((current) => ({
                      ...current,
                      notificationEmail: event.target.value,
                    }))
                  }
                  disabled={
                    !canUpdate || !notifications.notifyPaymentSuccessEmail
                  }
                  placeholder={user?.email || "payments@example.com"}
                  className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-panel/60 px-3 text-sm text-ctex-text outline-none placeholder:text-ctex-text-muted/60 transition focus:border-ctex-accent focus:ring-2 focus:ring-ctex-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1.5 text-[11px] text-ctex-text-muted">
                  Leave blank to send to the merchant account owner's email.
                </p>
              </div>

              {!canUpdate && (
                <ReadOnlyNotice />
              )}

              {canUpdate && (
                <div className="flex justify-end border-t border-ctex-border pt-4">
                  <button
                    type="submit"
                    disabled={savingNotifications}
                    className="inline-flex items-center gap-2 rounded-full bg-ctex-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-accent/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingNotifications && (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    )}
                    {savingNotifications ? "Saving…" : "Save settings"}
                  </button>
                </div>
              )}
            </form>
          </motion.section>

          {/* ─── REDIRECTS ────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6"
          >
            <div className="mb-5 flex items-start gap-3">
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
                style={TONES.green}
              >
                <Link2 className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ctex-text sm:text-base">
                  Redirect URLs
                </h2>
                <p className="mt-1 text-xs text-ctex-text-muted sm:text-sm">
                  Where customers are sent after checkout. These are separate
                  from your webhook URL, which receives server-side events.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <UrlField
                label="Success redirect URL"
                placeholder="https://yoursite.com/checkout/success"
                value={urls.successRedirectUrl}
                onChange={(value) =>
                  setUrls((current) => ({
                    ...current,
                    successRedirectUrl: value,
                  }))
                }
                disabled={!canUpdate}
              />

              <UrlField
                label="Failure redirect URL"
                placeholder="https://yoursite.com/checkout/failed"
                value={urls.failureRedirectUrl}
                onChange={(value) =>
                  setUrls((current) => ({
                    ...current,
                    failureRedirectUrl: value,
                  }))
                }
                disabled={!canUpdate}
              />

              <UrlField
                label="Cancel redirect URL"
                placeholder="https://yoursite.com/checkout/cancelled"
                value={urls.cancelRedirectUrl}
                onChange={(value) =>
                  setUrls((current) => ({
                    ...current,
                    cancelRedirectUrl: value,
                  }))
                }
                disabled={!canUpdate}
              />

              {!canUpdate && <ReadOnlyNotice />}

              {canUpdate && (
                <div className="flex justify-end border-t border-ctex-border pt-4">
                  <button
                    type="button"
                    onClick={handleSaveUrls}
                    disabled={savingUrls}
                    className="inline-flex items-center gap-2 rounded-full bg-ctex-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-accent/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingUrls && (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    )}
                    {savingUrls ? "Saving…" : "Save URLs"}
                  </button>
                </div>
              )}
            </div>
          </motion.section>
        </div>
      )}
    </DashboardLayout>
  );
}

/* =========================================================
 * SUB-COMPONENTS
 * ======================================================= */

function HeroPill({ icon: Icon, children, tone }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur",
        tone === "warn"
          ? "border-amber-300/40 bg-amber-300/15 text-white"
          : "border-white/25 bg-white/15 text-white",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-3.5 w-3.5",
          tone === "warn" ? "text-amber-200" : "text-white/80",
        ].join(" ")}
      />
      {children}
    </span>
  );
}

function ToggleCard({ icon: Icon, tone, title, description, checked, onChange, disabled }) {
  return (
    <label
      className={[
        "relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition",
        checked
          ? "border-ctex-accent/40 bg-ctex-accent/5"
          : "border-ctex-border bg-ctex-panel/40 hover:border-ctex-accent/30",
        disabled ? "cursor-not-allowed opacity-70" : "",
      ].join(" ")}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white"
        style={TONES[tone] || TONES.blue}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ctex-text">{title}</span>
        <span className="mt-1 block text-xs text-ctex-text-muted">
          {description}
        </span>
      </span>

      <span
        aria-hidden="true"
        className={[
          "relative mt-1 flex h-6 w-11 flex-shrink-0 items-center rounded-full transition",
          checked ? "bg-ctex-accent" : "bg-ctex-border",
        ].join(" ")}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow",
            checked ? "left-[calc(100%-1.375rem)]" : "left-0.5",
          ].join(" ")}
        />
      </span>
    </label>
  );
}

function UrlField({ label, placeholder, value, onChange, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
        {label}
      </span>
      <div className="relative">
        <ExternalLink
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ctex-text-muted"
          aria-hidden="true"
        />
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-panel/60 pl-10 pr-3 text-sm text-ctex-text outline-none placeholder:text-ctex-text-muted/60 transition focus:border-ctex-accent focus:ring-2 focus:ring-ctex-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      <span className="mt-1 block text-[11px] font-normal text-ctex-text-muted">
        Must be HTTPS. Leave empty to disable.
      </span>
    </label>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
      <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <p className="font-medium">
        You have read-only access. Only users with{" "}
        <span className="font-mono">settings.update</span> can change these
        preferences.
      </p>
    </div>
  );
}