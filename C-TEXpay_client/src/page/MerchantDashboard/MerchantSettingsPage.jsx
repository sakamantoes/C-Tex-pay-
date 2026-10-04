import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { hasPermission } from "../../utils/permissions";
import merchantSettingsService from "../../service/merchantSettings";

const navSections = [{
  title: "Workspace",
  items: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/merchant/dashboard" },
    { key: "webhooks", label: "Webhooks", icon: "webhooks", path: "/merchant/dashboard/webhooks" },
    { key: "settings", label: "Settings", icon: "settings", path: "/merchant/dashboard/settings" },
  ],
}];

const DEFAULT_SETTINGS = {
  notifyPaymentSuccessInApp: true,
  notifyPaymentSuccessEmail: true,
  notificationEmail: "",
};

export default function MerchantSettingsPage() {
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions } = useMerchantStore();
  const canUpdate = hasPermission(permissions, "settings.update");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    merchantSettingsService.getSettings()
      .then((response) => {
        if (!active) return;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...response.data?.settings,
          notificationEmail: response.data?.settings?.notificationEmail || "",
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load merchant settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canUpdate || saving) return;
    setError("");
    setSaving(true);
    try {
      const response = await merchantSettingsService.updateSettings({
        notifyPaymentSuccessInApp: settings.notifyPaymentSuccessInApp,
        notifyPaymentSuccessEmail: settings.notifyPaymentSuccessEmail,
        notificationEmail: settings.notificationEmail.trim() || null,
      });
      setSettings({
        ...DEFAULT_SETTINGS,
        ...response.data?.settings,
        notificationEmail: response.data?.settings?.notificationEmail || "",
      });
      toast.success("Merchant notification settings saved.");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to save merchant settings.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const displayName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Merchant user";

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant workspace"}
      subtitle="Merchant settings"
      navSections={navSections}
      profileName={displayName || "Merchant user"}
      profileRole={roles[0]?.name || "Member"}
    >
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-ctex-text">Payment notifications</h2>
        <p className="mt-1 max-w-2xl text-sm text-ctex-text-muted">Choose how this merchant workspace is notified when a payment is confirmed successful.</p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="max-w-3xl rounded-xl border border-ctex-border bg-ctex-surface p-5">
        {loading ? <p className="py-8 text-sm text-ctex-text-muted">Loading merchant settings…</p> : (
          <div className="space-y-5">
            <label className="flex items-start gap-3 rounded-lg border border-ctex-border bg-ctex-elevated/30 p-4">
              <input type="checkbox" checked={settings.notifyPaymentSuccessInApp} onChange={(event) => setSettings((current) => ({ ...current, notifyPaymentSuccessInApp: event.target.checked }))} disabled={!canUpdate} className="mt-1" />
              <span><span className="block text-sm font-medium text-ctex-text">In-app notifications</span><span className="mt-1 block text-xs text-ctex-text-muted">Create an unread dashboard notification when a payment becomes successful.</span></span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-ctex-border bg-ctex-elevated/30 p-4">
              <input type="checkbox" checked={settings.notifyPaymentSuccessEmail} onChange={(event) => setSettings((current) => ({ ...current, notifyPaymentSuccessEmail: event.target.checked }))} disabled={!canUpdate} className="mt-1" />
              <span><span className="block text-sm font-medium text-ctex-text">Email notifications</span><span className="mt-1 block text-xs text-ctex-text-muted">Queue a payment confirmation email with automatic retries.</span></span>
            </label>

            <label className="block text-xs font-medium text-ctex-text-muted">Notification email override <span className="font-normal">(optional)</span>
              <input type="email" maxLength={255} value={settings.notificationEmail} onChange={(event) => setSettings((current) => ({ ...current, notificationEmail: event.target.value }))} disabled={!canUpdate || !settings.notifyPaymentSuccessEmail} placeholder={user?.email || "payments@example.com"} className="mt-1.5 h-11 w-full rounded-lg border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue disabled:opacity-60" />
              <span className="mt-1.5 block font-normal">Leave blank to send to the merchant account owner’s email.</span>
            </label>

            {!canUpdate && <p className="text-xs text-ctex-text-muted">You have read-only access to merchant settings.</p>}

            {canUpdate && <div className="flex justify-end border-t border-ctex-border pt-4"><button type="submit" disabled={saving} className="rounded-lg bg-ctex-blue px-4 py-2 text-sm font-semibold text-white hover:bg-ctex-blue-light disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button></div>}
          </div>
        )}
      </form>
    </DashboardLayout>
  );
}
