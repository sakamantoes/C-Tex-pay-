import { Op } from "sequelize";
import {
  Merchant,
  MerchantMember,
  MerchantNotificationDelivery,
  MerchantSetting,
  Permission,
  Role,
  User,
} from "../models/index.js";
import { createNotification, NOTIFICATION_TYPES } from "./notification.service.js";
import { sendMail } from "./mail.service.js";

const MAX_EMAIL_ATTEMPTS = 5;
const EMAIL_BATCH_SIZE = 20;
const EMAIL_WORKER_INTERVAL_MS = 10_000;
const PROCESSING_LEASE_MS = 2 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 6 * 60 * 60 * 1000;

let workerTimer = null;
let workerRun = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatAmountMinor(amount, currency) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount) / 100);
}

export function getMerchantEmailRetryAt(attemptCount, now = Date.now()) {
  const delay = Math.min(30_000 * 2 ** Math.max(0, attemptCount - 1), MAX_RETRY_DELAY_MS);
  return new Date(now + delay);
}

export async function enqueueSuccessfulPaymentNotifications({ payment, transaction }) {
  if (!payment || payment.status !== "SUCCESS") return { queued: false };

  const [settings] = await MerchantSetting.findOrCreate({
    where: { merchantId: payment.merchantId },
    defaults: {
      merchantId: payment.merchantId,
      notifyPaymentSuccessInApp: true,
      notifyPaymentSuccessEmail: true,
      notificationEmail: null,
    },
    transaction,
  });

  if (!settings.notifyPaymentSuccessInApp && !settings.notifyPaymentSuccessEmail) {
    return { queued: false };
  }

  const merchant = await Merchant.findByPk(payment.merchantId, {
    attributes: ["id", "ownerId"],
    include: [{ model: User, as: "owner", attributes: ["id", "email"] }],
    transaction,
  });

  if (!merchant) return { queued: false };

  const payload = {
    paymentReference: payment.paymentReference,
    merchantReference: payment.merchantReference || null,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: "SUCCESS",
  };
  const displayAmount = formatAmountMinor(payload.amount, payload.currency);

  if (settings.notifyPaymentSuccessInApp) {
    const memberships = await MerchantMember.findAll({
      where: { merchantId: merchant.id, status: "ACTIVE" },
      attributes: ["userId"],
      include: [
        {
          model: Role,
          as: "roles",
          attributes: ["id"],
          through: { attributes: [] },
          include: [
            {
              model: Permission,
              as: "permissions",
              attributes: ["key"],
              through: { attributes: [] },
            },
          ],
        },
      ],
      transaction,
    });

    const recipients = new Set(merchant.ownerId ? [merchant.ownerId] : []);
    for (const membership of memberships) {
      const canReadTransactions = (membership.roles || []).some((role) =>
        (role.permissions || []).some((permission) => permission.key === "transactions.read"),
      );
      if (canReadTransactions && membership.userId) recipients.add(membership.userId);
    }

    for (const userId of recipients) {
      await createNotification({
        userId,
        type: NOTIFICATION_TYPES.TRANSACTION,
        title: "Payment received",
        message: `${displayAmount} received for payment ${payload.paymentReference}.`,
        data: {
          ...payload,
          merchantId: merchant.id,
          source: "payment_success",
        },
        transaction,
      },
      );
    }
  }

  if (settings.notifyPaymentSuccessEmail) {
    const recipientEmail = settings.notificationEmail || merchant.owner?.email;
    if (recipientEmail) {
      await MerchantNotificationDelivery.findOrCreate({
        where: { eventKey: `payment.success:${payment.id}:email` },
        defaults: {
          merchantId: payment.merchantId,
          paymentId: payment.id,
          eventKey: `payment.success:${payment.id}:email`,
          recipientEmail,
          payload,
          status: "PENDING",
          attemptCount: 0,
          nextAttemptAt: new Date(),
        },
        transaction,
      });
    }
  }

  return { queued: true };
}

