import crypto from "crypto";
import { Op } from "sequelize";

import envConfig from "../config/constant.js";
import {
  MerchantWebhookConfig,
  MerchantWebhookEvent,
  Payment,
} from "../models/index.js";

const DEFAULT_TIMEOUT_MS = Number(envConfig.MERCHANT_WEBHOOK_TIMEOUT_MS || 10000);
const DEFAULT_MAX_RETRIES = Number(envConfig.MERCHANT_WEBHOOK_MAX_RETRIES || 5);
const DEFAULT_RETRY_BASE_MS = Number(envConfig.MERCHANT_WEBHOOK_RETRY_BASE_MS || 5000);

export function generateWebhookSecret() {
  return crypto.randomBytes(32).toString("hex");
}

export function getWebhookSecretKey() {
  const secret =
    envConfig.MERCHANT_WEBHOOK_SECRET_KEY ||
    envConfig.API_KEY_ENCRYPTION_KEY ||
    envConfig.JWT_ACCESS_SECRET ||
    "change-me-in-production-please-use-a-strong-secret";

  return crypto.createHash("sha256").update(secret).digest().subarray(0, 32);
}

export function encryptWebhookSecret(secret) {
  if (!secret) return "";

  const iv = crypto.randomBytes(12);
  const key = getWebhookSecretKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(secret, "utf8")),
    cipher.final(),
  ]);

  return Buffer.concat([
    iv,
    cipher.getAuthTag(),
    encrypted,
  ]).toString("base64");
}

export function decryptWebhookSecret(encryptedSecret) {
  if (!encryptedSecret) return null;

  try {
    const buffer = Buffer.from(encryptedSecret, "base64");
    if (buffer.length < 28) {
      throw new Error("Invalid encrypted webhook secret payload");
    }

    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const ciphertext = buffer.subarray(28);
    const key = getWebhookSecretKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    console.error("Decrypt webhook secret error:", error);
    throw new Error("Unable to decrypt webhook secret");
  }
}

export function hashWebhookSecret(secret) {
  if (!secret) return null;
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function createWebhookSignature({ payload, secret }) {
  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return `sha256=${signature}`;
}

function isPrivateOrLocalHostname(hostname) {
  const host = hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) {
    return true;
  }

  if (["127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"].includes(host)) {
    return true;
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split(".").map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 169 && parts[1] === 254 || parts[0] === 192 && parts[1] === 168 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
  }

  return host === "metadata.google.internal" || host.endsWith(".internal");
}

export function validateWebhookUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Webhook URL is required");
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Webhook URL is invalid");
  }

  const hostname = parsed.hostname;
  if (isPrivateOrLocalHostname(hostname)) {
    throw new Error("Webhook URL must use HTTPS and cannot target localhost or private/internal addresses");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS and cannot target localhost or private/internal addresses");
  }

  return parsed.toString();
}

export function buildMerchantWebhookPayload({ eventId, payment }) {
  if (!eventId) {
    throw new Error("eventId is required");
  }

  if (!payment) {
    throw new Error("payment is required");
  }

  return {
    id: eventId,
    type: "payment.success",
    createdAt: new Date().toISOString(),
    data: {
      paymentReference: payment.paymentReference,
      merchantReference: payment.merchantReference || null,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
    },
  };
}

