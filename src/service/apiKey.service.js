import crypto from "crypto";
import { ApiKey, ApiKeyPermission, Permission } from "../models/index.js";
import sequelize from "../config/database.js";

/**
 * Generate a cryptographically secure API key
 */
export function generateApiKey(environment = "TEST") {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString("hex");
  const prefix = environment === "LIVE" ? "ctex_live" : "ctex_test";
  return `${prefix}_${key}`;
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Extract prefix from API key
 */
export function getApiKeyPrefix(apiKey) {
  const parts = apiKey.split("_");
  if (parts.length >= 3) {
    return `${parts[0]}_${parts[1]}_${parts[2].substring(0, 4)}`;
  }
  return apiKey.substring(0, 20);
}

/**
 * Create a new API key with permissions
 */
export async function createApiKeyWithPermissions({
  merchantId,
  name,
  environment = "TEST",
  expiresAt = null,
  permissionKeys = [],
}) {
  const transaction = await sequelize.transaction();

  try {
    // Generate key
    const rawKey = generateApiKey(environment);
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = getApiKeyPrefix(rawKey);

    // Create API key
    const apiKey = await ApiKey.create(
      {
        merchantId,
        name,
        keyPrefix,
        keyHash,
        environment,
        status: "ACTIVE",
        expiresAt,
      },
      { transaction }
    );

    // Assign permissions if provided
    if (permissionKeys && permissionKeys.length > 0) {
      const permissions = await Permission.findAll({
        where: {
          key: permissionKeys,
        },
        transaction,
      });

      if (permissions.length > 0) {
        await apiKey.setPermissions(permissions, { transaction });
      }
    }

    await transaction.commit();

    return {
      apiKey,
      rawKey,
      permissions: permissionKeys,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Rotate an API key
 */
export async function rotateApiKey(apiKeyId, merchantId) {
  const transaction = await sequelize.transaction();

  try {
    // Find existing key
    const existingKey = await ApiKey.findOne({
      where: {
        id: apiKeyId,
        merchantId,
        status: "ACTIVE",
      },
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
        },
      ],
      transaction,
    });

    if (!existingKey) {
      throw new Error("API key not found");
    }

    // Get current permissions
    const currentPermissions = existingKey.permissions || [];

    // Generate new key
    const rawKey = generateApiKey(existingKey.environment);
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = getApiKeyPrefix(rawKey);

    // Create new API key
    const newApiKey = await ApiKey.create(
      {
        merchantId,
        name: `${existingKey.name} (Rotated)`,
        keyPrefix,
        keyHash,
        environment: existingKey.environment,
        status: "ACTIVE",
        expiresAt: existingKey.expiresAt,
      },
      { transaction }
    );

    // Copy permissions
    if (currentPermissions.length > 0) {
      await newApiKey.setPermissions(currentPermissions, { transaction });
    }

    // Revoke old key
    await existingKey.update(
      {
        status: "REVOKED",
        revokedAt: new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    return {
      oldKeyId: existingKey.id,
      newApiKey,
      rawKey,
      permissions: currentPermissions.map((p) => p.key),
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(apiKeyId, merchantId) {
  const transaction = await sequelize.transaction();

  try {
    const apiKey = await ApiKey.findOne({
      where: {
        id: apiKeyId,
        merchantId,
        status: "ACTIVE",
      },
      transaction,
    });

    if (!apiKey) {
      throw new Error("API key not found or already revoked");
    }

    await apiKey.update(
      {
        status: "REVOKED",
        revokedAt: new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    return apiKey;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Validate an API key
 */
export async function validateApiKey(rawKey) {
  try {
    // Hash the provided key
    const keyHash = hashApiKey(rawKey);

    // Find the key
    const apiKey = await ApiKey.findOne({
      where: {
        keyHash,
        status: "ACTIVE",
      },
      include: [
        {
          model: Permission,
          as: "permissions",
          through: { attributes: [] },
        },
        {
          model: Merchant,
          as: "merchant",
          where: {
            status: "ACTIVE",
          },
          required: true,
        },
      ],
    });

    if (!apiKey) {
      return { valid: false, error: "Invalid API key" };
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      // Auto-update status to expired
      await apiKey.update({ status: "EXPIRED" });
      return { valid: false, error: "API key expired" };
    }

    // Check merchant is active
    if (!apiKey.merchant || apiKey.merchant.status !== "ACTIVE") {
      return { valid: false, error: "Merchant inactive" };
    }

    // Update last used
    await apiKey.update({ lastUsedAt: new Date() });

    return {
      valid: true,
      apiKey,
      merchant: apiKey.merchant,
      permissions: apiKey.permissions || [],
    };
  } catch (error) {
    console.error("Validate API key error:", error);
    return { valid: false, error: "Validation failed" };
  }
}

/**
 * Check if API key has a specific permission
 */
export function hasPermission(apiKey, permissionKey) {
  if (!apiKey || !apiKey.permissions) return false;
  return apiKey.permissions.some((p) => p.key === permissionKey);
}