import {
  getMerchantSettings,
  updateMerchantSettings,
} from "../service/merchantSetting.service.js";

export const getMerchantSettingsController = async (req, res) => {
  try {
    const settings = await getMerchantSettings({ merchantId: req.merchant.id });
    return res.status(200).json({ success: true, data: { settings } });
  } catch (error) {
    console.error("Get merchant settings failed", {
      merchantId: req.merchant?.id,
      requestId: req.requestId,
      errorName: error.name,
    });
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve merchant settings",
    });
  }
};

export const updateMerchantSettingsController = async (req, res) => {
  try {
    const settings = await updateMerchantSettings({
      merchantId: req.merchant.id,
      updates: req.body,
    });
    return res.status(200).json({
      success: true,
      message: "Merchant settings updated",
      data: { settings },
    });
  } catch (error) {
    console.error("Update merchant settings failed", {
      merchantId: req.merchant?.id,
      requestId: req.requestId,
      errorName: error.name,
    });
    return res.status(500).json({
      success: false,
      message: "Unable to update merchant settings",
    });
  }
};
