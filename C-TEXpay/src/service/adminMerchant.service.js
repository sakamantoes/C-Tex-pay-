import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { AdminAuditLog, ApiKey, BusinessProfile, Merchant, MerchantMember, MerchantWebhookConfig, Payment, User } from "../models/index.js";

const ownerFields = ["id", "firstName", "lastName", "email", "status", "createdAt"];
const merchantInclude = [
  { model: BusinessProfile, as: "businessProfile", attributes: ["businessName", "businessType", "email", "phone", "website", "country", "state", "city"] },
  { model: User, as: "owner", attributes: ownerFields },
];

export function assertMerchantStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return false;
  if (nextStatus === "SUSPENDED" && currentStatus !== "ACTIVE") {
    const error = new Error("Only active merchants can be suspended"); error.statusCode = 409; throw error;
  }
  if (nextStatus === "ACTIVE" && currentStatus !== "SUSPENDED") {
    const error = new Error("Only suspended merchants can be reactivated"); error.statusCode = 409; throw error;
  }
  return true;
}

export async function listAdminMerchants({ page = 1, limit = 20, search, status, onboardingStatus }) {
  const where = {};
  if (status) where.status = status;
  if (onboardingStatus) where.onboardingStatus = onboardingStatus;
  if (search) {
    const like = `%${search.trim()}%`;
    where[Op.or] = [
      { merchantCode: { [Op.like]: like } },
      { "$businessProfile.businessName$": { [Op.like]: like } },
      { "$owner.email$": { [Op.like]: like } },
    ];
  }
  const safeLimit = Math.min(Number(limit) || 20, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const result = await Merchant.findAndCountAll({
    where, include: merchantInclude, distinct: true, order: [["createdAt", "DESC"]],
    limit: safeLimit, offset: (safePage - 1) * safeLimit,
  });
  return { merchants: result.rows, pagination: { page: safePage, limit: safeLimit, totalItems: result.count, totalPages: Math.ceil(result.count / safeLimit) } };
}

export async function getAdminMerchant(merchantId) {
  const merchant = await Merchant.findByPk(merchantId, {
    include: [
      ...merchantInclude,
      { model: MerchantMember, as: "members", attributes: ["id", "status", "joinedAt"], include: [{ model: User, as: "user", attributes: ownerFields }] },
      { model: ApiKey, as: "apiKeys", attributes: ["id", "name", "keyPrefix", "environment", "status", "lastUsedAt", "expiresAt", "createdAt"] },
      { model: MerchantWebhookConfig, as: "webhookConfig", attributes: ["id", "url", "enabled", "description", "lastDeliveredAt", "createdAt"] },
    ],
  });
  if (!merchant) return null;
  const recentPayments = await Payment.findAll({
    where: { merchantId }, attributes: ["id", "paymentReference", "amount", "currency", "status", "paymentMethod", "createdAt", "updatedAt"],
    order: [["createdAt", "DESC"]], limit: 10,
  });
  return { ...merchant.toJSON(), recentPayments };
}

export async function setAdminMerchantStatus({ merchantId, status, reason, actorUserId }) {
  return sequelize.transaction(async (transaction) => {
    const merchant = await Merchant.findByPk(merchantId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!merchant) return null;
    const beforeStatus = merchant.status;
    if (!assertMerchantStatusTransition(beforeStatus, status)) return { merchant, changed: false };
    merchant.status = status;
    await merchant.save({ transaction });
    await AdminAuditLog.create({
      actorUserId, action: status === "SUSPENDED" ? "MERCHANT_SUSPENDED" : "MERCHANT_REACTIVATED",
      resourceType: "MERCHANT", resourceId: merchant.id, outcome: "SUCCESS", reason,
      beforeValue: { status: beforeStatus }, afterValue: { status },
    }, { transaction });
    return { merchant, changed: true };
  });
}

export async function listAdminAuditLogs({ page = 1, limit = 50, action, resourceType, resourceId }) {
  const where = {};
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;
  const safeLimit = Math.min(Number(limit) || 50, 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const result = await AdminAuditLog.findAndCountAll({
    where, include: [{ model: User, as: "actor", attributes: ownerFields }],
    order: [["createdAt", "DESC"]], limit: safeLimit, offset: (safePage - 1) * safeLimit,
  });
  return { logs: result.rows, pagination: { page: safePage, limit: safeLimit, totalItems: result.count, totalPages: Math.ceil(result.count / safeLimit) } };
}
