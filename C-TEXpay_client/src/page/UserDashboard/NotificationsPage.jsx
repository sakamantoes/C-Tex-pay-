import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useMerchantMemberStore } from "../../store/merchantMember.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useAuthStore } from "../../store/auth.store";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
const isUnread = (n) => !n?.readAt;

const isInvitation = (n) =>
  n?.type === "MERCHANT_INVITATION" && n?.data?.invitationId;

const formatDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { getMe } = useAuthStore();
  const { getMyMembership, clearMerchant } = useMerchantStore();

  const {
    notifications,
    notificationsLoading,
    notificationsError,
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    acceptInvitationById,
    deleteNotification,
    deleteAllNotifications,
    clearNotificationsError,
  } = useMerchantMemberStore();

  const [acceptingId, setAcceptingId] = useState(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // 👇 Delete-all state
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    clearNotificationsError?.();
    getMyNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter(isUnread).length,
    [notifications]
  );

  const totalCount = notifications.length;

  const handleMarkAll = async () => {
    if (unreadCount === 0) return;
    await markAllNotificationsRead();
  };

  const handleAcceptInvitation = async (notification) => {
    const invitationId = notification?.data?.invitationId;
    if (!invitationId) {
      toast.error("This invitation is missing its reference.");
      return;
    }

    setAcceptingId(notification.id);
    const res = await acceptInvitationById(invitationId);

    if (!res.success) {
      setAcceptingId(null);
      toast.error(res.message || "Unable to accept invitation.");
      return;
    }

    try {
      await markNotificationRead(notification.id);
    } catch {
      /* ignore */
    }

    clearMerchant();

    try {
      await getMe();
      await getMyMembership();
    } catch {
      /* ignore */
    }

    setAcceptingId(null);
    toast.success("Invitation accepted. Welcome to the team!");
  };

  const handleDelete = async (notification) => {
    setDeletingId(notification.id);
    const res = await deleteNotification(notification.id);
    setDeletingId(null);
    setConfirmingDeleteId(null);

    if (res.success) toast.success("Notification deleted.");
    else toast.error(res.message || "Unable to delete notification.");
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    const res = await deleteAllNotifications();
    setDeletingAll(false);
    setConfirmingDeleteAll(false);

    if (res.success) toast.success("All notifications deleted.");
    else toast.error(res.message || "Unable to delete notifications.");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ctex-text">Notifications</h2>
          <p className="mt-1 text-sm text-ctex-text-muted">
            Stay up to date with your account activity.
          </p>
        </div>

        {(unreadCount > 0 || totalCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="rounded-xl border border-ctex-border bg-ctex-surface px-3 py-2 text-xs font-medium text-ctex-text-muted transition hover:border-ctex-blue/40 hover:text-ctex-blue"
              >
                Mark all as read ({unreadCount})
              </button>
            )}

            {totalCount > 0 && (
              <button
                type="button"
                onClick={() => setConfirmingDeleteAll(true)}
                disabled={deletingAll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-500 transition hover:border-red-500/60 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Delete all ({totalCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete-all confirm bar */}
      <AnimatePresence>
        {confirmingDeleteAll && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ctex-text">
                  Delete all notifications?
                </p>
                <p className="mt-0.5 text-xs text-ctex-text-muted">
                  This will permanently remove all {totalCount} notification
                  {totalCount === 1 ? "" : "s"}. It cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteAll(false)}
                  disabled={deletingAll}
                  className="rounded-xl border border-ctex-border bg-ctex-surface px-3.5 py-2 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-elevated disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingAll && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {deletingAll ? "Deleting…" : "Yes, delete all"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {notificationsError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {notificationsError}
        </div>
      )}

      {/* List */}
      {notificationsLoading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-ctex-elevated"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ctex-border bg-ctex-surface/50 px-6 py-16 text-center">
          <p className="text-sm font-medium text-ctex-text">
            No notifications yet
          </p>
          <p className="mt-1 text-xs text-ctex-text-muted">
            You&apos;ll see updates here when something happens.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {notifications.map((n) => {
              const unread = isUnread(n);
              const invitation = isInvitation(n);
              const accepting = acceptingId === n.id;
              const confirming = confirmingDeleteId === n.id;
              const deleting = deletingId === n.id;

              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                  className={[
                    "rounded-2xl border p-4 transition",
                    unread
                      ? "border-ctex-blue/30 bg-ctex-blue/5"
                      : "border-ctex-border bg-ctex-surface",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread dot */}
                    <button
                      type="button"
                      aria-label={unread ? "Mark as read" : "Already read"}
                      disabled={!unread}
                      onClick={() => unread && markNotificationRead(n.id)}
                      className={[
                        "mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
                        unread ? "cursor-pointer bg-ctex-blue" : "bg-ctex-border",
                      ].join(" ")}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={[
                            "text-sm",
                            unread
                              ? "font-semibold text-ctex-text"
                              : "font-medium text-ctex-text",
                          ].join(" ")}
                        >
                          {n.title || n.message || "Notification"}
                        </p>

                        <div className="flex flex-shrink-0 items-center gap-1">
                          {unread && (
                            <span className="rounded-full bg-ctex-blue px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                              New
                            </span>
                          )}

                          {!confirming && (
                            <button
                              type="button"
                              disabled={deleting || deletingAll}
                              onClick={() => setConfirmingDeleteId(n.id)}
                              aria-label="Delete notification"
                              className="rounded-lg p-1.5 text-ctex-text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {n.message && n.title && (
                        <p className="mt-0.5 text-xs text-ctex-text-muted">
                          {n.message}
                        </p>
                      )}

                      {n.createdAt && (
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-ctex-text-muted">
                          {formatDate(n.createdAt)}
                        </p>
                      )}

                      {/* Invitation actions */}
                      {invitation && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={
                              accepting || Boolean(n.readAt) || deletingAll
                            }
                            onClick={() => handleAcceptInvitation(n)}
                            className="inline-flex items-center gap-2 rounded-xl bg-ctex-blue px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-ctex-blue/25 transition hover:bg-ctex-blue-light disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {accepting ? (
                              <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Accepting…
                              </>
                            ) : n.readAt ? (
                              "Accepted"
                            ) : (
                              "Accept invitation"
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={deletingAll}
                            onClick={() =>
                              navigate("/user/dashboard/overview")
                            }
                            className="rounded-xl border border-ctex-border bg-ctex-surface px-3.5 py-2 text-xs font-medium text-ctex-text-muted transition hover:border-ctex-blue/40 hover:text-ctex-blue disabled:opacity-50"
                          >
                            View dashboard
                          </button>
                        </div>
                      )}

                      {/* Per-notification delete confirm */}
                      <AnimatePresence>
                        {confirming && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{
                              opacity: 1,
                              height: "auto",
                              marginTop: 12,
                            }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2">
                              <p className="text-xs text-ctex-text-muted">
                                Delete this notification?
                              </p>
                              <div className="ml-auto flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setConfirmingDeleteId(null)}
                                  disabled={deleting}
                                  className="rounded-lg border border-ctex-border bg-ctex-surface px-2.5 py-1.5 text-[11px] font-medium text-ctex-text-muted transition hover:bg-ctex-elevated disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(n)}
                                  disabled={deleting}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                                >
                                  {deleting && (
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                  )}
                                  Delete
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Icons
   -------------------------------------------------------------------------- */
function TrashIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}