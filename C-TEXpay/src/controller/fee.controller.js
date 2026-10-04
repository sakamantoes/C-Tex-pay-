import {
  createFeeConfiguration,
  listFeeConfigurations,
  getFeeConfigurationById,
  updateFeeConfiguration,
  setFeeConfigurationStatus,
} from "../service/feeConfig.service.js";
import { resolveFeeConfiguration } from "../service/fee.service.js";

function mapError(error) {
  if (error.statusCode) {
    return { status: error.statusCode, message: error.message };
  }
  return { status: 500, message: "Internal error" };
}

export const createFeeConfig = async (req, res) => {
  try {
    const config = await createFeeConfiguration({
      ...req.body,
      createdBy: req.user?.id || null,
    });
    return res.status(201).json({
      success: true,
      message: "Fee configuration created",
      data: { config },
    });
  } catch (error) {
    console.error("Create fee config failed", {
      requestId: req.requestId,
      code: error.code,
      message: error.message,
    });
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const listFeeConfigs = async (req, res) => {
  try {
    const result = await listFeeConfigurations(req.query);
    return res.status(200).json({
      success: true,
      data: result.configs,
      meta: result.pagination,
    });
  } catch (error) {
    console.error("List fee configs failed", { requestId: req.requestId });
    return res.status(500).json({
      success: false,
      message: "Unable to list fee configurations",
    });
  }
};

export const getFeeConfig = async (req, res) => {
  try {
    const config = await getFeeConfigurationById(req.params.id);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Fee configuration not found",
      });
    }
    return res.status(200).json({ success: true, data: { config } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve fee configuration",
    });
  }
};

export const updateFeeConfig = async (req, res) => {
  try {
    const config = await updateFeeConfiguration({
      id: req.params.id,
      updates: req.body,
      updatedBy: req.user?.id || null,
    });
    return res.status(200).json({
      success: true,
      message: "Fee configuration updated",
      data: { config },
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const updateFeeConfigStatus = async (req, res) => {
  try {
    const config = await setFeeConfigurationStatus({
      id: req.params.id,
      status: req.body.status,
      updatedBy: req.user?.id || null,
    });
    return res.status(200).json({
      success: true,
      message: "Fee configuration status updated",
      data: { config },
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/**
 * Merchant-facing: what fees apply to me?
 */
export const getMyEffectiveFees = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const [transferConfig] = await Promise.all([
      resolveFeeConfiguration({
        merchantId,
        currency: "NGN",
        paymentMethod: "ACCOUNT_TRANSFER",
      }),
    ]);

    const serialize = (c) =>
      c
        ? {
            id: c.id,
            name: c.name,
            currency: c.currency,
            paymentMethod: c.paymentMethod,
            feeType: c.feeType,
            percentageRateBps: c.percentageRateBps,
            fixedAmount: Number(c.fixedAmount),
            minimumFee: Number(c.minimumFee),
            maximumFee: c.maximumFee === null ? null : Number(c.maximumFee),
            scope: c.merchantId ? "MERCHANT" : "PLATFORM",
          }
        : null;

    return res.status(200).json({
      success: true,
      data: {
        ACCOUNT_TRANSFER: serialize(transferConfig),
      },
    });
  } catch (error) {
    console.error("Effective fees lookup failed", {
      merchantId: req.merchant?.id,
      requestId: req.requestId,
    });
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve effective fees",
    });
  }
};