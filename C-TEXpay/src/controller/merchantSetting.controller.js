import {
  getMerchantSettings,
  updateMerchantSettings,
  updateMerchantRedirectUrls,
  MerchantSettingError,
} from "../service/merchantSetting.service.js";

/*
|--------------------------------------------------------------------------
| Error mapping
|--------------------------------------------------------------------------
| The service can throw MerchantSettingError (explicit, mapped) or any
| other error (unexpected). Only MerchantSettingError is exposed.
*/

function mapError(error) {
  if (error instanceof MerchantSettingError) {
    return { status: error.statusCode, message: error.message };
  }
  if (error.statusCode) {
    return { status: error.statusCode, message: error.message };
  }
  return { status: 500, message: "Unable to process merchant settings" };
}

/*
|--------------------------------------------------------------------------
| GET /api/v1/merchant-settings
|--------------------------------------------------------------------------
| Permission: settings.read
|
| Returns the full merchant setting, including the notification flags
| and the redirect URL fields.
*/

export const getSettings = async (req, res) => {
  try {
    const settings = await getMerchantSettings({
      merchantId: req.merchant.id,
    });

    return res.status(200).json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error("Get merchant settings failed", {
      merchantId: req.merchant?.id,
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message,
    });

    const { status, message } = mapError(error);
    return res.status(status).json({
      success: false,
      message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/v1/merchant-settings
|--------------------------------------------------------------------------
| Permission: settings.update
|
| Accepts a partial update across all setting fields:
|   - notifyPaymentSuccessInApp (boolean)
|   - notifyPaymentSuccessEmail (boolean)
|   - notificationEmail (string | null)
|   - successRedirectUrl (string | null)
|   - failureRedirectUrl (string | null)
|   - cancelRedirectUrl (string | null)
|
| Only the fields present in the body are updated.
| Redirect URL fields are validated against validateMerchantUrl().
*/

export const updateSettings = async (req, res) => {
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
      errorMessage: error.message,
    });

    const { status, message } = mapError(error);
    return res.status(status).json({
      success: false,
      message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/v1/merchant-settings/urls
|--------------------------------------------------------------------------
| Permission: settings.update
|
| Focused endpoint for redirect URLs only. Kept so the dashboard can
| update URLs without resending notification flags (avoids accidental
| overwrites). Internally calls the same service function as
| updateSettings, scoped to URL fields.
*/

export const updateUrls = async (req, res) => {
  try {
    const settings = await updateMerchantRedirectUrls({
      merchantId: req.merchant.id,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "URL settings updated",
      data: { settings },
    });
  } catch (error) {
    console.error("Update merchant URL settings failed", {
      merchantId: req.merchant?.id,
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message,
    });

    const { status, message } = mapError(error);
    return res.status(status).json({
      success: false,
      message,
    });
  }
};