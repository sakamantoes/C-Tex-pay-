import crypto from "crypto";
import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
  PaymentLink,
  Payment,
  Merchant,
  Customer,
  BusinessProfile
} from "../models/index.js";
import {
  createPayment,
  recoverPendingTransferInstructions,
} from "./payment.service.js";

/* =========================================================
 * ERRORS
 * ======================================================= */

export class PaymentLinkError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/* =========================================================
 * JSON COLUMN NORMALIZATION
 * ======================================================= */

export function parseInstructions(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/* =========================================================
 * SLUG GENERATION
 * ======================================================= */

function generateSlug() {
  const buf = crypto.randomBytes(9);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateUniqueSlug(transaction) {
  for (let i = 0; i < 5; i++) {
    const slug = generateSlug();
    const existing = await PaymentLink.findOne({
      where: { slug },
      transaction,
    });
    if (!existing) return slug;
  }
  throw new PaymentLinkError(
    "Unable to generate a unique slug",
    "SLUG_GENERATION_FAILED",
    500
  );
}

/* =========================================================
 * SERIALIZERS
 * ======================================================= */

export function toMerchantLink(link, extras = {}) {
  if (!link) return null;
  const d = link.toJSON ? link.toJSON() : link;
  return {
    id: d.id,
    merchantId: d.merchantId,
    title: d.title,
    description: d.description,
    slug: d.slug,
    amountType: d.amountType,
    amount: d.amount === null ? null : Number(d.amount),
    currency: d.currency,
    paymentMethod: d.paymentMethod,
    status: d.status,
    allowMultiplePayments: d.allowMultiplePayments,
    expiresAt: d.expiresAt,
    consumedAt: d.consumedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    ...extras,
  };
}

export function toPublicLink(link) {
  if (!link) return null;
  const d = link.toJSON ? link.toJSON() : link;

   const merchant = d.merchant || null;
  const businessProfile = merchant?.businessProfile || null;

  return {
    title: d.title,
    description: d.description,
    slug: d.slug,
    amountType: d.amountType,
    amount: d.amount === null ? null : Number(d.amount),
    currency: d.currency,
    status: d.status,
    expiresAt: d.expiresAt,
        businessName: businessProfile?.businessName || null,
    logoUrl: businessProfile?.logoUrl || null,
  };
}

/* =========================================================
 * PAYMENT STATS AGGREGATION
 * ======================================================= */

/**
 * Compute payment stats for a link given the list of its payments.
 * The payments array is expected to have at least:
 *   { id, status, amount, createdAt }
 */
function computePaymentStats(payments = []) {
  if (!Array.isArray(payments) || payments.length === 0) {
    return {
      total: 0,
      successful: 0,
      pending: 0,
      failed: 0,
      hasSuccessfulPayment: false,
      lastPaymentAt: null,
      lastPaymentStatus: null,
    };
  }

  const successful = payments.filter((p) => p.status === "SUCCESS").length;
  const pending = payments.filter((p) =>
    ["PENDING", "PROCESSING"].includes(p.status)
  ).length;
  const failed = payments.filter((p) =>
    ["FAILED", "EXPIRED", "CANCELLED"].includes(p.status)
  ).length;

  const sortedByRecent = [...payments].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const lastPayment = sortedByRecent[0] || null;

  return {
    total: payments.length,
    successful,
    pending,
    failed,
    hasSuccessfulPayment: successful > 0,
    lastPaymentAt: lastPayment?.createdAt || null,
    lastPaymentStatus: lastPayment?.status || null,
  };
}

/* =========================================================
 * CREATE
 * ======================================================= */

export async function createPaymentLink({
  merchantId,
  title,
  description = null,
  amountType,
  amount = null,
  allowMultiplePayments = true,
  expiresAt = null,
}) {
  if (!merchantId) {
    throw new PaymentLinkError("merchantId is required", "MERCHANT_REQUIRED", 400);
  }
  if (amountType === "FIXED" && (!amount || amount <= 0)) {
    throw new PaymentLinkError(
      "amount is required for FIXED links",
      "INVALID_AMOUNT",
      400
    );
  }

  return sequelize.transaction(async (transaction) => {
    const slug = await generateUniqueSlug(transaction);

    const link = await PaymentLink.create(
      {
        merchantId,
        title,
        description: description || null,
        slug,
        amountType,
        amount: amountType === "FIXED" ? amount : null,
        allowMultiplePayments: allowMultiplePayments !== false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: "ACTIVE",
      },
      { transaction }
    );

    return toMerchantLink(link, {
      paymentStats: computePaymentStats([]),
    });
  });
}

/* =========================================================
 * LIST / GET
 * ======================================================= */

export async function listPaymentLinks({
  merchantId,
  page = 1,
  limit = 20,
  status = null,
  search = null,
}) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const where = { merchantId };
  if (status) where.status = status;
  if (search) {
    const term = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where[Op.or] = [
      { title: { [Op.like]: term } },
      { slug: { [Op.like]: term } },
    ];
  }

  const { count, rows } = await PaymentLink.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    offset,
    include: [
      {
        model: Payment,
        as: "payments",
        attributes: ["id", "status", "amount", "createdAt"],
        required: false,
      },
    ],
    distinct: true,
  });

  const links = rows.map((link) => {
    const json = link.toJSON ? link.toJSON() : link;
    const payments = Array.isArray(json.payments) ? json.payments : [];
    const paymentStats = computePaymentStats(payments);
    // Do not leak the full payments array — only the computed stats.
    delete json.payments;
    return toMerchantLink(json, { paymentStats });
  });

  return {
    links,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: count,
      totalPages: Math.ceil(count / safeLimit) || 0,
    },
  };
}

