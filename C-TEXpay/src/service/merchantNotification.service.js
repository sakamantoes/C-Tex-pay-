import { Op } from "sequelize";
import {
  FeeRecord,
  Merchant,
  MerchantMember,
  MerchantNotificationDelivery,
  MerchantSetting,
  Permission,
  Role,
  User,
} from "../models/index.js";
import {
  createNotification,
  NOTIFICATION_TYPES,
} from "./notification.service.js";
import { sendMail } from "./mail.service.js";

const MAX_EMAIL_ATTEMPTS = 5;
const EMAIL_BATCH_SIZE = 20;
const EMAIL_WORKER_INTERVAL_MS = 10_000;
const PROCESSING_LEASE_MS = 2 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 6 * 60 * 60 * 1000;

let workerTimer = null;
let workerRun = null;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

/**
 * Coerce a payload field to a plain object.
 *
 * MySQL/MariaDB stores JSON columns as LONGTEXT and the driver may return
 * the value as a string. This normalizes both cases.
 */
function normalizePayload(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Coerce any input (string | number | null | undefined) to a finite integer.
 * Falls back to 0 when the value cannot be parsed.
 */
function toSafeMinor(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Format a kobo integer as a human currency string.
 * Always returns a string — never "₦NaN".
 */
function formatAmountMinor(amount, currency = "NGN") {
  const numeric = toSafeMinor(amount);
  const safeCurrency =
    typeof currency === "string" && currency.length === 3 ? currency : "NGN";

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
    }).format(numeric / 100);
  } catch {
    return `${safeCurrency} ${(numeric / 100).toFixed(2)}`;
  }
}

function formatMinorPlain(amount) {
  return (toSafeMinor(amount) / 100).toFixed(2);
}

function safeString(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function getMerchantEmailRetryAt(attemptCount, now = Date.now()) {
  const delay = Math.min(
    30_000 * 2 ** Math.max(0, attemptCount - 1),
    MAX_RETRY_DELAY_MS,
  );
  return new Date(now + delay);
}

/*
|--------------------------------------------------------------------------
| Build the notification payload snapshot
|--------------------------------------------------------------------------
*/

export async function buildPaymentSuccessPayload({
  payment,
  transaction = null,
}) {
  if (!payment) {
    throw new Error("BUILD_PAYLOAD_MISSING_PAYMENT");
  }

  if (!payment.paymentReference) {
    throw new Error(
      `BUILD_PAYLOAD_MISSING_REFERENCE (paymentId=${payment.id})`,
    );
  }

  const feeRecord = await FeeRecord.findOne({
    where: { paymentId: payment.id },
    transaction,
  });

  const amountKobo = toSafeMinor(payment.amount);
  const currency = safeString(payment.currency, "NGN");

  return {
    paymentReference: String(payment.paymentReference),
    merchantReference: payment.merchantReference || null,
    amount: amountKobo,
    currency,
    status: "SUCCESS",
    fees: feeRecord
      ? {
          currency: safeString(feeRecord.currency, currency),
          grossAmount: toSafeMinor(feeRecord.grossAmount),
          serviceFee: toSafeMinor(feeRecord.serviceFee),
          providerFee:
            feeRecord.providerFee === null ||
            feeRecord.providerFee === undefined
              ? null
              : toSafeMinor(feeRecord.providerFee),
          totalFee: toSafeMinor(feeRecord.totalFee),
          merchantNetAmount: toSafeMinor(feeRecord.merchantNetAmount),
          providerFeeTreatment: safeString(
            feeRecord.providerFeeTreatment,
            "UNKNOWN",
          ),
          calculationVersion: safeString(feeRecord.calculationVersion, "v1"),
        }
      : null,
  };
}

/*
|--------------------------------------------------------------------------
| Enqueue notifications for a successful payment
|--------------------------------------------------------------------------
*/

export async function enqueueSuccessfulPaymentNotifications({
  payment,
  transaction,
}) {
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

  if (
    !settings.notifyPaymentSuccessInApp &&
    !settings.notifyPaymentSuccessEmail
  ) {
    return { queued: false };
  }

  const merchant = await Merchant.findByPk(payment.merchantId, {
    attributes: ["id", "ownerId"],
    include: [{ model: User, as: "owner", attributes: ["id", "email"] }],
    transaction,
  });

  if (!merchant) return { queued: false };

  let payload;
  try {
    payload = await buildPaymentSuccessPayload({ payment, transaction });
  } catch (payloadError) {
    console.error(
      "Payment success payload build failed — skipping notification",
      {
        paymentId: payment?.id,
        errorName: payloadError.name,
        errorMessage: payloadError.message,
      },
    );
    return { queued: false, reason: "PAYLOAD_BUILD_FAILED" };
  }

  const displayAmount = formatAmountMinor(payload.amount, payload.currency);

  /*
  |----------------------------------------------------------------------
  | In-app notifications
  |----------------------------------------------------------------------
  */

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
        (role.permissions || []).some(
          (permission) => permission.key === "transactions.read",
        ),
      );
      if (canReadTransactions && membership.userId) {
        recipients.add(membership.userId);
      }
    }

    const feeLine = payload.fees
      ? ` Net: ${formatAmountMinor(payload.fees.merchantNetAmount, payload.currency)} (fee ${formatAmountMinor(payload.fees.totalFee, payload.currency)}).`
      : "";

    const message = `${displayAmount} received for payment ${payload.paymentReference}.${feeLine}`;

    for (const userId of recipients) {
      await createNotification({
        userId,
        type: NOTIFICATION_TYPES.TRANSACTION,
        title: "Payment received",
        message,
        data: {
          ...payload,
          merchantId: merchant.id,
          source: "payment_success",
        },
        transaction,
      });
    }
  }

  /*
  |----------------------------------------------------------------------
  | Email queue
  |----------------------------------------------------------------------
  */

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

