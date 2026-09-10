import {
  ApiKey,
  ApiKeyPermission,
  Permission,
  Merchant
} from "../models/index.js";
import sequelize from "../config/database.js";
import {
  createApiKeyWithPermissions,
  rotateApiKey as rotateApiKeyService,
  revokeApiKey as revokeApiKeyService,
  serializeApiKey,
} from "../service/apiKey.service.js";

/**
 * Create a new API key
 */
export const createApiKey = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { name, environment = "TEST", expiresAt = null, permissionKeys = [] } = req.body;

    const result = await createApiKeyWithPermissions({
      merchantId,
      name,
      environment,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      permissionKeys,
    });

    return res.status(201).json({
      success: true,
      message: "API key created successfully",
      data: {
        ...serializeApiKey(result.apiKey),
        key: result.rawKey,
        warning: "Store this API key securely. It will not be shown again.",
      },
    });
  } catch (error) {
    console.error("Create API key error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "API key conflict. Please try again.",
      });
    }

    if (error.statusCode === 400 || error.message === "One or more permissions are invalid") {
      return res.status(400).json({
        success: false,
        message: "One or more permissions are invalid",
        invalidPermissions: error.invalidPermissions || [],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create API key",
    });
  }
};

/**
 * Get all API keys for the authenticated merchant
 */
export const getApiKeys = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { status, environment } = req.query;

    const where = { merchantId };

    if (status) {
      where.status = status;
    }

    if (environment) {
      where.environment = environment;
    }

    const apiKeys = await ApiKey.findAll({
      where,
      attributes: {
        exclude: ["keyHash"],
      },
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
          attributes: ["id", "key", "name", "resource", "action"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: {
        apiKeys: apiKeys.map((apiKey) => ({
          ...serializeApiKey(apiKey),
          permissions: apiKey.permissions || [],
        })),
        count: apiKeys.length,
      },
    });
  } catch (error) {
    console.error("Get API keys error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get API keys",
    });
  }
};

/**
 * Get a single API key
 */
export const getApiKey = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const apiKeyId = req.params.id;

    const apiKey = await ApiKey.findOne({
      where: {
        id: apiKeyId,
        merchantId,
      },
      attributes: {
        exclude: ["keyHash"],
      },
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
          attributes: ["id", "key", "name", "resource", "action"],
        },
      ],
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: "API key not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        apiKey: {
          ...serializeApiKey(apiKey),
          permissions: apiKey.permissions || [],
        },
      },
    });
  } catch (error) {
    console.error("Get API key error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get API key",
    });
  }
};

/**
 * Get API key permissions
 */
export const getApiKeyPermissions = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const apiKeyId = req.params.id;

    const apiKey = await ApiKey.findOne({
      where: {
        id: apiKeyId,
        merchantId,
      },
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
          attributes: ["id", "key", "name", "resource", "action"],
        },
      ],
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: "API key not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        permissions: apiKey.permissions || [],
        count: apiKey.permissions ? apiKey.permissions.length : 0,
      },
    });
  } catch (error) {
    console.error("Get API key permissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get API key permissions",
    });
  }
};

/**
 * Add permission to API key
 */
export const addApiKeyPermission = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const apiKeyId = req.params.id;
    const permissionId = req.params.permissionId;

    // Verify API key belongs to merchant
    const apiKey = await ApiKey.findOne({
      where: {
        id: apiKeyId,
        merchantId,
      },
      transaction,
    });

    if (!apiKey) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "API key not found",
      });
    }

    // Verify permission exists
    const permission = await Permission.findByPk(permissionId, { transaction });
    if (!permission) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }

    // Check if already assigned
    const existingAssignment = await ApiKeyPermission.findOne({
      where: {
        apiKeyId,
        permissionId,
      },
      transaction,
    });

    if (existingAssignment) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "Permission is already assigned to this API key",
      });
    }

    await ApiKeyPermission.create(
      {
        apiKeyId,
        permissionId,
      },
      { transaction }
    );

    await transaction.commit();

    const updatedApiKey = await ApiKey.findByPk(apiKeyId, {
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Permission added to API key successfully",
      data: {
        apiKey: updatedApiKey,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Add API key permission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add permission to API key",
    });
  }
};

/**
 * Remove permission from API key
 */
export const removeApiKeyPermission = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const merchantId = req.merchant.id;
    const apiKeyId = req.params.id;
    const permissionId = req.params.permissionId;

    // Verify API key belongs to merchant
    const apiKey = await ApiKey.findOne({
      where: {
        id: apiKeyId,
        merchantId,
      },
      transaction,
    });

    if (!apiKey) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "API key not found",
      });
    }

    // Find the assignment
    const assignment = await ApiKeyPermission.findOne({
      where: {
        apiKeyId,
        permissionId,
      },
      transaction,
    });

    if (!assignment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Permission is not assigned to this API key",
      });
    }

    await assignment.destroy({ transaction });

    await transaction.commit();

    const updatedApiKey = await ApiKey.findByPk(apiKeyId, {
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Permission removed from API key successfully",
      data: {
        apiKey: updatedApiKey,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Remove API key permission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove permission from API key",
    });
  }
};

/**
 * Rotate API key
 */
export const rotateApiKey = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const apiKeyId = req.params.id;

    const result = await rotateApiKeyService(apiKeyId, merchantId);

    return res.status(200).json({
      success: true,
      message: "API key rotated successfully",
      data: {
        oldKeyId: result.oldKeyId,
        newApiKey: serializeApiKey(result.newApiKey),
        key: result.rawKey,
        warning: "Store this new API key securely. Your old key has been revoked.",
      },
    });
  } catch (error) {
    console.error("Rotate API key error:", error);

    if (error.message === "API key not found") {
      return res.status(404).json({
        success: false,
        message: "API key not found or already revoked",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to rotate API key",
    });
  }
};

/**
 * Revoke API key
 */
export const revokeApiKey = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const apiKeyId = req.params.id;

    const apiKey = await revokeApiKeyService(apiKeyId, merchantId);

    return res.status(200).json({
      success: true,
      message: "API key revoked successfully",
      data: {
        id: apiKey.id,
        status: apiKey.status,
        revokedAt: apiKey.revokedAt,
      },
    });
  } catch (error) {
    console.error("Revoke API key error:", error);

    if (error.message === "API key not found or already revoked") {
      return res.status(404).json({
        success: false,
        message: "API key not found or already revoked",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to revoke API key",
    });
  }
};

/**
 * Get API key usage
 */
export const getApiKeyUsage = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const apiKeyId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Verify API key belongs to merchant
    const apiKey = await ApiKey.findOne({
      where: {
        id: apiKeyId,
        merchantId,
      },
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: "API key not found",
      });
    }

    // Get usage records
    const { count, rows } = await ApiKeyUsage.findAndCountAll({
      where: {
        apiKeyId,
      },
      attributes: [
        "id",
        "requestId",
        "method",
        "endpoint",
        "statusCode",
        "ipAddress",
        "userAgent",
        "responseTime",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: {
        usage: rows,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get API key usage error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get API key usage",
    });
  }
};

/**
 * Test API key endpoint
 */
export const testApiKey = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "C-TEX PAY API key authentication successful",
    data: {
      apiKeyId: req.apiKey.id,
      merchantId: req.merchant.id,
      environment: req.apiKey.environment,
      authenticated: true,
      permissions: req.apiKey.permissions.map((p) => p.key),
    },
  });
};