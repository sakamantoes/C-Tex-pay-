import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { BadgeCheck, Briefcase, Building2, Globe2, Save, UserCircle2 } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { hasPermission } from "../../utils/permissions";
import { buildMerchantNav } from "./merchantNav";
import LogoUploader from "../../components/media/LogoUploader";

/* =========================================================
 * BRAND TONES
 * ======================================================= */
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

/* =========================================================
 * FIELD CONFIG
 * ======================================================= */
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

/* =========================================================
 * PAGE
 * ======================================================= */
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
  const [logoUrl, setLogoUrl] = useState("");
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
    setLogoUrl(businessProfile.logoUrl || "");
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

  const navSections = buildMerchantNav(permissions);

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="Business profile"
      navSections={navSections}
      profileName={displayName}
      profileRole={roles[0]?.name}
    >
      {/* ─── HERO ─────────────────────────────────────────── */}
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

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/70 sm:text-[11px]">
              Business profile
            </p>
            <h2 className="mt-2 break-words text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
              {businessProfile?.businessName || "Your business"}
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              Keep your merchant information accurate and up to date.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <HeroPill icon={BadgeCheck}>
                <span className="capitalize">
                  {merchant?.status || "ACTIVE"}
                </span>
              </HeroPill>
              {businessProfile?.businessType && (
                <HeroPill icon={Briefcase}>
                  {businessProfile.businessType}
                </HeroPill>
              )}
              {businessProfile?.country && (
                <HeroPill icon={Globe2}>{businessProfile.country}</HeroPill>
              )}
            </div>
          </div>

          {!canUpdate && (
            <span className="self-start rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur sm:self-auto">
              Read-only
            </span>
          )}
        </div>
      </motion.section>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {error}
        </motion.div>
      )}

      {/* ─── FORM ─────────────────────────────────────────── */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mt-4 space-y-6"
      >
        {/* Logo card */}
        <section className="rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={TONES.blue}
            >
              <UserCircle2 className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ctex-text">
                Business logo
              </h3>
              <p className="text-[11px] text-ctex-text-muted">
                Shown on invoices and checkout pages
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-ctex-border bg-ctex-panel/40 p-4">
            <LogoUploader
              value={logoUrl}
              onChange={setLogoUrl}
              disabled={!canUpdate || busy}
              size="lg"
              label="Business logo"
            />
          </div>
        </section>

        {/* Details card */}
        <section className="rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={TONES.green}
            >
              <Building2 className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ctex-text">
                Business details
              </h3>
              <p className="text-[11px] text-ctex-text-muted">
                Information used across your merchant workspace
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(([name, label, required, type]) => (
              <label
                key={name}
                className={
                  name === "address" ? "min-w-0 sm:col-span-2" : "min-w-0"
                }
              >
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ctex-text-muted">
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
                  className="h-11 w-full rounded-xl border border-ctex-border bg-ctex-panel/60 px-3 text-sm text-ctex-text outline-none placeholder:text-ctex-text-muted/60 transition focus:border-ctex-accent focus:ring-2 focus:ring-ctex-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ctex-text-muted">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              disabled={!canUpdate || busy}
              className="w-full rounded-xl border border-ctex-border bg-ctex-panel/60 px-3 py-2.5 text-sm text-ctex-text outline-none placeholder:text-ctex-text-muted/60 transition focus:border-ctex-accent focus:ring-2 focus:ring-ctex-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </section>

        {/* Footer actions */}
        <div className="flex flex-col gap-3 rounded-[28px] border border-ctex-border bg-ctex-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-xs text-ctex-text-muted">
            {canUpdate
              ? "Changes are saved to your merchant profile."
              : "You have read-only access to this profile."}
          </p>
          {canUpdate && (
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ctex-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Save className="h-4 w-4" strokeWidth={2.2} />
              )}
              {busy ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </motion.form>
    </DashboardLayout>
  );
}

/* =========================================================
 * HERO PILL
 * ======================================================= */
function HeroPill({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-white/80" />
      {children}
    </span>
  );
}