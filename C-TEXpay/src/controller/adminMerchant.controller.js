import { Op } from "sequelize";
import { Customer, Merchant } from "../models/index.js";
import {
  getAdminMerchant,
  listAdminAuditLogs,
  listAdminMerchants,
  setAdminMerchantStatus,
} from "../service/adminMerchant.service.js";

/* =========================================================
 * MERCHANTS
 * ======================================================= */

export async function adminListMerchants(req, res) {
  try {
    const result = await listAdminMerchants(req.query);
    return res.json({
      success: true,
      data: result.merchants,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Admin merchant list failed", {
      requestId: req.requestId,
      errorName: error.name,
    });
    return res
      .status(500)
      .json({ success: false, message: "Unable to list merchants" });
  }
}

export async function adminGetMerchant(req, res) {
  try {
    const merchant = await getAdminMerchant(req.params.merchantId);
    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }
    return res.json({ success: true, data: merchant });
  } catch (error) {
    console.error("Admin merchant detail failed", {
      requestId: req.requestId,
      errorName: error.name,
    });
    return res
      .status(500)
      .json({ success: false, message: "Unable to retrieve merchant" });
  }
}

export async function adminSetMerchantStatus(req, res) {
  try {
    const result = await setAdminMerchantStatus({
      merchantId: req.params.merchantId,
      status: req.body.status,
      reason: req.body.reason,
      actorUserId: req.user.id,
    });
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }
    return res.json({
      success: true,
      data: { id: result.merchant.id, status: result.merchant.status },
      changed: result.changed,
    });
  } catch (error) {
    if (error.statusCode) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    console.error("Admin merchant status update failed", {
      requestId: req.requestId,
      errorName: error.name,
    });
    return res
      .status(500)
      .json({ success: false, message: "Unable to update merchant status" });
  }
}

/* =========================================================
 * MERCHANT CUSTOMERS
 * ======================================================= */

/**
 * GET /api/v1/admin/merchants/:merchantId/customers
 * Permission: customers.read_all (admin-only)
 *
 * Returns the merchant's customers with pagination and optional search.
 * The merchantId comes from the URL and is admin-controlled; no
 * cross-merchant access is possible because the WHERE clause uses it
 * as the primary scope.
 */
export async function adminListMerchantCustomers(req, res) {
  try {
    const { merchantId } = req.params;

    if (!merchantId) {
      return res
        .status(400)
        .json({ success: false, message: "merchantId is required" });
    }

    // Confirm the merchant exists so a bad id returns 404, not an empty list.
    const merchant = await Merchant.findByPk(merchantId, {
      attributes: ["id"],
    });
    if (!merchant) {
      return res
        .status(404)
        .json({ success: false, message: "Merchant not found" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    const where = { merchantId };
    if (search) {
      const term = `%${search}%`;
      where[Op.or] = [
        { firstName: { [Op.like]: term } },
        { lastName: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { customerCode: { [Op.like]: term } },
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      attributes: [
        "id",
        "customerCode",
        "firstName",
        "lastName",
        "email",
        "phone",
        "status",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit) || 0,
      },
    });
  } catch (error) {
    console.error("Admin list merchant customers failed", {
      merchantId: req.params?.merchantId,
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message,
    });
    return res
      .status(500)
      .json({ success: false, message: "Unable to load merchant customers" });
  }
}

/**
 * GET /api/v1/admin/merchants/:merchantId/customers/:customerId
 * Permission: customers.read_all
 *
 * Single-customer view for admin detail pages. Returns 404 when the
 * customer either doesn't exist OR belongs to another merchant —
 * no information is leaked either way.
 */
export async function adminGetMerchantCustomer(req, res) {
  try {
    const { merchantId, customerId } = req.params;

    if (!merchantId || !customerId) {
      return res.status(400).json({
        success: false,
        message: "merchantId and customerId are required",
      });
    }

    const customer = await Customer.findOne({
      where: { id: customerId, merchantId },
      attributes: [
        "id",
        "merchantId",
        "customerCode",
        "firstName",
        "lastName",
        "email",
        "phone",
        "status",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found for this merchant",
      });
    }

    return res.status(200).json({ success: true, data: { customer } });
  } catch (error) {
    console.error("Admin get merchant customer failed", {
      merchantId: req.params?.merchantId,
      customerId: req.params?.customerId,
      requestId: req.requestId,
      errorName: error.name,
      errorMessage: error.message,
    });
    return res
      .status(500)
      .json({ success: false, message: "Unable to load customer" });
  }
}

/* =========================================================
 * AUDIT LOGS
 * ======================================================= */

export async function adminListAuditLogs(req, res) {
  try {
    const result = await listAdminAuditLogs(req.query);
    return res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Admin audit log list failed", {
      requestId: req.requestId,
      errorName: error.name,
    });
    return res
      .status(500)
      .json({ success: false, message: "Unable to retrieve audit logs" });
  }
}