import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RefreshCw,
  RotateCw,
  Trash2,
  Webhook,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { hasPermission } from "../../utils/permissions";
import merchantWebhookService from "../../service/merchant";
import { buildMerchantNav } from "./merchantNav";

const LIMIT = 20;

/* --------------------------------------------------------------------------
   BRAND TONES
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

const STATUS_TONES = {
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-amber-500/10 text-amber-500",
  danger: "bg-red-500/10 text-red-500",
  neutral: "bg-ctex-border/40 text-ctex-text-muted",
};

const STATUS_DOTS = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-ctex-text-muted",
};

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED" || s === "SUCCESS") return "success";
  if (s === "PENDING" || s === "RETRYING") return "warning";
  if (s === "FAILED" || s === "ERROR") return "danger";
  return "neutral";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const inputBase =
  "h-11 w-full rounded-xl border border-ctex-border bg-ctex-panel/60 px-3 text-sm text-ctex-text outline-none transition placeholder:text-ctex-text-muted/60 focus:border-ctex-accent focus:ring-2 focus:ring-ctex-accent/20 disabled:cursor-not-allowed disabled:opacity-60";

/* =========================================================
 * PAGE
 * ======================================================= */
export default function MerchantWebhooksPage() {
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions } = useMerchantStore();
  const canManage = hasPermission(permissions, "webhooks.manage");
  const isOwner = roles.some((role) => role.name === "OWNER");

  const navSections = useMemo(
    () => buildMerchantNav(permissions),
    [permissions]
  );

  const [webhooks, setWebhooks] = useState([]);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: LIMIT,
    total: 0,
    totalPages: 0,
  });
  const [eventPage, setEventPage] = useState(1);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [oneTimeSecret, setOneTimeSecret] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [eventError, setEventError] = useState("");
  const [secretModalConfig, setSecretModalConfig] = useState(null);
  const [revealPassword, setRevealPassword] = useState("");
  const [showRevealPassword, setShowRevealPassword] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState("");
  const [secretRevealError, setSecretRevealError] = useState("");
  const [secretRevealLoading, setSecretRevealLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRotate, setConfirmRotate] = useState(null);

  /* ----------------------------------------------------------
   * Load webhook configs
   * -------------------------------------------------------- */
  const loadWebhooks = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await merchantWebhookService.listWebhooks();
      const configs = response.data?.configs || [];
      setWebhooks(configs);
      if (configs[0] && !editingId) {
        setUrl(configs[0].url || "");
        setDescription(configs[0].description || "");
        setEnabled(Boolean(configs[0].enabled));
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load webhook settings."
      );
    } finally {
      setLoading(false);
    }
  }, [editingId]);

  useEffect(() => {
    loadWebhooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------------------------------------------
   * Load events
   * -------------------------------------------------------- */
  useEffect(() => {
    let active = true;
    setEventLoading(true);
    setEventError("");
    merchantWebhookService
      .listWebhookEvents({ page: eventPage, limit: LIMIT })
      .then((response) => {
        if (!active) return;
        setEvents(response.data?.events || []);
        const meta = response.data?.pagination || {};
        setPagination({
          page: meta.page || eventPage,
          limit: meta.limit || LIMIT,
          total: meta.total || 0,
          totalPages: meta.totalPages || 0,
        });
      })
      .catch((requestError) => {
        if (active)
          setEventError(
            requestError.response?.data?.message ||
              "Unable to load delivery history."
          );
      })
      .finally(() => {
        if (active) setEventLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventPage]);

  /* ----------------------------------------------------------
   * Form actions
   * -------------------------------------------------------- */
  const resetForm = () => {
    setEditingId(null);
    setUrl("");
    setDescription("");
    setEnabled(true);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!canManage || action) return;
    setAction("save");
    try {
      const payload = {
        url: url.trim(),
        description: description.trim() || null,
      };
      if (editingId) {
        payload.enabled = enabled;
        await merchantWebhookService.updateWebhook(editingId, payload);
        toast.success("Webhook settings saved.");
      } else {
        const response = await merchantWebhookService.createWebhook({
          ...payload,
          enabled,
        });
        setOneTimeSecret(response.data?.secret || "");
        toast.success("Webhook configured. Copy the signing secret now.");
      }
      await loadWebhooks();
      resetForm();
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        "Unable to save webhook settings.";
      setError(message);
      toast.error(message);
    } finally {
      setAction("");
    }
  };

  const beginEdit = (config) => {
    setEditingId(config.id);
    setUrl(config.url || "");
    setDescription(config.description || "");
    setEnabled(Boolean(config.enabled));
  };

  const handleToggle = async (config) => {
    if (!canManage || action) return;
    setAction(`toggle-${config.id}`);
    try {
      await merchantWebhookService.updateWebhook(config.id, {
        enabled: !config.enabled,
      });
      await loadWebhooks();
      setEnabled(!config.enabled);
      toast.success(`Webhook ${config.enabled ? "disabled" : "enabled"}.`);
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.message ||
          "Unable to update webhook status."
      );
    } finally {
      setAction("");
    }
  };

  const doRotate = async (config) => {
    if (!canManage || action) return;
    setAction(`rotate-${config.id}`);
    setConfirmRotate(null);
    try {
      const response = await merchantWebhookService.rotateWebhookSecret(
        config.id
      );
      setOneTimeSecret(response.data?.secret || "");
      toast.success("Signing secret rotated. Copy the new secret now.");
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.message ||
          "Unable to rotate the signing secret."
      );
    } finally {
      setAction("");
    }
  };

  const doDelete = async (config) => {
    if (!canManage || action) return;
    setAction(`delete-${config.id}`);
    setConfirmDelete(null);
    try {
      await merchantWebhookService.deleteWebhook(config.id);
      await loadWebhooks();
      setOneTimeSecret("");
      resetForm();
      toast.success("Webhook configuration deleted.");
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.message ||
          "Unable to delete webhook configuration."
      );
    } finally {
      setAction("");
    }
  };

  /* ----------------------------------------------------------
   * Secret reveal
   * -------------------------------------------------------- */
  const openSecretReveal = (config) => {
    setSecretModalConfig(config);
    setRevealPassword("");
    setShowRevealPassword(false);
    setRevealedSecret("");
    setSecretRevealError("");
  };

  const closeSecretReveal = () => {
    setSecretModalConfig(null);
    setRevealPassword("");
    setShowRevealPassword(false);
    setRevealedSecret("");
    setSecretRevealError("");
    setSecretRevealLoading(false);
  };

  const handleRevealSecret = async (event) => {
    event.preventDefault();
    if (!secretModalConfig || !revealPassword || secretRevealLoading) return;
    setSecretRevealError("");
    setSecretRevealLoading(true);
    try {
      const response = await merchantWebhookService.revealWebhookSecret(
        secretModalConfig.id,
        revealPassword
      );
      setRevealedSecret(response.data?.secret || "");
      setRevealPassword("");
    } catch (requestError) {
      setSecretRevealError(
        requestError.response?.data?.message ||
          "Unable to reveal the signing secret."
      );
    } finally {
      setSecretRevealLoading(false);
    }
  };

  /* ----------------------------------------------------------
   * Event details
   * -------------------------------------------------------- */
  const handleViewEvent = async (eventId) => {
    setSelectedEvent(null);
    setEventError("");
    setEventDetailsOpen(true);
    setEventLoading(true);
    try {
      const response = await merchantWebhookService.getWebhookEvent(eventId);
      setSelectedEvent(response.data?.event || null);
    } catch (requestError) {
      setEventError(
        requestError.response?.data?.message ||
          "Unable to load event details."
      );
    } finally {
      setEventLoading(false);
    }
  };

  const closeEventDetails = () => {
    setEventDetailsOpen(false);
    setSelectedEvent(null);
    setEventError("");
  };

  /* ----------------------------------------------------------
   * Copy
   * -------------------------------------------------------- */
  const copyToClipboard = async (value, successMessage) => {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const el = document.createElement("textarea");
        el.value = value;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      toast.success(successMessage || "Copied.");
    } catch {
      window.prompt("Copy this value:", value);
    }
  };

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "Merchant user";
  const config = webhooks[0] || null;

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant workspace"}
      subtitle="Webhooks"
      navSections={navSections}
      profileName={displayName || "Merchant user"}
      profileRole={roles[0]?.name || "Member"}
    >
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-[28px] p-4 text-white sm:p-6 lg:p-8"
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

        <div className="relative flex flex-col gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/70 sm:text-[11px]">
              Webhook endpoint
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl lg:text-3xl">
              Signed payment events
            </h2>
            <p className="mt-1.5 text-sm text-white/75">
              C-TEX PAY sends signed payment events to your HTTPS endpoint.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <HeroPill icon={Webhook}>
              {webhooks.length} configured
            </HeroPill>
            {config && (
              <HeroPill
                icon={config.enabled ? CheckCircle2 : AlertCircle}
                tone={config.enabled ? undefined : "warn"}
              >
                {config.enabled ? "Enabled" : "Disabled"}
              </HeroPill>
            )}
            {!canManage && (
              <HeroPill icon={Lock} tone="warn">
                Read-only
              </HeroPill>
            )}
          </div>
        </div>
      </motion.section>

      {/* ─── ONE-TIME SECRET BANNER ────────────────────────────── */}
      <AnimatePresence>
        {oneTimeSecret && (
          <motion.section
            initial={{ opacity: 0, y: -6, marginTop: 0 }}
            animate={{ opacity: 1, y: 0, marginTop: 16 }}
            exit={{ opacity: 0, y: -6, marginTop: 0 }}
            className="rounded-[28px] border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                  style={TONES.orange}
                >
                  <Lock className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    Copy this signing secret now
                  </h3>
                  <p className="mt-0.5 text-xs text-ctex-text-muted">
                    It is shown once and cannot be retrieved later.
                  </p>
                </div>
              </div>

              <code className="block w-full break-all rounded-xl border border-amber-500/30 bg-ctex-surface/50 p-3 font-mono text-xs text-ctex-text">
                {oneTimeSecret}
              </code>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(oneTimeSecret, "Signing secret copied.")
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-500/20 sm:py-2 dark:text-amber-400"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy secret
                </button>
                <button
                  type="button"
                  onClick={() => setOneTimeSecret("")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-4 py-2.5 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel sm:py-2"
                >
                  <X className="h-3.5 w-3.5" />
                  Dismiss
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ─── ERROR BANNER ─────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <p>{error}</p>
        </motion.div>
      )}

      {/* ─── MAIN GRID ────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Endpoint form */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-[28px] border border-ctex-border bg-ctex-surface p-4 sm:p-6"
        >
          <div className="mb-4 flex items-start gap-3 sm:mb-5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={TONES.blue}
            >
              <Webhook className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ctex-text sm:text-base">
                {editingId
                  ? "Edit endpoint"
                  : config
                  ? "Endpoint settings"
                  : "Configure endpoint"}
              </h3>
              <p className="mt-1 text-xs text-ctex-text-muted">
                HTTPS is required. Local and private network addresses are
                rejected.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-11 animate-pulse rounded-xl bg-ctex-panel" />
              <div className="h-11 animate-pulse rounded-xl bg-ctex-panel" />
              <div className="h-10 w-32 animate-pulse rounded-full bg-ctex-panel" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                Endpoint URL
                <input
                  type="text"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  maxLength={2048}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  disabled={!canManage || Boolean(config && !editingId)}
                  placeholder="https://api.example.com/webhooks/ctex"
                  className={`${inputBase} mt-1.5`}
                />
              </label>

              <label className="block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                Description
                <input
                  type="text"
                  maxLength={255}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={!canManage || Boolean(config && !editingId)}
                  placeholder="Production order updates"
                  className={`${inputBase} mt-1.5`}
                />
              </label>

              {(!config || editingId) && (
                <label className="flex items-center gap-2.5 rounded-2xl border border-ctex-border bg-ctex-panel/40 p-3 text-sm text-ctex-text">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                    disabled={!canManage}
                    className="h-4 w-4"
                  />
                  <span>Endpoint enabled</span>
                </label>
              )}

              {!canManage && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                  <Lock
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="font-medium">
                    You have read-only access to webhook settings.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-ctex-border pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="order-2 rounded-full border border-ctex-border bg-ctex-surface px-4 py-2.5 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-panel sm:order-1 sm:py-2"
                  >
                    Cancel
                  </button>
                )}
                {canManage && (!config || editingId) && (
                  <button
                    type="submit"
                    disabled={Boolean(action)}
                    className="order-1 inline-flex items-center justify-center gap-2 rounded-full bg-ctex-accent px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-ctex-accent/25 transition hover:brightness-110 disabled:opacity-60 sm:order-2 sm:py-2"
                  >
                    {action === "save" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {action === "save"
                      ? "Saving…"
                      : editingId
                      ? "Save endpoint"
                      : "Create endpoint"}
                  </button>
                )}
                {canManage && config && !editingId && (
                  <button
                    type="button"
                    onClick={() => beginEdit(config)}
                    className="rounded-full border border-ctex-border bg-ctex-surface px-4 py-2.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel sm:py-2"
                  >
                    Edit endpoint
                  </button>
                )}
              </div>
            </form>
          )}
        </motion.section>

        {/* Delivery history */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-[28px] border border-ctex-border bg-ctex-surface p-4 sm:p-6"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                style={TONES.green}
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ctex-text sm:text-base">
                  Delivery history
                </h3>
                <p className="mt-1 text-xs text-ctex-text-muted">
                  Recent attempts and responses.
                </p>
              </div>
            </div>

            {config && canManage && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={Boolean(action)}
                  onClick={() => handleToggle(config)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-3 py-1.5 text-[11px] font-medium text-ctex-text transition hover:bg-ctex-panel disabled:opacity-50 sm:text-xs"
                >
                  {action === `toggle-${config.id}` && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {config.enabled ? "Disable" : "Enable"}
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => openSecretReveal(config)}
                    aria-label="View webhook signing secret"
                    title="View signing secret"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ctex-border bg-ctex-surface text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-accent"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={Boolean(action)}
                  onClick={() => setConfirmRotate(config)}
                  aria-label="Rotate webhook signing secret"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ctex-border bg-ctex-surface text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-accent disabled:opacity-50"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={Boolean(action)}
                  onClick={() => setConfirmDelete(config)}
                  aria-label="Delete webhook endpoint"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {eventError && (
            <p
              role="alert"
              className="mb-3 flex items-start gap-2 text-xs text-red-500"
            >
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{eventError}</span>
            </p>
          )}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs text-ctex-text-muted">
                <tr>
                  <Th>Event</Th>
                  <Th>Status</Th>
                  <Th>Attempts</Th>
                  <Th>Updated</Th>
                  <Th align="right">
                    <span className="sr-only">Details</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {eventLoading && events.length === 0 ? (
                  <SkeletonRows rows={4} cols={5} />
                ) : events.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-sm text-ctex-text-muted"
                    >
                      No webhook events yet.
                    </td>
                  </tr>
                ) : (
                  events.map((item) => (
                    <tr key={item.id} className="group">
                      <Td>
                        <span className="block font-mono text-xs text-ctex-text">
                          {item.eventId}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ctex-text-muted">
                          {item.eventType}
                        </span>
                      </Td>
                      <Td>
                        <StatusChip status={item.status} />
                      </Td>
                      <Td>
                        <span className="text-sm text-ctex-text-muted">
                          {item.attemptCount}
                        </span>
                      </Td>
                      <Td>
                        <span className="whitespace-nowrap text-[11px] text-ctex-text-muted">
                          {formatDate(
                            item.deliveredAt ||
                              item.lastAttemptAt ||
                              item.createdAt
                          )}
                        </span>
                      </Td>
                      <Td align="right">
                        <button
                          type="button"
                          onClick={() => handleViewEvent(item.eventId)}
                          className="rounded-full border border-ctex-border bg-ctex-surface px-3 py-1.5 text-[11px] font-medium text-ctex-text transition hover:bg-ctex-panel"
                        >
                          Details
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {eventLoading && events.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="h-20 animate-pulse rounded-2xl bg-ctex-panel"
                />
              ))
            ) : events.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-ctex-border px-4 py-10 text-center text-sm text-ctex-text-muted">
                No webhook events yet.
              </li>
            ) : (
              events.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-ctex-border bg-ctex-panel/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-ctex-text">
                        {item.eventId}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-ctex-text-muted">
                        {item.eventType}
                      </p>
                    </div>
                    <StatusChip status={item.status} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ctex-text-muted">
                    <div>
                      <p className="uppercase tracking-wide">Attempts</p>
                      <p className="mt-0.5 text-sm font-medium text-ctex-text">
                        {item.attemptCount}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Updated</p>
                      <p className="mt-0.5 text-sm font-medium text-ctex-text">
                        {formatDate(
                          item.deliveredAt ||
                            item.lastAttemptAt ||
                            item.createdAt
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleViewEvent(item.eventId)}
                    className="mt-3 w-full rounded-full border border-ctex-border bg-ctex-surface px-3 py-2 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel"
                  >
                    View details
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Pagination */}
          <div className="mt-3 flex flex-col gap-2 border-t border-ctex-border pt-3 text-xs text-ctex-text-muted sm:flex-row sm:items-center sm:justify-between">
            <span className="text-center sm:text-left">
              {pagination.total.toLocaleString()} events · page{" "}
              {Math.max(1, pagination.page)} of{" "}
              {Math.max(1, pagination.totalPages)}
            </span>
            <div className="flex justify-center gap-2 sm:justify-end">
              <button
                type="button"
                disabled={pagination.page <= 1 || eventLoading}
                onClick={() => setEventPage((current) => current - 1)}
                className="flex-1 rounded-full border border-ctex-border bg-ctex-surface px-3.5 py-1.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel disabled:opacity-40 sm:flex-initial"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={
                  pagination.page >= pagination.totalPages || eventLoading
                }
                onClick={() => setEventPage((current) => current + 1)}
                className="flex-1 rounded-full border border-ctex-border bg-ctex-surface px-3.5 py-1.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel disabled:opacity-40 sm:flex-initial"
              >
                Next →
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ─── EVENT DETAILS MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {eventDetailsOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeEventDetails();
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="webhook-event-title"
              className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] border border-ctex-border bg-ctex-surface shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[28px]"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex-shrink-0 border-b border-ctex-border px-4 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-5">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ctex-border sm:hidden" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white sm:h-10 sm:w-10"
                      style={TONES.blue}
                    >
                      <RefreshCw className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ctex-text-muted">
                        Webhook event
                      </p>
                      <h2
                        id="webhook-event-title"
                        className="mt-0.5 break-all font-mono text-xs font-semibold text-ctex-text sm:text-sm"
                      >
                        {selectedEvent?.eventId || "Event details"}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close event details"
                    onClick={closeEventDetails}
                    className="rounded-full p-1.5 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
                {eventLoading ? (
                  <p className="py-8 text-center text-sm text-ctex-text-muted">
                    Loading event details…
                  </p>
                ) : eventError ? (
                  <p role="alert" className="py-8 text-center text-sm text-red-500">
                    {eventError}
                  </p>
                ) : (
                  selectedEvent && (
                    <div className="space-y-4">
                      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                        <Detail label="Type" value={selectedEvent.eventType} />
                        <Detail label="Status" value={selectedEvent.status} />
                        <Detail
                          label="Attempts"
                          value={selectedEvent.attemptCount}
                        />
                        <Detail
                          label="Response"
                          value={selectedEvent.responseStatus ?? "—"}
                        />
                        <Detail
                          label="Next retry"
                          value={formatDate(selectedEvent.nextRetryAt)}
                        />
                        <Detail
                          label="Delivered"
                          value={formatDate(selectedEvent.deliveredAt)}
                        />
                        <Detail
                          label="Error code"
                          value={selectedEvent.errorCode || "—"}
                        />
                        <Detail
                          label="Created"
                          value={formatDate(selectedEvent.createdAt)}
                        />
                      </dl>
                      <JsonBlock
                        title="Event payload"
                        value={selectedEvent.payload}
                      />
                      {selectedEvent.responseBody && (
                        <JsonBlock
                          title="Endpoint response"
                          value={selectedEvent.responseBody}
                        />
                      )}
                    </div>
                  )
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SECRET REVEAL MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {secretModalConfig && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeSecretReveal();
            }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="webhook-secret-title"
              className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[24px] border border-ctex-border bg-ctex-surface shadow-2xl sm:max-w-md sm:rounded-[28px]"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex-shrink-0 border-b border-ctex-border px-4 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ctex-border sm:hidden" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white sm:h-10 sm:w-10"
                      style={TONES.orange}
                    >
                      <Lock className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ctex-text-muted">
                        Sensitive credential
                      </p>
                      <h2
                        id="webhook-secret-title"
                        className="mt-0.5 text-sm font-semibold text-ctex-text"
                      >
                        Webhook signing secret
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close secret dialog"
                    onClick={closeSecretReveal}
                    className="rounded-full p-1.5 text-ctex-text-muted transition hover:bg-ctex-panel hover:text-ctex-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                {!revealedSecret ? (
                  <form
                    onSubmit={handleRevealSecret}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-2 rounded-2xl bg-ctex-panel/60 p-3 text-xs text-ctex-text-muted">
                      <Lock
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ctex-accent"
                        aria-hidden="true"
                      />
                      <p>
                        Confirm your account password to reveal this merchant's
                        signing secret.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
                        Account password
                      </label>
                      <div
                        className={`relative flex items-center rounded-xl border bg-ctex-panel/60 transition-all duration-200 ${
                          secretRevealError
                            ? "border-red-500/70 ring-2 ring-red-500/15"
                            : "border-ctex-border focus-within:border-ctex-accent focus-within:ring-2 focus-within:ring-ctex-accent/20"
                        }`}
                      >
                        <Lock
                          className="pointer-events-none absolute left-3 h-4 w-4 text-ctex-text-muted"
                          aria-hidden="true"
                        />
                        <input
                          type={showRevealPassword ? "text" : "password"}
                          required
                          maxLength={256}
                          autoComplete="current-password"
                          value={revealPassword}
                          onChange={(event) =>
                            setRevealPassword(event.target.value)
                          }
                          className="h-11 w-full rounded-xl bg-transparent pl-10 pr-11 text-sm text-ctex-text outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRevealPassword((s) => !s)}
                          tabIndex={-1}
                          aria-label={
                            showRevealPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-ctex-text-muted transition hover:bg-ctex-border/40 hover:text-ctex-text"
                        >
                          {showRevealPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {secretRevealError && (
                      <p
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500"
                      >
                        <AlertCircle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{secretRevealError}</span>
                      </p>
                    )}

                    <div className="flex flex-col gap-2 border-t border-ctex-border pt-4 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeSecretReveal}
                        className="order-2 rounded-full border border-ctex-border bg-ctex-surface px-4 py-2.5 text-sm font-medium text-ctex-text transition hover:bg-ctex-panel sm:order-1 sm:py-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={secretRevealLoading || !revealPassword}
                        className="order-1 inline-flex items-center justify-center gap-2 rounded-full bg-ctex-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-accent/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:order-2 sm:py-2"
                      >
                        {secretRevealLoading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Verifying…
                          </>
                        ) : (
                          "Verify and reveal"
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Keep this secret private
                      </p>
                      <p className="mt-0.5 text-[11px] text-ctex-text-muted">
                        Closing this dialog clears it from the page.
                      </p>
                    </div>
                    <code className="block max-h-36 overflow-auto break-all rounded-xl border border-ctex-border bg-ctex-panel/60 p-3 font-mono text-xs text-ctex-text">
                      {revealedSecret}
                    </code>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            revealedSecret,
                            "Signing secret copied."
                          )
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ctex-border bg-ctex-surface px-4 py-2.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-panel sm:py-2"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={closeSecretReveal}
                        className="rounded-full bg-ctex-accent px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-ctex-accent/25 transition hover:brightness-110 sm:py-2"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRM DELETE ──────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmModal
            tone="danger"
            title="Delete this webhook?"
            description={
              <>
                Future events will no longer be sent to{" "}
                <strong className="break-all text-ctex-text">
                  {confirmDelete.url}
                </strong>
                . This action cannot be undone.
              </>
            }
            confirmLabel="Delete webhook"
            loading={action === `delete-${confirmDelete.id}`}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => doDelete(confirmDelete)}
          />
        )}
      </AnimatePresence>

      {/* ─── CONFIRM ROTATE ──────────────────────────────────── */}
      <AnimatePresence>
        {confirmRotate && (
          <ConfirmModal
            tone="warning"
            title="Rotate this signing secret?"
            description={
              <>
                The current secret stops working{" "}
                <strong className="text-ctex-text">immediately</strong>. You
                must update your endpoint to use the new secret.
              </>
            }
            confirmLabel="Rotate secret"
            loading={action === `rotate-${confirmRotate.id}`}
            onCancel={() => setConfirmRotate(null)}
            onConfirm={() => doRotate(confirmRotate)}
          />
        )}
      </AnimatePresence>
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs",
        tone === "warn"
          ? "border-amber-300/40 bg-amber-300/15 text-white"
          : "border-white/25 bg-white/15 text-white",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-3 w-3 sm:h-3.5 sm:w-3.5",
          tone === "warn" ? "text-amber-200" : "text-white/80",
        ].join(" ")}
      />
      {children}
    </span>
  );
}

function StatusChip({ status }) {
  const tone = statusTone(status);
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px]",
        STATUS_TONES[tone],
      ].join(" ")}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[tone]}`} />
      {status}
    </span>
  );
}

function ConfirmModal({
  tone = "danger",
  title,
  description,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}) {
  const tones = {
    danger: TONES.oxblood,
    warning: TONES.orange,
  };
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="w-full max-w-md overflow-hidden rounded-t-[24px] border border-ctex-border bg-ctex-surface shadow-2xl sm:rounded-[28px]"
      >
        <div className="px-4 pb-3 pt-3 sm:p-5">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ctex-border sm:hidden" />
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={tones[tone]}
            >
              {tone === "danger" ? (
                <Trash2 className="h-4 w-4" strokeWidth={2.2} />
              ) : (
                <RotateCw className="h-4 w-4" strokeWidth={2.2} />
              )}
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-ctex-text">
                {title}
              </h3>
              <p className="mt-1 text-sm text-ctex-text-muted">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-ctex-border bg-ctex-panel/40 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="order-2 rounded-full border border-ctex-border bg-ctex-surface px-4 py-2.5 text-sm font-medium text-ctex-text transition hover:bg-ctex-panel disabled:opacity-60 sm:order-1 sm:py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              "order-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70 sm:order-2 sm:py-2",
              tone === "danger"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-amber-500 hover:bg-amber-600",
            ].join(" ")}
          >
            {loading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      scope="col"
      className={[
        "whitespace-nowrap bg-ctex-panel px-3 py-2.5 font-medium first:rounded-l-xl last:rounded-r-xl sm:px-4 sm:py-3",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td
      className={[
        "border-b border-ctex-border px-3 py-2.5 transition group-hover:bg-ctex-panel/60 sm:px-4 sm:py-3.5",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-ctex-text-muted sm:text-[11px]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-medium text-ctex-text">
        {value}
      </dd>
    </div>
  );
}

function JsonBlock({ title, value }) {
  let text = value;
  if (typeof value === "object" && value !== null)
    text = JSON.stringify(value, null, 2);
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ctex-text-muted">
        {title}
      </h3>
      <pre className="max-h-48 overflow-auto rounded-xl border border-ctex-border bg-ctex-panel/60 p-3 text-[11px] text-ctex-text sm:max-h-64 sm:text-xs">
        {text || "—"}
      </pre>
    </section>
  );
}

function SkeletonRows({ rows, cols }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-4 sm:px-4">
              <div className="h-4 w-full animate-pulse rounded bg-ctex-panel" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}