/*
|--------------------------------------------------------------------------
| Email rendering
|--------------------------------------------------------------------------
*/

function renderFeeBreakdownRows(fees) {
  if (!fees) return "";

  const currency = escapeHtml(safeString(fees.currency, "NGN"));
  const gross = escapeHtml(formatMinorPlain(fees.grossAmount));
  const service = escapeHtml(formatMinorPlain(fees.serviceFee));
  const provider =
    fees.providerFee === null || fees.providerFee === undefined
      ? "—"
      : escapeHtml(formatMinorPlain(fees.providerFee));
  const total = escapeHtml(formatMinorPlain(fees.totalFee));
  const net = escapeHtml(formatMinorPlain(fees.merchantNetAmount));
  const treatment = escapeHtml(
    safeString(fees.providerFeeTreatment, "UNKNOWN"),
  );

  return `
    <tr>
      <td colspan="2" style="padding:16px 0 6px 0;border-top:1px solid #ecf0f1">
        <strong style="color:#17202a">Fee breakdown</strong>
      </td>
    </tr>
    <tr>
      <td style="padding:4px 16px 4px 0;color:#566573">Gross amount</td>
      <td style="color:#17202a">${currency} ${gross}</td>
    </tr>
    <tr>
      <td style="padding:4px 16px 4px 0;color:#566573">C-TEX PAY service fee</td>
      <td style="color:#17202a">${currency} ${service}</td>
    </tr>
    <tr>
      <td style="padding:4px 16px 4px 0;color:#566573">Provider fee (${treatment})</td>
      <td style="color:#17202a">${currency} ${provider}</td>
    </tr>
    <tr>
      <td style="padding:8px 16px 4px 0;border-top:1px solid #ecf0f1"><strong style="color:#17202a">Total fee</strong></td>
      <td style="padding-top:8px;border-top:1px solid #ecf0f1"><strong style="color:#17202a">${currency} ${total}</strong></td>
    </tr>
    <tr>
      <td style="padding:4px 16px 4px 0"><strong style="color:#17202a">Net to you</strong></td>
      <td><strong style="color:#16a085">${currency} ${net}</strong></td>
    </tr>
  `;
}