export async function getPaymentLinkForMerchant({ merchantId, linkId }) {
  const link = await PaymentLink.findOne({
    where: { id: linkId, merchantId },
    include: [
      {
        model: Payment,
        as: "payments",
        attributes: ["id", "status", "amount", "createdAt"],
        required: false,
      },
    ],
  });
  if (!link) {
    throw new PaymentLinkError("Payment link not found", "NOT_FOUND", 404);
  }

  const json = link.toJSON ? link.toJSON() : link;
  const payments = Array.isArray(json.payments) ? json.payments : [];
  const paymentStats = computePaymentStats(payments);
  delete json.payments;

  return toMerchantLink(json, { paymentStats });
}

/* =========================================================
 * UPDATE
 * ======================================================= */

export async function updatePaymentLink({
  merchantId,
  linkId,
  updates,
}) {
  const link = await PaymentLink.findOne({
    where: { id: linkId, merchantId },
  });
  if (!link) {
    throw new PaymentLinkError("Payment link not found", "NOT_FOUND", 404);
  }

  if (link.status === "ARCHIVED" && updates.status !== "ARCHIVED") {
    throw new PaymentLinkError(
      "Archived links cannot be reactivated",
      "INVALID_STATE_TRANSITION",
      409
    );
  }

  const patch = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.amount !== undefined) {
    if (link.amountType !== "FIXED") {
      throw new PaymentLinkError(
        "Cannot set amount on a CUSTOM link",
        "INVALID_OPERATION",
        400
      );
    }
    patch.amount = updates.amount;
  }
  if (updates.allowMultiplePayments !== undefined) {
    patch.allowMultiplePayments = updates.allowMultiplePayments;
  }
  if (updates.expiresAt !== undefined) {
    patch.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
  }
  if (updates.status !== undefined) patch.status = updates.status;

  await link.update(patch);

  // Reload with payments to return consistent stats.
  const refreshed = await PaymentLink.findByPk(link.id, {
    include: [
      {
        model: Payment,
        as: "payments",
        attributes: ["id", "status", "amount", "createdAt"],
        required: false,
      },
    ],
  });

  const json = refreshed.toJSON ? refreshed.toJSON() : refreshed;
  const payments = Array.isArray(json.payments) ? json.payments : [];
  const paymentStats = computePaymentStats(payments);
  delete json.payments;

  return toMerchantLink(json, { paymentStats });
}

/* =========================================================
 * DELETE (archive)
 * ======================================================= */

export async function deactivatePaymentLink({ merchantId, linkId }) {
  const link = await PaymentLink.findOne({
    where: { id: linkId, merchantId },
  });
  if (!link) {
    throw new PaymentLinkError("Payment link not found", "NOT_FOUND", 404);
  }
  await link.update({ status: "ARCHIVED" });

  const refreshed = await PaymentLink.findByPk(link.id, {
    include: [
      {
        model: Payment,
        as: "payments",
        attributes: ["id", "status", "amount", "createdAt"],
        required: false,
      },
    ],
  });

  const json = refreshed.toJSON ? refreshed.toJSON() : refreshed;
  const payments = Array.isArray(json.payments) ? json.payments : [];
  const paymentStats = computePaymentStats(payments);
  delete json.payments;

  return toMerchantLink(json, { paymentStats });
}

/* =========================================================
 * PUBLIC FETCH
 * ======================================================= */

export async function getPublicPaymentLink({ slug }) {
  const link = await PaymentLink.findOne({
    where: { slug },
    include: [
      {
        model: Merchant,
        as: "merchant",
        attributes: ["id"],
        include: [
          {
            model: BusinessProfile,
            as: "businessProfile",
            attributes: ["businessName", "logoUrl"],
          },
        ],
      },
    ],
  });
  if (!link) {
    throw new PaymentLinkError("Payment link not found", "NOT_FOUND", 404);
  }
  return { link: toPublicLink(link), raw: link };
}

