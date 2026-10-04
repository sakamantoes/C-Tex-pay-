import { Notification } from "../models/index.js";
import { emitToUser, emitToUsers } from "../realtime/socket.js";

export const NOTIFICATION_TYPES = Object.freeze({
  INVITATION: "MERCHANT_INVITATION",
  TRANSACTION: "TRANSACTION_UPDATE",
  ANNOUNCEMENT: "PLATFORM_ANNOUNCEMENT",
  SYSTEM: "SYSTEM_ALERT",
  SECURITY: "SECURITY_ALERT",
});

const serializeNotification = (n) => ({
  id: n.id,
  userId: n.userId,
  type: n.type,
  title: n.title,
  message: n.message,
  data: n.data,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

export const createNotification = async (
  { userId, type, title, message, data = null, transaction } = {},
  options = {},
) => {
  const effectiveTransaction = transaction ?? options.transaction;
  const notification = await Notification.create(
    { userId, type, title, message, data },
    { transaction: effectiveTransaction },
  );

  const dispatch = () => emitToUser(userId, "notification:new", serializeNotification(notification));

  if (effectiveTransaction) {
    effectiveTransaction.afterCommit(dispatch);
  } else {
    dispatch();
  }

  return notification;
};

export const createNotifications = (items, { transaction } = {}) => Promise.all(items.map((item) => createNotification({ ...item, transaction })));

export const notifyUsers = async ({ userIds, type, title, message, data = {}, transaction }) => {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];

  if (!uniqueUserIds.length) {
    return [];
  }

  const notifications = await createNotifications(
    uniqueUserIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      data,
    })),
    { transaction },
  );

  if (!transaction) {
    emitToUsers(uniqueUserIds, "notification:new:bulk", notifications.map(serializeNotification));
  }

  return notifications;
};

export const notifyInvitation = ({ userId, invitationId, merchantId, roleId, merchantName, transaction }) =>
  createNotification({
    userId,
    type: NOTIFICATION_TYPES.INVITATION,
    title: "Merchant invitation",
    message: `You have been invited to join ${merchantName || "a merchant"} as a team member.`,
    data: { invitationId, merchantId, roleId, source: "merchant_invitation" },
    transaction,
  });

export const notifyAnnouncement = ({ userIds, title, message, data = {}, transaction }) =>
  notifyUsers({
    userIds,
    type: NOTIFICATION_TYPES.ANNOUNCEMENT,
    title: title || "Platform announcement",
    message,
    data: { ...data, source: "announcement" },
    transaction,
  });

export const notifyTransactionEvent = ({ userIds, transactionId, status, title, message, data = {}, transaction }) =>
  notifyUsers({
    userIds,
    type: NOTIFICATION_TYPES.TRANSACTION,
    title: title || "Transaction update",
    message: message || `Transaction ${transactionId} is now ${status}.`,
    data: { ...data, transactionId, status, source: "transaction" },
    transaction,
  });

export const notifySystemAlert = ({ userIds, title, message, data = {}, transaction }) =>
  notifyUsers({
    userIds,
    type: NOTIFICATION_TYPES.SYSTEM,
    title,
    message,
    data: { ...data, source: "system" },
    transaction,
  });
