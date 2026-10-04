import { MerchantSetting } from "../models/index.js";

const DEFAULT_SETTINGS = {
  notifyPaymentSuccessInApp: true,
  notifyPaymentSuccessEmail: true,
  notificationEmail: null,
};

function serializeSettings(settings) {
  return {
    notifyPaymentSuccessInApp: settings.notifyPaymentSuccessInApp,
    notifyPaymentSuccessEmail: settings.notifyPaymentSuccessEmail,
    notificationEmail: settings.notificationEmail || null,
    updatedAt: settings.updatedAt,
  };
}

export async function getMerchantSettings({ merchantId }) {
  const [settings] = await MerchantSetting.findOrCreate({
    where: { merchantId },
    defaults: { merchantId, ...DEFAULT_SETTINGS },
  });

  return serializeSettings(settings);
}

export async function updateMerchantSettings({ merchantId, updates }) {
  const [settings] = await MerchantSetting.findOrCreate({
    where: { merchantId },
    defaults: { merchantId, ...DEFAULT_SETTINGS },
  });

  for (const field of Object.keys(DEFAULT_SETTINGS)) {
    if (updates[field] !== undefined) settings[field] = updates[field];
  }

  await settings.save();
  return serializeSettings(settings);
}
