import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { useAuthStore } from "../../store/auth.store";
import { useMerchantStore } from "../../store/merchant.store";
import { useMerchantMemberStore } from "../../store/merchantMember.store";

const navSections = [{
  title: "Workspace",
  items: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", path: "/merchant/dashboard" },
    { key: "transactions", label: "Transactions", icon: "transactions", path: "/merchant/dashboard/transactions" },
    { key: "webhooks", label: "Webhooks", icon: "webhooks", path: "/merchant/dashboard/webhooks" },
    { key: "notifications", label: "Notifications", icon: "notifications", path: "/merchant/dashboard/notifications" },
  ],
}];

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MerchantNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { businessProfile, roles } = useMerchantStore();
  const {
    notifications,
    notificationsLoading,
    notificationsError,
    getUnreadNotificationCount,
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useMerchantMemberStore();

  useEffect(() => {
    getMyNotifications();
  }, [getMyNotifications]);

  const unreadCount = getUnreadNotificationCount();
  const displayName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Merchant user";

  const handleMarkAll = async () => {
    const result = await markAllNotificationsRead();
    if (result.success) toast.success("Notifications marked as read.");
    else toast.error("Some notifications could not be marked as read.");
  };

  const handleDelete = async (notificationId) => {
    const result = await deleteNotification(notificationId);
    if (!result.success) toast.error(result.message || "Unable to delete notification.");
  };

  const handleOpenNotification = async (notification) => {
    if (!notification.readAt) {
      const result = await markNotificationRead(notification.id);
      if (!result.success) toast.error(result.message || "Unable to mark notification as read.");
    }

    if (notification.type === "TRANSACTION_UPDATE" && notification.data?.paymentReference) {
      navigate(`/merchant/dashboard/transactions?paymentReference=${encodeURIComponent(notification.data.paymentReference)}`);
    }
  };

  return (
    <DashboardLayout
      title={businessProfile?.businessName || "Merchant workspace"}
      subtitle="Notifications"
      navSections={navSections}
      profileName={displayName}
      profileRole={roles[0]?.name || "Member"}
      notificationsPath="/merchant/dashboard/notifications"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ctex-text">Notifications</h2>
          <p className="mt-1 text-sm text-ctex-text-muted">Payment events and account activity for your signed-in account.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ctex-text-muted">{unreadCount} unread</span>
          {unreadCount > 0 && <button type="button" onClick={handleMarkAll} className="inline-flex items-center gap-2 rounded-lg border border-ctex-border px-3 py-2 text-xs font-medium text-ctex-text hover:bg-ctex-elevated"><CheckCheck size={14} />Mark all read</button>}
        </div>
      </div>

      {notificationsError && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{notificationsError}</p>}

      {notificationsLoading && notifications.length === 0 ? (
        <div className="space-y-3">{[0, 1, 2].map((key) => <div key={key} className="h-20 animate-pulse rounded-xl bg-ctex-elevated" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ctex-border bg-ctex-surface p-12 text-center">
          <Bell className="mx-auto h-7 w-7 text-ctex-text-muted" />
          <p className="mt-3 text-sm font-medium text-ctex-text">No notifications yet</p>
          <p className="mt-1 text-xs text-ctex-text-muted">New payment and account updates will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ctex-border bg-ctex-surface">
          <ul className="divide-y divide-ctex-border">
            {notifications.map((notification) => {
              const unread = !notification.readAt;
              return (
                <li key={notification.id} className={`flex items-start gap-3 p-4 ${unread ? "bg-ctex-blue/5" : ""}`}>
                  <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-ctex-blue" : "bg-ctex-border"}`} />
                  <button type="button" onClick={() => handleOpenNotification(notification)} className="min-w-0 flex-1 text-left">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ctex-text">
                      {notification.title || "Notification"}
                      {unread && <span className="rounded-full bg-ctex-blue px-2 py-0.5 text-[9px] font-semibold uppercase text-white">New</span>}
                    </span>
                    {notification.message && <span className="mt-1 block text-sm text-ctex-text-muted">{notification.message}</span>}
                    <span className="mt-2 block text-[11px] text-ctex-text-muted">{formatDate(notification.createdAt)}</span>
                  </button>
                  <button type="button" onClick={() => handleDelete(notification.id)} aria-label="Delete notification" className="rounded-lg p-2 text-ctex-text-muted hover:bg-red-500/10 hover:text-red-500"><Trash2 size={15} /></button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </DashboardLayout>
  );
}
