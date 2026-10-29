import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  ArrowRight,
  Copy,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useApiKeyStore } from "../../store/apiKey.store";
import { usePermissionStore } from "../../store/permission.store";
import { hasPermission } from "../../utils/permissions";
import RevealKeyModal from "../../components/apikeys/RevealKeyModal";
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

/* --------------------------------------------------------------------------
   STATUS HELPERS
   -------------------------------------------------------------------------- */
function statusTone(status) {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
      return "green";
    case "REVOKED":
    case "EXPIRED":
      return "red";
    default:
      return "neutral";
  }
}

const STATUS_TONES = {
  green: "bg-emerald-500/10 text-emerald-500",
  amber: "bg-amber-500/10 text-amber-500",
  red: "bg-red-500/10 text-red-500",
  neutral: "bg-ctex-border/40 text-ctex-text-muted",
};

const STATUS_DOTS = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  neutral: "bg-ctex-text-muted",
};

function StatusChip({ status }) {
  const tone = statusTone(status);
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        STATUS_TONES[tone],
      ].join(" ")}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[tone]}`} />
      {status || "ACTIVE"}
    </span>
  );
}

const inputBase =
  "h-11 w-full rounded-xl border border-ctex-border bg-ctex-panel/60 px-3 text-sm text-ctex-text outline-none placeholder:text-ctex-text-muted/60 transition focus:border-ctex-accent focus:ring-2 focus:ring-ctex-accent/20 disabled:opacity-60";

/* =========================================================
 * PAGE
 * ======================================================= */
export default function ApiKeysPage() {
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions, getMyMembership } = useMerchantStore();
  const { permissions: catalogue, getPermissions } = usePermissionStore();
  const {
    apiKeys,
    newlyCreatedKey,
    isLoading,
    error,
    getApiKeys,
    createApiKey,
    rotateApiKey,
    revokeApiKey,
    clearNewlyCreatedKey,
    clearError,
  } = useApiKeyStore();

  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("TEST");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [revealing, setRevealing] = useState(null);

  const selectAllRef = useRef(null);

  useEffect(() => {
    getApiKeys();
    if (permissions.length === 0) getMyMembership();
    getPermissions();
  }, [getApiKeys, getMyMembership, getPermissions, permissions.length]);

  const canCreate = hasPermission(permissions, "api_keys.create");
  const canRead = hasPermission(permissions, "api_keys.read");
  const canRevoke = hasPermission(permissions, "api_keys.revoke");
  const canManage =
    hasPermission(permissions, "api_keys.manage") ||
    roles.some((role) => role.name === "OWNER");

  const navSections = useMemo(() => buildMerchantNav(permissions), [permissions]);

  const displayName = useMemo(
    () =>
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "Merchant Admin",
    [user]
  );

  const allKeys = useMemo(
    () => catalogue.map((permission) => permission.key),
    [catalogue]
  );
  const selectedCount = useMemo(
    () => allKeys.filter((key) => selectedPermissions.includes(key)).length,
    [allKeys, selectedPermissions]
  );
  const allSelected = allKeys.length > 0 && selectedCount === allKeys.length;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const togglePermission = (key) => {
    setSelectedPermissions((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key]
    );
  };

  const toggleAllPermissions = () => {
    setSelectedPermissions(allSelected ? [] : allKeys);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    clearError();
    if (!name.trim()) {
      toast.error("API key name is required.");
      return;
    }
    const result = await createApiKey({
      name: name.trim(),
      environment,
      permissionKeys: selectedPermissions,
      expiresAt: expiresAt || null,
    });
    if (result.success) {
      toast.success(
        "API key created. Copy the secret now; it will not be shown again."
      );
      setName("");
      setSelectedPermissions([]);
      setExpiresAt("");
    } else toast.error(result.message || "Unable to create API key.");
  };

  const handleRotate = async (id) => {
    if (
      !window.confirm(
        "Rotate this API key? The current key will be revoked."
      )
    )
      return;
    const result = await rotateApiKey(id);
    if (result.success) toast.success("API key rotated. Copy the new secret now.");
    else toast.error(result.message || "Unable to rotate API key.");
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Revoke this API key? This action cannot be undone."))
      return;
    const result = await revokeApiKey(id);
    if (result.success) toast.success("API key revoked.");
    else toast.error(result.message || "Unable to revoke API key.");
  };

  const copyNewKey = async () => {
    try {
      await navigator.clipboard.writeText(newlyCreatedKey);
      toast.success("API key copied.");
    } catch {
      toast.error("Clipboard access failed. Select and copy the key manually.");
    }
  };

  const activeCount = apiKeys.filter((k) => k.status === "ACTIVE").length;

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant"}
      subtitle="API keys"
      navSections={navSections}
      profileName={displayName}
      profileRole={roles[0]?.name}
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
              Developer tools
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
              API keys
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/75">
              Create and manage the keys your integration uses to talk to
              C-TEX PAY. Secrets are shown only once.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
              <HeroPill icon={KeyRound}>
                {apiKeys.length} key{apiKeys.length === 1 ? "" : "s"}
              </HeroPill>
              {activeCount > 0 && (
                <HeroPill icon={ShieldCheck}>{activeCount} active</HeroPill>
              )}
              {!canCreate && (
                <HeroPill icon={Lock} tone="warn">
                  Read-only access
                </HeroPill>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── NEW KEY BANNER ────────────────────────────────────── */}
      <AnimatePresence>
        {newlyCreatedKey && (
          <motion.div
            key="new-key"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 rounded-[24px] border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                  style={TONES.orange}
                >
                  <KeyRound className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-500">
                    Copy this secret key now
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-ctex-text">
                    {newlyCreatedKey}
                  </p>
                  <p className="mt-1 text-[11px] text-ctex-text-muted">
                    It will not be shown again.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={copyNewKey}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-500 transition hover:bg-amber-500/20"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy key
                </button>
                <button
                  type="button"
                  onClick={clearNewlyCreatedKey}
                  aria-label="Dismiss"
                  className="rounded-full p-1.5 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LAYOUT ────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* CREATE FORM */}
        {canCreate && (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            onSubmit={handleCreate}
            className="rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6"
          >
            <div className="mb-5 flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                style={TONES.blue}
              >
                <Plus className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ctex-text sm:text-base">
                  Create API key
                </h2>
                <p className="mt-1 text-xs text-ctex-text-muted sm:text-sm">
                  Use separate keys for test and live integrations.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="api-name"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted"
                >
                  Name
                </label>
                <input
                  id="api-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Website checkout"
                  maxLength={100}
                  className={inputBase}
                />
              </div>

              <div>
                <label
                  htmlFor="api-env"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted"
                >
                  Environment
                </label>
                <select
                  id="api-env"
                  value={environment}
                  onChange={(event) => setEnvironment(event.target.value)}
                  className={inputBase}
                >
                  <option value="TEST">Test</option>
                  <option value="LIVE">Live</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="api-expires"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted"
                >
                  Expires (optional)
                </label>
                <input
                  id="api-expires"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className={inputBase}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                    Permissions
                  </p>
                  {catalogue.length > 0 && (
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ctex-text-muted transition hover:text-ctex-accent">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAllPermissions}
                        className="h-3.5 w-3.5 accent-ctex-accent"
                      />
                      Select all
                      <span className="text-ctex-text-muted/70">
                        ({selectedCount}/{catalogue.length})
                      </span>
                    </label>
                  )}
                </div>

                <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-ctex-border bg-ctex-panel/40 p-2 pr-2">
                  {catalogue.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-ctex-text-muted">
                      Loading permissions…
                    </p>
                  ) : (
                    catalogue.map((permission) => {
                      const checked = selectedPermissions.includes(
                        permission.key
                      );
                      return (
                        <label
                          key={permission.id}
                          className={[
                            "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition",
                            checked
                              ? "bg-ctex-accent/10 text-ctex-text"
                              : "text-ctex-text-muted hover:bg-ctex-panel/80 hover:text-ctex-text",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(permission.key)}
                            className="h-3.5 w-3.5 accent-ctex-accent"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {permission.name || permission.key}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ctex-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-ctex-accent/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {isLoading ? "Creating…" : "Create API key"}
              </button>
            </div>
          </motion.form>
        )}

        {/* LIST */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className={[
            "rounded-[28px] border border-ctex-border bg-ctex-surface p-5 sm:p-6",
            canCreate ? "" : "lg:col-span-2",
          ].join(" ")}
        >
          <div className="mb-5 flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={TONES.oxblood}
            >
              <KeyRound className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ctex-text sm:text-base">
                  Your API keys
                </h2>
                <span className="rounded-full border border-ctex-border bg-ctex-panel/40 px-3 py-1 text-[11px] font-medium text-ctex-text-muted">
                  {apiKeys.length} total
                </span>
              </div>
              <p className="mt-1 text-xs text-ctex-text-muted sm:text-sm">
                Secrets are only displayed once at creation or rotation.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading && apiKeys.length === 0 && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl bg-ctex-panel/40"
                  />
                ))}
              </div>
            )}

            {!isLoading && apiKeys.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ctex-border bg-ctex-panel/20 px-6 py-12 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                    style={TONES.oxblood}
                  >
                    <KeyRound className="h-6 w-6" strokeWidth={2.2} />
                  </span>
                  <p className="text-sm font-semibold text-ctex-text">
                    No API keys yet
                  </p>
                  <p className="text-xs text-ctex-text-muted">
                    {canCreate
                      ? "Create your first key to start integrating with C-TEX PAY."
                      : "No keys have been created for this workspace."}
                  </p>
                </div>
              </div>
            )}

            {apiKeys.map((key) => (
              <ApiKeyRow
                key={key.id}
                apiKey={key}
                canRead={canRead}
                canManage={canManage}
                canRevoke={canRevoke}
                isLoading={isLoading}
                onReveal={() => setRevealing(key)}
                onRotate={() => handleRotate(key.id)}
                onRevoke={() => handleRevoke(key.id)}
              />
            ))}
          </div>
        </motion.section>
      </div>

      <RevealKeyModal
        open={!!revealing}
        apiKey={revealing}
        onClose={() => setRevealing(null)}
      />
    </DashboardLayout>
  );
}

/* =========================================================
 * API KEY ROW
 * ======================================================= */
function ApiKeyRow({
  apiKey,
  canRead,
  canManage,
  canRevoke,
  isLoading,
  onReveal,
  onRotate,
  onRevoke,
}) {
  const isActive = apiKey.status === "ACTIVE";
  const keyPrefix = apiKey.prefix || apiKey.keyPrefix || "••••••••";

  return (
    <div className="rounded-2xl border border-ctex-border bg-ctex-panel/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-ctex-text">
              {apiKey.name || "Unnamed key"}
            </p>
            <StatusChip status={apiKey.status} />
            <span className="rounded-full border border-ctex-border bg-ctex-panel/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ctex-text-muted">
              {apiKey.environment || "TEST"}
            </span>
          </div>

          <p className="mt-1.5 font-mono text-[11px] text-ctex-text-muted">
            {keyPrefix}
          </p>

          {apiKey.expiresAt && (
            <p className="mt-1 text-[11px] text-ctex-text-muted">
              Expires{" "}
              {new Date(apiKey.expiresAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canRead && isActive && (
            <button
              type="button"
              disabled={isLoading}
              onClick={onReveal}
              className="inline-flex items-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-3 py-1.5 text-[11px] font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text disabled:opacity-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Reveal
            </button>
          )}

          {canManage && (
            <button
              type="button"
              disabled={!isActive || isLoading}
              onClick={onRotate}
              className="inline-flex items-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-3 py-1.5 text-[11px] font-medium text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Rotate
            </button>
          )}

          {canRevoke && (
            <button
              type="button"
              disabled={!isActive || isLoading}
              onClick={onRevoke}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-[11px] font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Revoke
            </button>
          )}

          {!canRead && !canManage && !canRevoke && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ctex-border bg-ctex-panel/40 px-3 py-1.5 text-[11px] font-medium text-ctex-text-muted">
              <Lock className="h-3.5 w-3.5" />
              Read-only
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 * HELPERS
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