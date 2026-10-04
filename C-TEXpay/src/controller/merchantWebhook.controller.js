import bcrypt from "bcryptjs";
import {
  createMerchantWebhookConfig,
  deleteMerchantWebhookConfig,
  getMerchantWebhookConfigForMerchant,
  listMerchantWebhookConfigs,
  rotateMerchantWebhookSecret,
  updateMerchantWebhookConfig,
  listMerchantWebhookEvents,
  getMerchantWebhookEvent,
  revealMerchantWebhookSecret,
} from "../service/merchantWebhook.service.js";

export const createMerchantWebhook = async (req, res) => {
  try {
    const result = await createMerchantWebhookConfig({
      merchantId: req.merchant.id,
      url: req.body.url,
      description: req.body.description,
      enabled: req.body.enabled ?? true,
    });

    return res.status(201).json({
      success: true,
      message: "Merchant webhook configuration created",
      data: {
        config: result.config,
        secret: result.secret,
        warning: "Store this secret securely. It will not be returned again.",
      },
    });
  } catch (error) {
    console.error("Create merchant webhook error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create merchant webhook configuration",
    });
  }
};

export const listMerchantWebhooks = async (req, res) => {
  try {
    const configs = await listMerchantWebhookConfigs(req.merchant.id);
    return res.status(200).json({
      success: true,
      data: {
        configs,
        count: configs.length,
      },
    });
  } catch (error) {
    console.error("List merchant webhooks error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list merchant webhooks",
    });
  }
};

export const getMerchantWebhook = async (req, res) => {
  try {
    const config = await getMerchantWebhookConfigForMerchant({
      merchantId: req.merchant.id,
      configId: req.params.id,
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Merchant webhook configuration not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        config: {
          id: config.id,
          merchantId: config.merchantId,
          url: config.url,
          enabled: config.enabled,
          description: config.description || null,
          lastDeliveredAt: config.lastDeliveredAt || null,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Get merchant webhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch merchant webhook",
    });
  }
};

export const updateMerchantWebhook = async (req, res) => {
  try {
    const config = await updateMerchantWebhookConfig({
      merchantId: req.merchant.id,
      configId: req.params.id,
      updates: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Merchant webhook configuration updated",
      data: {
        config,
      },
    });
  } catch (error) {
    console.error("Update merchant webhook error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update merchant webhook configuration",
    });
  }
};

export const rotateMerchantWebhookSecretController = async (req, res) => {
  try {
    const result = await rotateMerchantWebhookSecret({
      merchantId: req.merchant.id,
      configId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      message: "Merchant webhook secret rotated successfully",
      data: {
        config: result.config,
        secret: result.secret,
        warning: "Store the rotated secret securely. It will not be returned again.",
      },
    });
  } catch (error) {
    console.error("Rotate merchant webhook secret error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to rotate merchant webhook secret",
    });
  }
};

export const revealMerchantWebhookSecretController = async (req, res) => {
  try {
    const passwordMatches = await bcrypt.compare(req.body.password, req.user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    const secret = await revealMerchantWebhookSecret({
      merchantId: req.merchant.id,
      configId: req.params.id,
    });

    if (!secret) {
      return res.status(404).json({
        success: false,
        message: "Merchant webhook configuration not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { secret },
    });
  } catch (error) {
    console.error("Reveal merchant webhook secret failed", {
      merchantId: req.merchant?.id,
      webhookId: req.params?.id,
      requestId: req.requestId,
      errorName: error.name,
    });
    return res.status(500).json({
      success: false,
      message: "Unable to reveal webhook secret",
    });
  }
};

export const deleteMerchantWebhook = async (req, res) => {
  try {
    await deleteMerchantWebhookConfig({
      merchantId: req.merchant.id,
      configId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      message: "Merchant webhook configuration deleted",
    });
  } catch (error) {
    console.error("Delete merchant webhook error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete merchant webhook configuration",
    });
  }
};

export const listMerchantWebhookEventsController = async (req, res) => {
  try {
    const events = await listMerchantWebhookEvents({
      merchantId: req.merchant.id,
      paymentId: req.query.paymentId || null,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: {
        events: events.events,
        count: events.pagination.total,
        pagination: events.pagination,
      },
    });
  } catch (error) {
    console.error("List merchant webhook events error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list merchant webhook events",
    });
  }
};

export const getMerchantWebhookEventController = async (req, res) => {
  try {
    const event = await getMerchantWebhookEvent({
      merchantId: req.merchant.id,
      eventId: req.params.id,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Merchant webhook event not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        event,
      },
    });
  } catch (error) {
    console.error("Get merchant webhook event error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch merchant webhook event",
    });
  }
};