async function deliverEmail(delivery) {
  const payload = delivery.payload || {};
  const amount = escapeHtml(formatAmountMinor(payload.amount, payload.currency || "NGN"));
  const reference = escapeHtml(payload.paymentReference);
  const merchantReference = escapeHtml(payload.merchantReference || "—");
  const currency = escapeHtml(payload.currency || "NGN");
  const subject = `Payment received: ${payload.paymentReference}`;
  const message = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17202a">
      <h2>Payment received</h2>
      <p>Your C-TEX PAY merchant account received a successful payment.</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 16px 4px 0"><strong>Amount</strong></td><td>${amount}</td></tr>
        <tr><td style="padding:4px 16px 4px 0"><strong>Payment reference</strong></td><td>${reference}</td></tr>
        <tr><td style="padding:4px 16px 4px 0"><strong>Merchant reference</strong></td><td>${merchantReference}</td></tr>
        <tr><td style="padding:4px 16px 4px 0"><strong>Currency</strong></td><td>${currency}</td></tr>
      </table>
    </div>
  `;

  await sendMail({ to: delivery.recipientEmail, subject, message });
}

export async function processPendingMerchantNotificationEmails({ limit = EMAIL_BATCH_SIZE } = {}) {
  const now = new Date();
  const staleProcessingBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);
  const deliveries = await MerchantNotificationDelivery.findAll({
    where: {
      [Op.or]: [
        {
          status: { [Op.in]: ["PENDING", "RETRYING"] },
          nextAttemptAt: { [Op.lte]: now },
        },
        {
          status: "PROCESSING",
          processingStartedAt: { [Op.lte]: staleProcessingBefore },
        },
      ],
    },
    limit: Math.min(Math.max(Number(limit) || EMAIL_BATCH_SIZE, 1), 100),
    order: [["nextAttemptAt", "ASC"], ["createdAt", "ASC"]],
  });

  let sent = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    const claimWhere = { id: delivery.id, status: delivery.status };
    if (delivery.status === "PROCESSING") {
      claimWhere.processingStartedAt = { [Op.lte]: staleProcessingBefore };
    }

    const [claimed] = await MerchantNotificationDelivery.update(
      {
        status: "PROCESSING",
        attemptCount: delivery.attemptCount + 1,
        processingStartedAt: now,
        lastAttemptAt: now,
      },
      { where: claimWhere },
    );
    if (!claimed) continue;

    const attemptCount = delivery.attemptCount + 1;
    try {
      await deliverEmail(delivery);
      await MerchantNotificationDelivery.update(
        {
          status: "SENT",
          sentAt: new Date(),
          processingStartedAt: null,
          nextAttemptAt: null,
          lastError: null,
        },
        { where: { id: delivery.id, status: "PROCESSING" } },
      );
      sent += 1;
    } catch (error) {
      const terminal = attemptCount >= MAX_EMAIL_ATTEMPTS;
      await MerchantNotificationDelivery.update(
        {
          status: terminal ? "FAILED" : "RETRYING",
          nextAttemptAt: terminal ? now : getMerchantEmailRetryAt(attemptCount),
          processingStartedAt: null,
          lastError: String(error?.name || "EMAIL_DELIVERY_FAILED").slice(0, 500),
        },
        { where: { id: delivery.id, status: "PROCESSING" } },
      );
      if (terminal) failed += 1;
    }
  }

  return { processed: deliveries.length, sent, failed };
}

export function startMerchantNotificationWorker() {
  if (workerTimer) return;

  const run = () => {
    if (workerRun) return workerRun;
    workerRun = processPendingMerchantNotificationEmails()
      .catch((error) => {
        console.error("Merchant notification email worker failed", {
          errorName: error.name,
        });
      })
      .finally(() => {
        workerRun = null;
      });
    return workerRun;
  };

  void run();
  workerTimer = setInterval(() => void run(), EMAIL_WORKER_INTERVAL_MS);
  workerTimer.unref?.();
}

export async function stopMerchantNotificationWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
  if (workerRun) await workerRun;
}
