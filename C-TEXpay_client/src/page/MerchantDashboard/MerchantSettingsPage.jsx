import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { hasPermission } from "../../utils/permissions";
import merchantSettingService from "../../service/merchantSettings.js";

const navSections = [
  {
    title: "Workspace",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/merchant/dashboard" },
      { key: "webhooks", label: "Webhooks", icon: "webhooks", path: "/merchant/dashboard/webhooks" },
      { key: "settings", label: "Settings", icon: "settings", path: "/merchant/dashboard/settings" },
    ],
  },
];

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

export default function MerchantSettingsPage() {
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions } = useMerchantStore();
  const canUpdate = hasPermission(permissions, "settings.update");

  // Notification settings state
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Redirect URL settings state
  const [urls, setUrls] = useState(DEFAULT_URL_SETTINGS);
  const [savingUrls, setSavingUrls] = useState(false);

  // Shared load/error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ----------------------------------------------------------
   * Load both settings (notification prefs + redirect URLs)
   * in a single request — the backend returns everything from
   * GET /merchant-settings.
   * -------------------------------------------------------- */
  useEffect(() => {
    let active = true;

    merchantSettingService
      .getSettings()
      .then((settings) => {
        if (!active || !settings) return;

        setNotifications({
          notifyPaymentSuccessInApp:
            settings.notifyPaymentSuccessInApp ?? true,
          notifyPaymentSuccessEmail:
            settings.notifyPaymentSuccessEmail ?? true,
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

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant workspace"}
      subtitle="Merchant settings"
      navSections={navSections}
      profileName={displayName || "Merchant user"}
      profileRole={roles[0]?.name || "Member"}
    >
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="max-w-3xl space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-ctex-elevated" />
          <div className="h-40 animate-pulse rounded-xl bg-ctex-elevated" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ==============================
              Notification settings
          ============================== */}
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-ctex-text">
                Payment notifications
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-ctex-text-muted">
                Choose how this merchant workspace is notified when a payment
                is confirmed successful.
              </p>
            </div>

            <form
              onSubmit={handleSaveNotifications}
              className="max-w-3xl rounded-xl border border-ctex-border bg-ctex-surface p-5"
            >
              <div className="space-y-5">
                <label className="flex items-start gap-3 rounded-lg border border-ctex-border bg-ctex-elevated/30 p-4">
                  <input
                    type="checkbox"
                    checked={notifications.notifyPaymentSuccessInApp}
                    onChange={(event) =>
                      setNotifications((current) => ({
                        ...current,
                        notifyPaymentSuccessInApp: event.target.checked,
                      }))
                    }
                    disabled={!canUpdate}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ctex-text">
                      In-app notifications
                    </span>
                    <span className="mt-1 block text-xs text-ctex-text-muted">
                      Create an unread dashboard notification when a payment
                      becomes successful.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-lg border border-ctex-border bg-ctex-elevated/30 p-4">
                  <input
                    type="checkbox"
                    checked={notifications.notifyPaymentSuccessEmail}
                    onChange={(event) =>
                      setNotifications((current) => ({
                        ...current,
                        notifyPaymentSuccessEmail: event.target.checked,
                      }))
                    }
                    disabled={!canUpdate}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ctex-text">
                      Email notifications
                    </span>
                    <span className="mt-1 block text-xs text-ctex-text-muted">
                      Queue a payment confirmation email with automatic
                      retries.
                    </span>
                  </span>
                </label>

                <label className="block text-xs font-medium text-ctex-text-muted">
                  Notification email override{" "}
                  <span className="font-normal">(optional)</span>
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
                    className="mt-1.5 h-11 w-full rounded-lg border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue disabled:opacity-60"
                  />
                  <span className="mt-1.5 block font-normal">
                    Leave blank to send to the merchant account owner's email.
                  </span>
                </label>

                {!canUpdate && (
                  <p className="text-xs text-ctex-text-muted">
                    You have read-only access to merchant settings.
                  </p>
                )}

                {canUpdate && (
                  <div className="flex justify-end border-t border-ctex-border pt-4">
                    <button
                      type="submit"
                      disabled={savingNotifications}
                      className="rounded-lg bg-ctex-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ctex-blue-light disabled:opacity-60"
                    >
                      {savingNotifications ? "Saving…" : "Save settings"}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </section>

          {/* ==============================
              Redirect URL settings
          ============================== */}
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-ctex-text">
                Redirect URLs
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-ctex-text-muted">
                Where customers are sent after checkout. These are separate
                from your webhook URL, which receives server-side events.
              </p>
            </div>

            <div className="max-w-3xl rounded-xl border border-ctex-border bg-ctex-surface p-5">
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

                {!canUpdate && (
                  <p className="text-xs text-ctex-text-muted">
                    You have read-only access to redirect URLs.
                  </p>
                )}

                {canUpdate && (
                  <div className="flex justify-end border-t border-ctex-border pt-4">
                    <button
                      type="button"
                      onClick={handleSaveUrls}
                      disabled={savingUrls}
                      className="inline-flex items-center gap-2 rounded-lg bg-ctex-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-ctex-blue-light disabled:opacity-60"
                    >
                      {savingUrls ? "Saving…" : "Save URLs"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ------------------------------------------------------------------ */
/* URL field                                                          */
/* ------------------------------------------------------------------ */

function UrlField({ label, placeholder, value, onChange, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
        {label}
      </span>
      <input
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none placeholder:text-ctex-text-muted/60 focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span className="mt-1 block text-[11px] font-normal text-ctex-text-muted">
        Must be HTTPS. Leave empty to disable.
      </span>
    </label>
  );
}