/* =========================================================
 * CHECK ACCEPTANCE
 * ======================================================= */

export function canAcceptNewPayment(link, at = new Date()) {
  if (!link) return { ok: false, reason: "NOT_FOUND" };
  if (link.status !== "ACTIVE") return { ok: false, reason: "NOT_ACTIVE" };
  if (link.expiresAt && new Date(link.expiresAt) <= at) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (!link.allowMultiplePayments && link.consumedAt) {
    return { ok: false, reason: "CONSUMED" };
  }
  return { ok: true };
}

/* =========================================================
 * PUBLIC CHECKOUT
 * ======================================================= */

export async function checkoutPublicLink({
  slug,
  amount = null,
  customer,
  idempotencyKey = null,
  requestId = null,
}) {
  const link = await PaymentLink.findOne({ where: { slug } });
  if (!link) {
    throw new PaymentLinkError("Payment link not found", "NOT_FOUND", 404);
  }

  const acceptance = canAcceptNewPayment(link);
  if (!acceptance.ok) {
    throw new PaymentLinkError(
      acceptance.reason === "EXPIRED"
        ? "This payment link has expired"
        : acceptance.reason === "CONSUMED"
          ? "This payment link has already been paid"
          : "This payment link is not active",
      acceptance.reason,
      409
    );
  }

  let finalAmount;
  if (link.amountType === "FIXED") {
    finalAmount = Number(link.amount);
  } else {
    if (!amount || amount <= 0) {
      throw new PaymentLinkError(
        "amount is required for CUSTOM links",
        "INVALID_AMOUNT",
        400
      );
    }
    finalAmount = Number(amount);
  }

  const merchantId = link.merchantId;
  const normalizedEmail = customer.email.trim().toLowerCase();

  const [customerRecord] = await Customer.findOrCreate({
    where: { merchantId, email: normalizedEmail },
    defaults: {
      merchantId,
      firstName: customer.firstName.trim(),
      lastName: customer.lastName.trim(),
      email: normalizedEmail,
      phone: customer.phone ? customer.phone.trim() : null,
      status: "ACTIVE",
      customerCode: `CUS_${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
    },
  });

  const stableIdempotencyKey =
    idempotencyKey ||
    `link-${link.id}-${customerRecord.id}-${finalAmount}`.slice(0, 255);

  let result;
  try {
    result = await createPayment({
      merchantId,
      customerId: customerRecord.id,
      amount: finalAmount,
      currency: link.currency,
      paymentMethod: link.paymentMethod,
      merchantReference: null,
      description: link.description || `Payment for ${link.title}`,
      metadata: {
        source: "payment_link",
        paymentLinkId: link.id,
        paymentLinkSlug: link.slug,
      },
      idempotencyKey: stableIdempotencyKey,
      recoverIncompleteTransfer: true,
    });
  } catch (error) {
    const mapped = new PaymentLinkError(
      error.message || "Unable to initialize payment",
      error.code || "PAYMENT_INIT_FAILED",
      error.statusCode || 502
    );
    throw mapped;
  }

  const payment = result.payment;

  if (payment.paymentLinkId !== link.id) {
    try {
      await payment.update({ paymentLinkId: link.id });
    } catch (err) {
      console.error("[payment-link] failed to associate payment", {
        paymentId: payment.id,
        linkId: link.id,
        errorName: err.name,
      });
    }
  }

  return { payment, link };
}

/* =========================================================
 * LINK CONSUMPTION
 * ======================================================= */

export async function markLinkConsumedIfNeeded({ paymentId }) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment || !payment.paymentLinkId) return { changed: false };

  const link = await PaymentLink.findByPk(payment.paymentLinkId);
  if (!link || link.allowMultiplePayments || link.consumedAt) {
    return { changed: false };
  }

  await link.update({ consumedAt: new Date() });
  return { changed: true, linkId: link.id };
}

/* =========================================================
 * PUBLIC PAYMENT STATUS
 * ======================================================= */

export async function getPublicPaymentStatus({
  slug,
  paymentReference,
}) {
  const link = await PaymentLink.findOne({ where: { slug } });
  if (!link) {
    throw new PaymentLinkError("Payment link not found", "NOT_FOUND", 404);
  }

  const payment = await Payment.findOne({
    where: { paymentReference, paymentLinkId: link.id },
  });

  if (!payment) {
    throw new PaymentLinkError("Payment not found", "NOT_FOUND", 404);
  }

  if (await recoverPendingTransferInstructions(payment)) {
    await payment.reload();
  }

  return {
    paymentReference: payment.paymentReference,
    status: payment.status,
    amount: Number(payment.amount),
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    paymentInstructions: parseInstructions(payment.paymentInstructions),
    expiresAt: payment.expiresAt,
    createdAt: payment.createdAt,
  };
}
