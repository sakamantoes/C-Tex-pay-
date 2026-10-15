import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { hasPermission } from "../../utils/permissions";
import LogoUploader from "../../components/media/LogoUploader"; // NEW

const navSections = [
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
        key: "business",
        label: "Business",
        icon: "business",
        children: [
          { key: "business-profile", label: "Business Profile", path: "/merchant/dashboard/business" },
          { key: "team-members", label: "Team Members", path: "/merchant/dashboard/team" },
          { key: "roles-permissions", label: "Roles & Permissions", path: "/merchant/dashboard/roles" },
        ],
      },
    ],
  },
];

const fields = [
  ["businessName", "Business name", true, "text"],
  ["businessType", "Business type", false, "text"],
  ["email", "Business email", false, "email"],
  ["phone", "Phone", false, "text"],
  ["website", "Website", false, "text"],
  ["country", "Country", false, "text"],
  ["state", "State", false, "text"],
  ["city", "City", false, "text"],
  ["address", "Address", false, "text"],
];

const emptyForm = Object.fromEntries(fields.map(([name]) => [name, ""]));

function normalizeUrl(value) {
  const v = (value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export default function MerchantBusinessProfilePage() {
  const { user } = useAuthStore();
  const {
    businessProfile,
    merchant,
    permissions,
    roles,
    isLoading,
    error,
    getBusinessProfile,
    getMyMerchant,
    updateBusinessProfile,
    clearError,
  } = useMerchantStore();

  const [form, setForm] = useState(emptyForm);
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState(""); // NEW
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([getBusinessProfile(), getMyMerchant()]).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!businessProfile) return;
    setForm((current) => ({
      ...current,
      ...Object.fromEntries(
        fields.map(([name]) => [name, businessProfile[name] || ""])
      ),
    }));
    setDescription(businessProfile.description || "");
    setLogoUrl(businessProfile.logoUrl || ""); // NEW
  }, [businessProfile]);

  const canUpdate = hasPermission(permissions, "merchants.update");

  const displayName = useMemo(
    () =>
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "Merchant Admin",
    [user]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canUpdate) return;

    const payload = {};

    for (const [key, value] of Object.entries(form)) {
      const trimmed = typeof value === "string" ? value.trim() : value;

      if (key === "website") {
        payload.website = normalizeUrl(trimmed);
        if (!payload.website) delete payload.website;
        continue;
      }

      if (trimmed === "") continue;
      payload[key] = trimmed;
    }

    const desc = description.trim();
    if (desc) payload.description = desc;

    if (!payload.businessName) {
      toast.error("Business name is required.");
      return;
    }

    // Logo — send "" to explicitly clear, or omit if unchanged
    if (logoUrl !== (businessProfile?.logoUrl || "")) {
      payload.logoUrl = logoUrl || "";
    }

    setIsSaving(true);
    const result = await updateBusinessProfile(payload);
    setIsSaving(false);

    if (result.success) toast.success("Business profile updated successfully.");
    else toast.error(result.message || "Unable to update business profile.");
  };

  const busy = isSaving || isLoading;

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Business profile"
      navSections={navSections}
      profileName={displayName}
      profileRole={roles[0]?.name}
    >
      <div className="rounded-2xl border border-ctex-border bg-ctex-surface p-5 shadow-lg shadow-black/10 sm:p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ctex-text">
              Business profile
            </h2>
            <p className="mt-1 text-sm text-ctex-text-muted">
              Keep your merchant information accurate and up to date.
            </p>
          </div>
          <span className="rounded-full border border-ctex-border bg-ctex-elevated px-3 py-1 text-xs text-ctex-text-muted">
            {merchant?.status || "ACTIVE"}
          </span>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* NEW — Logo */}
          <div className="rounded-xl border border-ctex-border bg-ctex-elevated/30 p-4">
            <LogoUploader
              value={logoUrl}
              onChange={setLogoUrl}
              disabled={!canUpdate || busy}
              size="lg"
              label="Business logo"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(([name, label, required, type]) => (
              <label
                key={name}
                className={
                  name === "address" ? "min-w-0 sm:col-span-2" : "min-w-0"
                }
              >
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                  {label}
                </span>
                <input
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={handleChange}
                  required={required}
                  disabled={!canUpdate || busy}
                  placeholder={
                    name === "website"
                      ? "https://www.example.com"
                      : undefined
                  }
                  className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none placeholder:text-ctex-text-muted/60 focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            ))}
          </div>

          <label>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              disabled={!canUpdate || busy}
              className="w-full rounded-xl border border-ctex-border bg-ctex-elevated/60 px-3 py-2 text-sm text-ctex-text outline-none placeholder:text-ctex-text-muted/60 focus:border-ctex-blue focus:ring-2 focus:ring-ctex-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <div className="flex flex-col gap-3 border-t border-ctex-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ctex-text-muted">
              {canUpdate
                ? "Changes are saved to your merchant profile."
                : "You have read-only access to this profile."}
            </p>
            {canUpdate && (
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-ctex-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ctex-blue-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {busy ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}