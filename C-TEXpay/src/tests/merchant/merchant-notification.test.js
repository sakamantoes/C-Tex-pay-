import test from "node:test";
import assert from "node:assert/strict";

import {
  Merchant,
  MerchantMember,
  MerchantNotificationDelivery,
  MerchantSetting,
  Notification,
} from "../../models/index.js";
import {
  enqueueSuccessfulPaymentNotifications,
  getMerchantEmailRetryAt,
} from "../../service/merchantNotification.service.js";

test("payment success in-app notifications respect assigned transaction-read access", async () => {
  const originals = {
    settingFindOrCreate: MerchantSetting.findOrCreate,
    merchantFindByPk: Merchant.findByPk,
    memberFindAll: MerchantMember.findAll,
    notificationCreate: Notification.create,
    deliveryFindOrCreate: MerchantNotificationDelivery.findOrCreate,
  };
  const notifiedUserIds = [];
  const callbacks = [];

  MerchantSetting.findOrCreate = async () => [{
    notifyPaymentSuccessInApp: true,
    notifyPaymentSuccessEmail: false,
    notificationEmail: null,
  }];
  Merchant.findByPk = async () => ({
    id: "merchant-1",
    ownerId: "owner-1",
    owner: { id: "owner-1", email: "owner@example.com" },
  });
  MerchantMember.findAll = async () => [
    { userId: "owner-1", roles: [] },
    { userId: "analyst-1", roles: [{ permissions: [{ key: "transactions.read" }] }] },
    { userId: "support-1", roles: [{ permissions: [{ key: "customers.read" }] }] },
  ];
  Notification.create = async (attributes) => {
    notifiedUserIds.push(attributes.userId);
    return { ...attributes, id: `notice-${attributes.userId}` };
  };

  try {
    await enqueueSuccessfulPaymentNotifications({
      payment: {
        id: "payment-1",
        merchantId: "merchant-1",
        paymentReference: "CTEXPAY_20261004_0123456789ABCDEF",
        merchantReference: "ORDER-1",
        amount: 200000,
        currency: "NGN",
        status: "SUCCESS",
      },
      transaction: { afterCommit: (callback) => callbacks.push(callback) },
    });

    assert.deepEqual(notifiedUserIds.sort(), ["analyst-1", "owner-1"]);
    assert.equal(callbacks.length, 2);
    assert.equal(MerchantNotificationDelivery.findOrCreate, originals.deliveryFindOrCreate);
  } finally {
    MerchantSetting.findOrCreate = originals.settingFindOrCreate;
    Merchant.findByPk = originals.merchantFindByPk;
    MerchantMember.findAll = originals.memberFindAll;
    Notification.create = originals.notificationCreate;
    MerchantNotificationDelivery.findOrCreate = originals.deliveryFindOrCreate;
  }
});

test("email preference queues an idempotent owner email delivery", async () => {
  const originalSettingFindOrCreate = MerchantSetting.findOrCreate;
  const originalMerchantFindByPk = Merchant.findByPk;
  const originalDeliveryFindOrCreate = MerchantNotificationDelivery.findOrCreate;
  let queued;

  MerchantSetting.findOrCreate = async () => [{
    notifyPaymentSuccessInApp: false,
    notifyPaymentSuccessEmail: true,
    notificationEmail: "accounts@example.com",
  }];
  Merchant.findByPk = async () => ({
    id: "merchant-1",
    ownerId: "owner-1",
    owner: { id: "owner-1", email: "owner@example.com" },
  });
  MerchantNotificationDelivery.findOrCreate = async (options) => {
    queued = options;
    return [{ id: "delivery-1" }, true];
  };

  try {
    await enqueueSuccessfulPaymentNotifications({
      payment: {
        id: "payment-email-1",
        merchantId: "merchant-1",
        paymentReference: "CTEXPAY_20261004_1123456789ABCDEF",
        merchantReference: "ORDER-EMAIL-1",
        amount: 250000,
        currency: "NGN",
        status: "SUCCESS",
      },
      transaction: {},
    });

    assert.equal(queued.where.eventKey, "payment.success:payment-email-1:email");
    assert.equal(queued.defaults.recipientEmail, "accounts@example.com");
    assert.equal(queued.defaults.status, "PENDING");
    assert.equal(queued.defaults.payload.amount, 250000);
  } finally {
    MerchantSetting.findOrCreate = originalSettingFindOrCreate;
    Merchant.findByPk = originalMerchantFindByPk;
    MerchantNotificationDelivery.findOrCreate = originalDeliveryFindOrCreate;
  }
});

test("merchant notification email retry delay is capped and exponentially increasing", () => {
  const now = Date.UTC(2026, 9, 4);
  assert.equal(getMerchantEmailRetryAt(1, now).getTime() - now, 30_000);
  assert.equal(getMerchantEmailRetryAt(2, now).getTime() - now, 60_000);
  assert.equal(getMerchantEmailRetryAt(50, now).getTime() - now, 6 * 60 * 60 * 1000);
});