export function serializeMerchantWebhookConfig(config) {
  if (!config) return null;

  const raw = typeof config.toJSON === "function" ? config.toJSON() : config;

  return {
    id: raw.id,
    merchantId: raw.merchantId,
    url: raw.url,
    enabled: raw.enabled,
    description: raw.description || null,
    lastDeliveredAt: raw.lastDeliveredAt || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function getMerchantWebhookConfigForMerchant({ merchantId, configId }) {
  return MerchantWebhookConfig.findOne({
    where: { merchantId, id: configId },
  });
}

export async function revealMerchantWebhookSecret({ merchantId, configId }) {
  const config = await MerchantWebhookConfig.findOne({
    where: { merchantId, id: configId },
    attributes: ["id", "secretEncrypted"],
  });

  if (!config) return null;
  return decryptWebhookSecret(config.secretEncrypted);
}

export async function listMerchantWebhookConfigs(merchantId) {
  const configs = await MerchantWebhookConfig.findAll({
    where: { merchantId },
    order: [["createdAt", "DESC"]],
  });

  return configs.map((config) => serializeMerchantWebhookConfig(config));
}

export async function createMerchantWebhookConfig({ merchantId, url, description = null, enabled = true }) {
  if (!merchantId) {
    throw new Error("merchantId is required");
  }

  const existing = await MerchantWebhookConfig.findOne({
    where: { merchantId },
  });

  if (existing) {
    const error = new Error("Merchant webhook configuration already exists");
    error.statusCode = 409;
    throw error;
  }

  const normalizedUrl = validateWebhookUrl(url);
  const secret = generateWebhookSecret();

  const config = await MerchantWebhookConfig.create({
    merchantId,
    url: normalizedUrl,
    enabled,
    description,
    secretEncrypted: encryptWebhookSecret(secret),
    secretHash: hashWebhookSecret(secret),
  });

  return {
    config: serializeMerchantWebhookConfig(config),
    secret,
  };
}

export async function updateMerchantWebhookConfig({ merchantId, configId, updates = {} }) {
  const config = await MerchantWebhookConfig.findOne({
    where: { merchantId, id: configId },
  });

  if (!config) {
    const error = new Error("Merchant webhook configuration not found");
    error.statusCode = 404;
    throw error;
  }

  if (updates.url) {
    config.url = validateWebhookUrl(updates.url);
  }

  if (typeof updates.enabled === "boolean") {
    config.enabled = updates.enabled;
  }

  if (updates.description !== undefined) {
    config.description = updates.description ? String(updates.description).slice(0, 255) : null;
  }

  await config.save();
  return serializeMerchantWebhookConfig(config);
}

export async function rotateMerchantWebhookSecret({ merchantId, configId }) {
  const config = await MerchantWebhookConfig.findOne({
    where: { merchantId, id: configId },
  });

  if (!config) {
    const error = new Error("Merchant webhook configuration not found");
    error.statusCode = 404;
    throw error;
  }

  const newSecret = generateWebhookSecret();
  config.secretEncrypted = encryptWebhookSecret(newSecret);
  config.secretHash = hashWebhookSecret(newSecret);
  await config.save();

  return { config: serializeMerchantWebhookConfig(config), secret: newSecret };
}

export async function deleteMerchantWebhookConfig({ merchantId, configId }) {
  const config = await MerchantWebhookConfig.findOne({
    where: { merchantId, id: configId },
  });

  if (!config) {
    const error = new Error("Merchant webhook configuration not found");
    error.statusCode = 404;
    throw error;
  }

  await config.destroy();
  return { deleted: true };
}

export async function createMerchantWebhookEventForSuccessfulPayment({ payment, transaction = null }) {
  if (!payment || payment.status !== "SUCCESS") {
    return { created: false, reason: "NOT_SUCCESS" };
  }

  const config = await MerchantWebhookConfig.findOne({
    where: { merchantId: payment.merchantId, enabled: true },
    transaction,
  });

  if (!config) {
    return { created: false, reason: "NO_CONFIG" };
  }

  const existing = await MerchantWebhookEvent.findOne({
    where: {
      paymentId: payment.id,
      eventType: "payment.success",
    },
    transaction,
  });

  if (existing) {
    return { created: false, reason: "ALREADY_EXISTS", event: existing };
  }

  const eventId = `evt_${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
  const payload = buildMerchantWebhookPayload({ eventId, payment });

  const event = await MerchantWebhookEvent.create(
    {
      merchantId: payment.merchantId,
      paymentId: payment.id,
      configId: config.id,
      eventId,
      eventType: "payment.success",
      payload,
      status: "PENDING",
      attemptCount: 0,
      nextRetryAt: new Date(),
    },
    { transaction }
  );

  return { created: true, event, payload };
}

export function getNextRetryAt(attemptCount) {
  const exponent = Math.max(0, attemptCount - 1);
  const waitMs = DEFAULT_RETRY_BASE_MS * 2 ** exponent;
  return new Date(Date.now() + waitMs);
}

export async function processMerchantWebhookDelivery({ eventId }) {
  const event = await MerchantWebhookEvent.findOne({
    where: { eventId },
    include: [
      {
        model: MerchantWebhookConfig,
        as: "config",
      },
      {
        model: Payment,
        as: "payment",
      },
    ],
  });

  if (!event) {
    return { delivered: false, reason: "NOT_FOUND" };
  }

  if (event.status === "DELIVERED") {
    return { delivered: true, event };
  }

  if (!event.config || !event.config.enabled) {
    event.status = "FAILED";
    event.errorCode = "WEBHOOK_DISABLED";
    event.responseStatus = 0;
    await event.save();
    return { delivered: false, event, reason: "WEBHOOK_DISABLED" };
  }

  const secret = decryptWebhookSecret(event.config.secretEncrypted);
  const payload = event.payload || {};
  const body = JSON.stringify(payload);
  const signature = createWebhookSignature({ payload, secret });
  const headers = {
    "Content-Type": "application/json",
    "X-C-TEX-Signature": signature,
    "X-C-TEX-Event-ID": event.eventId,
    "User-Agent": "C-TEX-PAY/1.0",
  };

  const startedAt = Date.now();

  try {
    const response = await fetch(event.config.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    const responseBodyText = await response.text();
    const responseBody = String(responseBodyText || "").slice(0, 2000);
    event.attemptCount += 1;
    event.lastAttemptAt = new Date();
    event.responseStatus = response.status;
    event.responseBody = responseBody;

    if (response.ok) {
      event.status = "DELIVERED";
      event.deliveredAt = new Date();
      event.errorCode = null;
      event.nextRetryAt = null;
      await event.save();
      await event.config.update({ lastDeliveredAt: new Date() });
      return { delivered: true, event, durationMs: Date.now() - startedAt };
    }

    const retryableStatuses = new Set([429, 500, 502, 503, 504]);
    const shouldRetry = retryableStatuses.has(response.status) && event.attemptCount < DEFAULT_MAX_RETRIES;

    if (shouldRetry) {
      event.status = "RETRYING";
      event.errorCode = `HTTP_${response.status}`;
      event.nextRetryAt = getNextRetryAt(event.attemptCount);
      await event.save();
      return { delivered: false, event, retryScheduled: true, durationMs: Date.now() - startedAt };
    }

    event.status = "FAILED";
    event.errorCode = `HTTP_${response.status}`;
    event.nextRetryAt = null;
    await event.save();
    return { delivered: false, event, status: "FAILED", durationMs: Date.now() - startedAt };
  } catch (error) {
    event.attemptCount += 1;
    event.lastAttemptAt = new Date();
    event.responseBody = String(error?.message || "Request failed").slice(0, 2000);

    const shouldRetry = event.attemptCount < DEFAULT_MAX_RETRIES;

    if (shouldRetry) {
      event.status = "RETRYING";
      event.errorCode = "NETWORK_ERROR";
      event.nextRetryAt = getNextRetryAt(event.attemptCount);
      await event.save();
      return { delivered: false, event, retryScheduled: true, durationMs: Date.now() - startedAt };
    }

    event.status = "FAILED";
    event.errorCode = "NETWORK_ERROR";
    event.nextRetryAt = null;
    await event.save();
    return { delivered: false, event, status: "FAILED", durationMs: Date.now() - startedAt };
  }
}

export async function processPendingMerchantWebhookEvents(limit = 20) {
  const cutoff = new Date();

  const events = await MerchantWebhookEvent.findAll({
    where: {
      status: {
        [Op.in]: ["PENDING", "RETRYING"],
      },
      [Op.or]: [
        { nextRetryAt: null },
        { nextRetryAt: { [Op.lte]: cutoff } },
      ],
    },
    include: [{ model: MerchantWebhookConfig, as: "config" }],
    limit,
    order: [["nextRetryAt", "ASC"], ["createdAt", "ASC"]],
  });

  const results = [];
  for (const event of events) {
    const result = await processMerchantWebhookDelivery({ eventId: event.eventId });
    results.push(result);
  }

  return results;
}

export async function getMerchantWebhookEvent({ merchantId, eventId }) {
  return MerchantWebhookEvent.findOne({
    where: { merchantId, eventId },
    include: [
      {
        model: MerchantWebhookConfig,
        as: "config",
        attributes: { exclude: ["secretEncrypted", "secretHash"] },
      },
    ],
  });
}

export async function listMerchantWebhookEvents({
  merchantId,
  paymentId = null,
  page = 1,
  limit = 20,
}) {
  const where = { merchantId };

  if (paymentId) {
    where.paymentId = paymentId;
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await MerchantWebhookEvent.findAndCountAll({
    where,
    attributes: [
      "id",
      "eventId",
      "eventType",
      "status",
      "attemptCount",
      "lastAttemptAt",
      "nextRetryAt",
      "responseStatus",
      "errorCode",
      "deliveredAt",
      "createdAt",
      "updatedAt",
    ],
    include: [
      {
        model: MerchantWebhookConfig,
        as: "config",
        attributes: ["id", "url", "enabled", "description"],
      },
    ],
    distinct: true,
    order: [["createdAt", "DESC"], ["id", "ASC"]],
    limit,
    offset,
  });

  return {
    events: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}
