
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useMerchantMemberStore } from "../../store/merchantMember.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useAuthStore } from "../../store/auth.store";

const isUnread = (notification) => !notification?.readAt;

const isInvitation = (notification) =>
  notification?.type === "MERCHANT_INVITATION" &&
  Boolean(notification?.data?.invitationId);

const formatDate = (iso) => {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getNotificationLabel = (notification) => {
  if (isInvitation(notification)) return "Team invitation";
  if (notification?.type?.toLowerCase().includes("payment")) {
    return "Payment";
  }
  if (notification?.type?.toLowerCase().includes("security")) {
    return "Security";
  }
  return "Account update";
};

const getNotificationIcon = (notification) => {
  if (isInvitation(notification)) return "users";
  if (notification?.type?.toLowerCase().includes("payment")) {
    return "wallet";
  }
  if (notification?.type?.toLowerCase().includes("security")) {
    return "shield";
  }
  return "bell";
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
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    clearNotificationsError?.();
    getMyNotifications();
    // Initial load only; store actions are intentionally not dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter(isUnread).length,
    [notifications]
  );

  const invitationCount = useMemo(
    () => notifications.filter(isInvitation).length,
    [notifications]
  );

  const totalCount = notifications.length;

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      if (activeFilter === "unread" && !isUnread(notification)) return false;
      if (activeFilter === "invitations" && !isInvitation(notification)) {
        return false;
      }

      if (!query) return true;

      const searchableText = [
        notification.title,
        notification.message,
        notification.type,
        getNotificationLabel(notification),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [notifications, activeFilter, search]);

  const handleMarkAll = async () => {
    if (unreadCount === 0) return;

    try {
      await markAllNotificationsRead();
    } catch {
      toast.error("Unable to mark notifications as read.");
    }
  };

  const handleMarkRead = async (notification) => {
    if (!isUnread(notification)) return;

    try {
      await markNotificationRead(notification.id);
    } catch {
      toast.error("Unable to update this notification.");
    }
  };

  const handleAcceptInvitation = async (notification) => {
    const invitationId = notification?.data?.invitationId;

    if (!invitationId) {
      toast.error("This invitation is missing its reference.");
      return;
    }

    setAcceptingId(notification.id);

    try {
      const res = await acceptInvitationById(invitationId);

      if (!res?.success) {
        toast.error(res?.message || "Unable to accept invitation.");
        return;
      }

      try {
        await markNotificationRead(notification.id);
      } catch {
        // Invitation acceptance succeeded; a read-status failure is separate.
      }

      clearMerchant();

      try {
        await getMe();
        await getMyMembership();
      } catch {
        // Membership refresh can be retried after navigating.
      }

      toast.success("Invitation accepted. Welcome to the team!");
    } catch {
      toast.error("Something went wrong while accepting the invitation.");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDelete = async (notification) => {
    setDeletingId(notification.id);

    try {
      const res = await deleteNotification(notification.id);

      if (res?.success) {
        toast.success("Notification deleted.");
        setConfirmingDeleteId(null);
      } else {
        toast.error(res?.message || "Unable to delete notification.");
      }
    } catch {
      toast.error("Unable to delete notification.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);

    try {
      const res = await deleteAllNotifications();

      if (res?.success) {
        toast.success("All notifications deleted.");
        setConfirmingDeleteAll(false);
      } else {
        toast.error(res?.message || "Unable to delete notifications.");
      }
    } catch {
      toast.error("Unable to delete notifications.");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await getMyNotifications();
    } catch {
      toast.error("Unable to refresh notifications.");
    }
  };

  const filters = [
    { id: "all", label: "All activity", count: totalCount },
    { id: "unread", label: "Unread", count: unreadCount },
    {
      id: "invitations",
      label: "Invitations",
      count: invitationCount,
    },
  ];

  return (
    <div className="min-h-full space-y-6 pb-10">
      {/* Page heading */}
      <section className="relative overflow-hidden rounded-3xl border border-ctex-border bg-ctex-surface">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-ctex-blue/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ctex-blue/20 bg-ctex-blue/10 text-ctex-blue">
              <Icon name="bell" className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-ctex-text sm:text-3xl">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-ctex-blue/20 bg-ctex-blue/10 px-2.5 py-1 text-xs font-semibold text-ctex-blue">
                    <span className="h-1.5 w-1.5 rounded-full bg-ctex-blue" />
                    {unreadCount} new
                  </span>
                )}
              </div>

              <p className="mt-2 max-w-xl text-sm leading-6 text-ctex-text-muted">
                Keep track of team invitations, account updates, and important
                activity across your C-TEX PAY account.
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-ctex-text-muted">
                <Icon name="shield" className="h-4 w-4" />
                <span>Your account updates, all in one place.</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={notificationsLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-ctex-border bg-ctex-surface px-4 py-2.5 text-sm font-medium text-ctex-text transition hover:border-ctex-blue/40 hover:bg-ctex-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon
                name="refresh"
                className={`h-4 w-4 ${
                  notificationsLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || notificationsLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ctex-blue/20 transition hover:bg-ctex-blue-light disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              <Icon name="check-check" className="h-4 w-4" />
              Mark all read
            </button>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon="layers"
          label="Total notifications"
          value={totalCount}
          detail="All account activity"
          tone="blue"
        />
        <SummaryCard
          icon="mail"
          label="Unread"
          value={unreadCount}
          detail={unreadCount ? "Waiting for your attention" : "You're all caught up"}
          tone="amber"
        />
        <SummaryCard
          icon="users"
          label="Team invitations"
          value={invitationCount}
          detail="Collaboration and access"
          tone="violet"
        />
      </section>

      {/* Notification management panel */}
      <section className="overflow-hidden rounded-3xl border border-ctex-border bg-ctex-surface shadow-sm">
        <div className="border-b border-ctex-border p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-bold text-ctex-text">
                Your activity
              </h2>
              <p className="mt-1 text-xs text-ctex-text-muted">
                Review updates and manage your notifications.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-64">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ctex-text-muted"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search notifications..."
                  aria-label="Search notifications"
                  className="w-full rounded-xl border border-ctex-border bg-ctex-surface py-2.5 pl-9 pr-3 text-sm text-ctex-text outline-none transition placeholder:text-ctex-text-muted/70 focus:border-ctex-blue/60 focus:ring-4 focus:ring-ctex-blue/10"
                />
              </div>

              {totalCount > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteAll(true)}
                  disabled={deletingAll}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3.5 py-2.5 text-sm font-medium text-red-500 transition hover:border-red-500/40 hover:bg-red-500/5 disabled:opacity-50"
                >
                  <Icon name="trash" className="h-4 w-4" />
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-0.5">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={[
                    "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-ctex-blue text-white shadow-sm shadow-ctex-blue/20"
                      : "border border-ctex-border text-ctex-text-muted hover:bg-ctex-elevated hover:text-ctex-text",
                  ].join(" ")}
                >
                  {filter.label}
                  <span
                    className={[
                      "rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-ctex-elevated text-ctex-text-muted",
                    ].join(" ")}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Delete all confirmation */}
        <AnimatePresence initial={false}>
          {confirmingDeleteAll && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border-b border-red-500/20 bg-red-500/5 p-4 sm:px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                      <Icon name="alert" className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ctex-text">
                        Clear all notifications?
                      </p>
                      <p className="mt-1 text-xs leading-5 text-ctex-text-muted">
                        This will permanently remove all {totalCount}{" "}
                        notification{totalCount === 1 ? "" : "s"}. This action
                        cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteAll(false)}
                      disabled={deletingAll}
                      className="rounded-xl border border-ctex-border px-4 py-2.5 text-sm font-medium text-ctex-text-muted transition hover:bg-ctex-elevated disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAll}
                      disabled={deletingAll}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                    >
                      {deletingAll ? (
                        <Spinner />
                      ) : (
                        <Icon name="trash" className="h-4 w-4" />
                      )}
                      {deletingAll ? "Clearing..." : "Yes, clear all"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        {notificationsError && (
          <div
            role="alert"
            className="m-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:m-5"
          >
            <Icon
              name="alert"
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ctex-text">
                We couldn't load your updates
              </p>
              <p className="mt-1 break-words text-xs text-ctex-text-muted">
                {notificationsError}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="shrink-0 text-xs font-semibold text-ctex-blue hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Notification list */}
        {notificationsLoading && notifications.length === 0 ? (
          <div className="space-y-0 divide-y divide-ctex-border">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex gap-4 p-5">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-ctex-elevated" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-ctex-elevated" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-ctex-elevated" />
                  <div className="h-2.5 w-1/4 animate-pulse rounded bg-ctex-elevated" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            searched={Boolean(search.trim())}
            filter={activeFilter}
            hasNotifications={totalCount > 0}
            onReset={() => {
              setSearch("");
              setActiveFilter("all");
            }}
            onRefresh={handleRefresh}
          />
        ) : (
          <div className="divide-y divide-ctex-border">
            <AnimatePresence initial={false}>
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  accepting={acceptingId === notification.id}
                  confirmingDelete={
                    confirmingDeleteId === notification.id
                  }
                  deleting={deletingId === notification.id}
                  deletingAll={deletingAll}
                  onAccept={() => handleAcceptInvitation(notification)}
                  onMarkRead={() => handleMarkRead(notification)}
                  onRequestDelete={() =>
                    setConfirmingDeleteId(notification.id)
                  }
                  onCancelDelete={() => setConfirmingDeleteId(null)}
                  onDelete={() => handleDelete(notification)}
                  onDashboard={() =>
                    navigate("/user/dashboard/overview")
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* List footer */}
        {filteredNotifications.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-ctex-border bg-ctex-elevated/30 px-4 py-3 text-xs text-ctex-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>
              Showing{" "}
              <strong className="font-semibold text-ctex-text">
                {filteredNotifications.length}
              </strong>{" "}
              of{" "}
              <strong className="font-semibold text-ctex-text">
                {totalCount}
              </strong>{" "}
              notifications
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="shield" className="h-3.5 w-3.5" />
              C-TEX PAY account activity
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value, detail, tone }) {
  const tones = {
    blue: "bg-ctex-blue/10 text-ctex-blue ring-ctex-blue/10",
    amber: "bg-amber-500/10 text-amber-500 ring-amber-500/10",
    violet: "bg-violet-500/10 text-violet-500 ring-violet-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-ctex-border bg-ctex-surface p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ctex-text-muted sm:text-sm">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-ctex-text tabular-nums">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${tones[tone]}`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-ctex-text-muted">{detail}</p>
    </motion.div>
  );
}

function NotificationItem({
  notification,
  accepting,
  confirmingDelete,
  deleting,
  deletingAll,
  onAccept,
  onMarkRead,
  onRequestDelete,
  onCancelDelete,
  onDelete,
  onDashboard,
}) {
  const unread = isUnread(notification);
  const invitation = isInvitation(notification);
  const label = getNotificationLabel(notification);
  const icon = getNotificationIcon(notification);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
      transition={{ duration: 0.2 }}
      className={[
        "relative p-4 transition-colors sm:p-5",
        unread ? "bg-ctex-blue/[0.035]" : "bg-ctex-surface",
        "hover:bg-ctex-elevated/40",
      ].join(" ")}
    >
      {unread && (
        <span className="absolute bottom-0 left-0 top-0 w-[3px] bg-ctex-blue" />
      )}

      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={[
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 sm:h-12 sm:w-12",
            invitation
              ? "bg-violet-500/10 text-violet-500 ring-violet-500/15"
              : "bg-ctex-blue/10 text-ctex-blue ring-ctex-blue/15",
          ].join(" ")}
        >
          <Icon name={icon} className="h-5 w-5" />
          {unread && (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-ctex-surface bg-ctex-blue" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-ctex-elevated px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ctex-text-muted">
                  {label}
                </span>
                {unread && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ctex-blue">
                    New
                  </span>
                )}
              </div>

              <h3
                className={[
                  "break-words text-sm leading-6 text-ctex-text",
                  unread ? "font-bold" : "font-semibold",
                ].join(" ")}
              >
                {notification.title || notification.message || "Notification"}
              </h3>

              {notification.message && notification.title && (
                <p className="mt-1.5 max-w-3xl whitespace-pre-line break-words text-sm leading-6 text-ctex-text-muted">
                  {notification.message}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ctex-text-muted">
                {notification.createdAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                    {formatDate(notification.createdAt)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      unread ? "bg-ctex-blue" : "bg-ctex-border"
                    }`}
                  />
                  {unread ? "Unread" : "Previously viewed"}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
              {unread && !invitation && (
                <button
                  type="button"
                  onClick={onMarkRead}
                  title="Mark as read"
                  aria-label="Mark notification as read"
                  className="rounded-lg p-2 text-ctex-text-muted transition hover:bg-ctex-blue/10 hover:text-ctex-blue"
                >
                  <Icon name="check" className="h-4 w-4" />
                </button>
              )}

              {!confirmingDelete && (
                <button
                  type="button"
                  onClick={onRequestDelete}
                  disabled={deleting || deletingAll}
                  title="Delete notification"
                  aria-label="Delete notification"
                  className="rounded-lg p-2 text-ctex-text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {invitation && (
            <div className="mt-4 rounded-2xl border border-violet-500/15 bg-violet-500/[0.035] p-3.5 sm:p-4">
              <div className="flex items-start gap-2.5">
                <Icon
                  name="users"
                  className="mt-0.5 h-4 w-4 shrink-0 text-violet-500"
                />
                <div>
                  <p className="text-xs font-semibold text-ctex-text">
                    You're invited to collaborate
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ctex-text-muted">
                    Accept the invitation to continue with your team.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={accepting || Boolean(notification.readAt) || deletingAll}
                  onClick={onAccept}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-ctex-blue px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-ctex-blue/20 transition hover:bg-ctex-blue-light disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {accepting ? (
                    <>
                      <Spinner />
                      Accepting invitation...
                    </>
                  ) : notification.readAt ? (
                    <>
                      <Icon name="check-circle" className="h-4 w-4" />
                      Already processed
                    </>
                  ) : (
                    <>
                      Accept invitation
                      <Icon name="arrow-right" className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={deletingAll}
                  onClick={onDashboard}
                  className="rounded-xl border border-ctex-border px-4 py-2.5 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-surface hover:text-ctex-text disabled:opacity-50"
                >
                  View dashboard
                </button>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {confirmingDelete && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-ctex-text-muted">
                    Are you sure you want to delete this notification?
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={onCancelDelete}
                      disabled={deleting}
                      className="rounded-lg border border-ctex-border px-3 py-2 text-xs font-medium text-ctex-text-muted transition hover:bg-ctex-surface disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleting ? <Spinner /> : <Icon name="trash" className="h-3.5 w-3.5" />}
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyState({
  searched,
  filter,
  hasNotifications,
  onReset,
  onRefresh,
}) {
  let title = "You're all caught up";
  let description =
    "There are no new updates right now. When something needs your attention, you'll find it here.";
  let icon = "check-circle";

  if (searched) {
    title = "No matching notifications";
    description =
      "Try another search term or clear your search to see all activity.";
    icon = "search";
  } else if (filter === "unread") {
    title = "No unread notifications";
    description =
      "You've reviewed all your notifications. New updates will appear here when they arrive.";
    icon = "mail";
  } else if (filter === "invitations") {
    title = "No team invitations";
    description =
      "Team invitations will appear here when someone invites you to collaborate.";
    icon = "users";
  } else if (hasNotifications) {
    title = "No notifications match this view";
    description = "Try changing your filter to see more account activity.";
    icon = "bell";
  }

  return (
    <div className="px-5 py-16 text-center sm:px-8 sm:py-20">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-ctex-border bg-ctex-elevated text-ctex-blue">
        <Icon name={icon} className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-lg font-bold tracking-tight text-ctex-text">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ctex-text-muted">
        {description}
      </p>

      {searched || hasNotifications ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-ctex-border px-4 py-2.5 text-sm font-semibold text-ctex-text transition hover:bg-ctex-elevated"
        >
          <Icon name="filter" className="h-4 w-4" />
          Reset filters
        </button>
      ) : (
        <button
          type="button"
          onClick={onRefresh}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ctex-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ctex-blue-light"
        >
          <Icon name="refresh" className="h-4 w-4" />
          Check again
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
    />
  );
}

function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M3 9h18M16 14h2" />
        <path d="M7 5V3h10v2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
      </>
    ),
    "check-check": (
      <>
        <path d="m18 6-7 7-3-3" />
        <path d="m22 11-7 7-3-3" />
        <path d="m2 12 4 4 3-3" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6" />
        <path d="M10 10v6m4-6v6" />
      </>
    ),
    alert: (
      <>
        <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4m0 4h.01" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    "check-circle": (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    "arrow-right": (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    filter: (
      <>
        <path d="M4 7h16M7 12h10m-7 5h4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.bell}</svg>;
}