function renderEmail({ payload }) {
  const amount = escapeHtml(
    formatAmountMinor(payload.amount, payload.currency),
  );
  const reference = escapeHtml(safeString(payload.paymentReference, "—"));
  const merchantReference = escapeHtml(
    safeString(payload.merchantReference, "—"),
  );
  const currency = escapeHtml(safeString(payload.currency, "NGN"));
  const status = escapeHtml(safeString(payload.status, "SUCCESS"));

  const subject = `Payment received: ${safeString(
    payload.paymentReference,
    "C-TEX PAY",
  )}`;

  const feeRows = renderFeeBreakdownRows(payload.fees);

  const message = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17202a;max-width:600px">
      <h2 style="margin-bottom:8px">Payment received</h2>
      <p style="margin-top:0">
        Your C-TEX PAY merchant account received a successful payment.
      </p>

      <table style="border-collapse:collapse;margin-top:16px">
        <tr>
          <td style="padding:4px 16px 4px 0;color:#566573"><strong>Amount</strong></td>
          <td style="color:#17202a"><strong>${amount}</strong></td>
        </tr>
        <tr>
          <td style="padding:4px 16px 4px 0;color:#566573"><strong>Payment reference</strong></td>
          <td style="color:#17202a">${reference}</td>
        </tr>
        <tr>
          <td style="padding:4px 16px 4px 0;color:#566573"><strong>Merchant reference</strong></td>
          <td style="color:#17202a">${merchantReference}</td>
        </tr>
        <tr>
          <td style="padding:4px 16px 4px 0;color:#566573"><strong>Currency</strong></td>
          <td style="color:#17202a">${currency}</td>
        </tr>
        <tr>
          <td style="padding:4px 16px 4px 0;color:#566573"><strong>Status</strong></td>
          <td style="color:#17202a">${status}</td>
        </tr>
        ${feeRows}
      </table>

      <p style="margin-top:24px;font-size:12px;color:#7f8c8d">
        You received this email because payment notifications are enabled on your C-TEX PAY merchant account.
      </p>
    </div>
  `;

  return { subject, message };
}

/*
|--------------------------------------------------------------------------
| Delivery
|--------------------------------------------------------------------------
*/

async function deliverEmail(delivery) {
  const raw = delivery.payload;
  const payload = normalizePayload(raw);

  if (!payload) {
    throw new Error("EMAIL_PAYLOAD_UNPARSEABLE");
  }

  if (!payload.paymentReference) {
    throw new Error("EMAIL_PAYLOAD_MISSING_REFERENCE");
  }

  const { subject, message } = renderEmail({ payload });

  await sendMail({ to: delivery.recipientEmail, subject, message });
}

/*
|--------------------------------------------------------------------------
| Worker
|--------------------------------------------------------------------------
*/

export async function processPendingMerchantNotificationEmails({
  limit = EMAIL_BATCH_SIZE,
} = {}) {
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
    order: [
      ["nextAttemptAt", "ASC"],
      ["createdAt", "ASC"],
    ],
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
          nextAttemptAt: null, // ← now allowed by model
          lastError: null,
        },
        { where: { id: delivery.id } }, // ← no status filter
      );
      sent += 1;
    } catch (error) {
      const terminal = attemptCount >= MAX_EMAIL_ATTEMPTS;
      await MerchantNotificationDelivery.update(
        {
          status: terminal ? "FAILED" : "RETRYING",
          nextAttemptAt: terminal ? now : getMerchantEmailRetryAt(attemptCount),
          processingStartedAt: null,
          lastError: String(
            error?.message || error?.name || "EMAIL_DELIVERY_FAILED",
          ).slice(0, 500),
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
    console.log("[notification-worker] tick at", new Date().toISOString());
    workerRun = processPendingMerchantNotificationEmails()
      .then((result) => {
        console.log("[notification-worker] processed", result);
      })
      .catch((error) => {
        console.error("[notification-worker] run failed", {
          errorName: error.name,
          errorMessage: error.message,
        });
      })
      .finally(() => {
        workerRun = null;
      });
    return workerRun;
  };

  void run();
  workerTimer = setInterval(() => void run(), EMAIL_WORKER_INTERVAL_MS);
  workerTimer?.unref?.();
  console.log("[notification-worker] started");
}

export async function stopMerchantNotificationWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
  if (workerRun) await workerRun;
}
