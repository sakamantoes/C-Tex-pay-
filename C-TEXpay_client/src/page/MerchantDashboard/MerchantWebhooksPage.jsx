import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Eye, RotateCw, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { hasPermission } from "../../utils/permissions";
import merchantWebhookService from "../../service/merchant";

const LIMIT = 20;

const navSections = [{
  title: "Overview",
  items: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/merchant/dashboard" },
    { key: "transactions", label: "Transactions", icon: "transactions", path: "/merchant/dashboard/transactions" },
    { key: "webhooks", label: "Webhooks", icon: "webhooks", path: "/merchant/dashboard/webhooks" },
  ],
}];

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function eventStatusClass(status) {
  if (status === "DELIVERED") return "bg-emerald-500/10 text-emerald-500";
  if (status === "PENDING" || status === "RETRYING") return "bg-amber-500/10 text-amber-500";
  return "bg-red-500/10 text-red-500";
}

export default function MerchantWebhooksPage() {
  const { user } = useAuthStore();
  const { businessProfile, roles, permissions } = useMerchantStore();
  const canManage = hasPermission(permissions, "webhooks.manage");
  const isOwner = roles.some((role) => role.name === "OWNER");

  const [webhooks, setWebhooks] = useState([]);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 0 });
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
  const [revealedSecret, setRevealedSecret] = useState("");
  const [secretRevealError, setSecretRevealError] = useState("");
  const [secretRevealLoading, setSecretRevealLoading] = useState(false);

  useEffect(() => {
    let active = true;
    merchantWebhookService.listWebhooks()
      .then((response) => {
        if (!active) return;
        const configs = response.data?.configs || [];
        setWebhooks(configs);
        if (configs[0]) {
          setUrl(configs[0].url || "");
          setDescription(configs[0].description || "");
          setEnabled(Boolean(configs[0].enabled));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load webhook settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    merchantWebhookService.listWebhookEvents({ page: eventPage, limit: LIMIT })
      .then((response) => {
        if (!active) return;
        setEvents(response.data?.events || []);
        setPagination(response.data?.pagination || { page: eventPage, limit: LIMIT, total: 0, totalPages: 0 });
        setEventError("");
      })
      .catch((requestError) => {
        if (active) setEventError(requestError.response?.data?.message || "Unable to load delivery history.");
      })
      .finally(() => {
        if (active) setEventLoading(false);
      });
    return () => { active = false; };
  }, [eventPage]);

  const resetForm = () => {
    setEditingId(null);
    setUrl("");
    setDescription("");
    setEnabled(true);
  };

  const loadWebhooks = async () => {
    const response = await merchantWebhookService.listWebhooks();
    setWebhooks(response.data?.configs || []);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!canManage || action) return;
    setAction("save");
    try {
      const payload = { url: url.trim(), description: description.trim() || null };
      if (editingId) {
        payload.enabled = enabled;
        await merchantWebhookService.updateWebhook(editingId, payload);
        toast.success("Webhook settings saved.");
      } else {
        const response = await merchantWebhookService.createWebhook({ ...payload, enabled });
        setOneTimeSecret(response.data?.secret || "");
        toast.success("Webhook configured. Copy the signing secret now.");
      }
      await loadWebhooks();
      resetForm();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to save webhook settings.";
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
      await merchantWebhookService.updateWebhook(config.id, { enabled: !config.enabled });
      await loadWebhooks();
      setEnabled(!config.enabled);
      toast.success(`Webhook ${config.enabled ? "disabled" : "enabled"}.`);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to update webhook status.");
    } finally {
      setAction("");
    }
  };

  const handleRotate = async (config) => {
    if (!canManage || action || !window.confirm("Rotate this signing secret? The current secret will stop working immediately.")) return;
    setAction(`rotate-${config.id}`);
    try {
      const response = await merchantWebhookService.rotateWebhookSecret(config.id);
      setOneTimeSecret(response.data?.secret || "");
      toast.success("Signing secret rotated. Copy the new secret now.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to rotate the signing secret.");
    } finally {
      setAction("");
    }
  };

  const openSecretReveal = (config) => {
    setSecretModalConfig(config);
    setRevealPassword("");
    setRevealedSecret("");
    setSecretRevealError("");
  };

  const closeSecretReveal = () => {
    setSecretModalConfig(null);
    setRevealPassword("");
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
        revealPassword,
      );
      setRevealedSecret(response.data?.secret || "");
      setRevealPassword("");
    } catch (requestError) {
      setSecretRevealError(
        requestError.response?.data?.message || "Unable to reveal the signing secret.",
      );
    } finally {
      setSecretRevealLoading(false);
    }
  };

  const handleDelete = async (config) => {
    if (!canManage || action || !window.confirm("Delete this webhook configuration? Future events will no longer be sent to this endpoint.")) return;
    setAction(`delete-${config.id}`);
    try {
      await merchantWebhookService.deleteWebhook(config.id);
      setWebhooks((current) => current.filter((item) => item.id !== config.id));
      setOneTimeSecret("");
      resetForm();
      toast.success("Webhook configuration deleted.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Unable to delete webhook configuration.");
    } finally {
      setAction("");
    }
  };

  const handleViewEvent = async (eventId) => {
    setSelectedEvent(null);
    setEventError("");
    setEventDetailsOpen(true);
    setEventLoading(true);
    try {
      const response = await merchantWebhookService.getWebhookEvent(eventId);
      setSelectedEvent(response.data?.event || null);
    } catch (requestError) {
      setEventError(requestError.response?.data?.message || "Unable to load event details.");
    } finally {
      setEventLoading(false);
    }
  };

  const closeEventDetails = () => {
    setEventDetailsOpen(false);
    setSelectedEvent(null);
    setEventError("");
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(oneTimeSecret);
      toast.success("Signing secret copied.");
    } catch {
      toast.error("Clipboard access failed. Select and copy the secret manually.");
    }
  };

  const displayName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Merchant user";
  const config = webhooks[0] || null;

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant workspace"}
      subtitle="Webhooks"
      navSections={navSections}
      profileName={displayName || "Merchant user"}
      profileRole={roles[0]?.name || "Member"}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ctex-text">Webhook endpoint</h2>
          <p className="mt-1 max-w-2xl text-sm text-ctex-text-muted">C-TEX PAY sends signed payment events to your HTTPS endpoint.</p>
        </div>
        <span className="text-xs text-ctex-text-muted">{webhooks.length} configured</span>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>}

      <AnimatePresence>
        {oneTimeSecret && (
          <motion.section initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-amber-500">Copy this signing secret now</h3>
                <p className="mt-1 text-xs text-ctex-text-muted">It is shown once and cannot be retrieved later.</p>
                <code className="mt-3 block break-all rounded-lg bg-black/10 p-3 font-mono text-xs text-ctex-text">{oneTimeSecret}</code>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={copySecret} className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-500"><Copy size={14} />Copy</button>
                <button type="button" onClick={() => setOneTimeSecret("")} aria-label="Dismiss secret" className="rounded-lg p-2 text-amber-500 hover:bg-amber-500/10"><X size={16} /></button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-ctex-border bg-ctex-surface p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-ctex-text">{editingId ? "Edit endpoint" : config ? "Endpoint settings" : "Configure endpoint"}</h3>
            <p className="mt-1 text-xs text-ctex-text-muted">HTTPS is required. Local and private network addresses are rejected.</p>
          </div>

          {loading ? <p className="py-8 text-sm text-ctex-text-muted">Loading webhook configuration…</p> : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-xs font-medium text-ctex-text-muted">Endpoint URL
                <input type="url" required maxLength={2048} value={url} onChange={(event) => setUrl(event.target.value)} disabled={!canManage || Boolean(config && !editingId)} placeholder="https://api.example.com/webhooks/ctex" className="mt-1.5 h-11 w-full rounded-lg border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue disabled:opacity-70" />
              </label>
              <label className="block text-xs font-medium text-ctex-text-muted">Description
                <input type="text" maxLength={255} value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canManage || Boolean(config && !editingId)} placeholder="Production order updates" className="mt-1.5 h-11 w-full rounded-lg border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue disabled:opacity-70" />
              </label>
              {(!config || editingId) && (
                <label className="flex items-center gap-2 text-sm text-ctex-text">
                  <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!canManage} />
                  Endpoint enabled
                </label>
              )}
              {!canManage && <p className="text-xs text-ctex-text-muted">You have read-only access to webhook settings.</p>}
              <div className="flex flex-wrap justify-end gap-2">
                {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-ctex-border px-3 py-2 text-xs text-ctex-text-muted">Cancel</button>}
                {canManage && (!config || editingId) && <button type="submit" disabled={Boolean(action)} className="rounded-lg bg-ctex-blue px-4 py-2 text-xs font-semibold text-white hover:bg-ctex-blue-light disabled:opacity-60">{action === "save" ? "Saving…" : editingId ? "Save endpoint" : "Create endpoint"}</button>}
                {canManage && config && !editingId && <button type="button" onClick={() => beginEdit(config)} className="rounded-lg border border-ctex-border px-3 py-2 text-xs font-medium text-ctex-text hover:bg-ctex-elevated">Edit</button>}
              </div>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-ctex-border bg-ctex-surface p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-base font-semibold text-ctex-text">Delivery history</h3><p className="mt-1 text-xs text-ctex-text-muted">Recent payment event attempts and responses.</p></div>
            {config && canManage && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={Boolean(action)} onClick={() => handleToggle(config)} className="rounded-lg border border-ctex-border px-3 py-2 text-xs font-medium text-ctex-text hover:bg-ctex-elevated">{config.enabled ? "Disable" : "Enable"}</button>
                {isOwner && <button type="button" onClick={() => openSecretReveal(config)} aria-label="View webhook signing secret" title="View signing secret" className="rounded-lg border border-ctex-border p-2 text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-blue"><Eye size={15} /></button>}
                <button type="button" disabled={Boolean(action)} onClick={() => handleRotate(config)} aria-label="Rotate webhook signing secret" className="rounded-lg border border-ctex-border p-2 text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-blue"><RotateCw size={15} /></button>
                <button type="button" disabled={Boolean(action)} onClick={() => handleDelete(config)} aria-label="Delete webhook endpoint" className="rounded-lg border border-red-500/30 p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button>
              </div>
            )}
          </div>
          {eventError && <p role="alert" className="mb-3 text-xs text-red-500">{eventError}</p>}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ctex-border">
              <thead className="bg-ctex-elevated/50 text-left text-xs text-ctex-text-muted"><tr><th className="px-3 py-2.5 font-medium">Event</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 font-medium">Attempts</th><th className="px-3 py-2.5 font-medium">Updated</th><th className="px-3 py-2.5"><span className="sr-only">Details</span></th></tr></thead>
              <tbody className="divide-y divide-ctex-border">
                {eventLoading && events.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-ctex-text-muted">Loading delivery history…</td></tr> : events.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-ctex-text-muted">No webhook events yet.</td></tr> : events.map((item) => (
                  <tr key={item.id} className="hover:bg-ctex-elevated/30">
                    <td className="px-3 py-3"><span className="block font-mono text-xs text-ctex-text">{item.eventId}</span><span className="mt-1 block text-xs text-ctex-text-muted">{item.eventType}</span></td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${eventStatusClass(item.status)}`}>{item.status}</span></td>
                    <td className="px-3 py-3 text-sm text-ctex-text-muted">{item.attemptCount}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-ctex-text-muted">{formatDate(item.deliveredAt || item.lastAttemptAt || item.createdAt)}</td>
                    <td className="px-3 py-3 text-right"><button type="button" onClick={() => handleViewEvent(item.eventId)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-ctex-blue hover:bg-ctex-blue/10">Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-ctex-border pt-3 text-xs text-ctex-text-muted">
            <span>{pagination.total.toLocaleString()} events · page {pagination.page} of {Math.max(1, pagination.totalPages)}</span>
            <div className="flex gap-2"><button type="button" disabled={pagination.page <= 1 || eventLoading} onClick={() => { setEventLoading(true); setEventPage((current) => current - 1); }} className="rounded-lg border border-ctex-border px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" disabled={pagination.page >= pagination.totalPages || eventLoading} onClick={() => { setEventLoading(true); setEventPage((current) => current + 1); }} className="rounded-lg border border-ctex-border px-3 py-1.5 disabled:opacity-40">Next</button></div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {eventDetailsOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeEventDetails(); }}>
            <motion.section role="dialog" aria-modal="true" aria-labelledby="webhook-event-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-ctex-border bg-ctex-surface p-5 shadow-2xl" initial={{ y: 10 }} animate={{ y: 0 }} exit={{ y: 10 }}>
              <div className="flex items-start justify-between gap-3 border-b border-ctex-border pb-4"><div><p className="text-xs text-ctex-text-muted">Merchant webhook event</p><h2 id="webhook-event-title" className="mt-1 break-all text-lg font-semibold text-ctex-text">{selectedEvent?.eventId || "Event details"}</h2></div><button type="button" aria-label="Close event details" onClick={closeEventDetails} className="rounded-lg p-2 text-ctex-text-muted hover:bg-ctex-elevated"><X size={17} /></button></div>
              {eventLoading ? <p className="py-8 text-sm text-ctex-text-muted">Loading event details…</p> : eventError ? <p role="alert" className="py-8 text-sm text-red-500">{eventError}</p> : selectedEvent && <div className="mt-4 space-y-4"><dl className="grid gap-3 sm:grid-cols-2"><Detail label="Type" value={selectedEvent.eventType} /><Detail label="Status" value={selectedEvent.status} /><Detail label="Attempts" value={selectedEvent.attemptCount} /><Detail label="Response status" value={selectedEvent.responseStatus ?? "—"} /><Detail label="Next retry" value={formatDate(selectedEvent.nextRetryAt)} /><Detail label="Delivered" value={formatDate(selectedEvent.deliveredAt)} /><Detail label="Error code" value={selectedEvent.errorCode || "—"} /><Detail label="Created" value={formatDate(selectedEvent.createdAt)} /></dl><JsonBlock title="C-TEX PAY event payload" value={selectedEvent.payload} />{selectedEvent.responseBody && <JsonBlock title="Endpoint response" value={selectedEvent.responseBody} />}</div>}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {secretModalConfig && (
          <motion.div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeSecretReveal(); }}>
            <motion.section role="dialog" aria-modal="true" aria-labelledby="webhook-secret-title" className="w-full max-w-md rounded-xl border border-ctex-border bg-ctex-surface p-5 shadow-2xl" initial={{ y: 10 }} animate={{ y: 0 }} exit={{ y: 10 }}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs text-ctex-text-muted">Sensitive credential</p><h2 id="webhook-secret-title" className="mt-1 text-lg font-semibold text-ctex-text">Webhook signing secret</h2></div>
                <button type="button" aria-label="Close secret dialog" onClick={closeSecretReveal} className="rounded-lg p-2 text-ctex-text-muted hover:bg-ctex-elevated"><X size={17} /></button>
              </div>
              {!revealedSecret ? (
                <form onSubmit={handleRevealSecret} className="mt-4 space-y-4">
                  <p className="text-sm text-ctex-text-muted">Confirm your account password to reveal this merchant’s signing secret.</p>
                  <label className="block text-xs font-medium text-ctex-text-muted">Account password
                    <input type="password" required maxLength={256} autoComplete="current-password" value={revealPassword} onChange={(event) => setRevealPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-ctex-border bg-ctex-elevated/60 px-3 text-sm text-ctex-text outline-none focus:border-ctex-blue" />
                  </label>
                  {secretRevealError && <p role="alert" className="text-xs text-red-500">{secretRevealError}</p>}
                  <div className="flex justify-end gap-2"><button type="button" onClick={closeSecretReveal} className="rounded-lg border border-ctex-border px-3 py-2 text-xs text-ctex-text-muted">Cancel</button><button type="submit" disabled={secretRevealLoading || !revealPassword} className="rounded-lg bg-ctex-blue px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{secretRevealLoading ? "Verifying…" : "Verify and reveal"}</button></div>
                </form>
              ) : (
                <div className="mt-4 space-y-4">
                  <p className="text-xs text-amber-500">Keep this secret private. Closing this dialog clears it from the page.</p>
                  <code className="block max-h-36 overflow-auto break-all rounded-lg border border-ctex-border bg-ctex-elevated/50 p-3 font-mono text-xs text-ctex-text">{revealedSecret}</code>
                  <div className="flex justify-end gap-2"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(revealedSecret); toast.success("Signing secret copied."); } catch { toast.error("Clipboard access failed."); } }} className="inline-flex items-center gap-2 rounded-lg border border-ctex-border px-3 py-2 text-xs text-ctex-text"><Copy size={14} />Copy</button><button type="button" onClick={closeSecretReveal} className="rounded-lg bg-ctex-blue px-4 py-2 text-xs font-semibold text-white">Done</button></div>
                </div>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function Detail({ label, value }) {
  return <div className="min-w-0"><dt className="text-xs text-ctex-text-muted">{label}</dt><dd className="mt-1 break-all text-sm text-ctex-text">{value}</dd></div>;
}

function JsonBlock({ title, value }) {
  let text = value;
  if (typeof value === "object" && value !== null) text = JSON.stringify(value, null, 2);
  return <section><h3 className="mb-2 text-xs font-semibold text-ctex-text-muted">{title}</h3><pre className="max-h-64 overflow-auto rounded-lg border border-ctex-border bg-ctex-elevated/50 p-3 text-xs text-ctex-text">{text || "—"}</pre></section>;
}
