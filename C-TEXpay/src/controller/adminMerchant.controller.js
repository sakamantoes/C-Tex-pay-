import { getAdminMerchant, listAdminAuditLogs, listAdminMerchants, setAdminMerchantStatus } from "../service/adminMerchant.service.js";

export async function adminListMerchants(req, res) {
  try {
    const result = await listAdminMerchants(req.query);
    return res.json({ success: true, data: result.merchants, pagination: result.pagination });
  } catch (error) {
    console.error("Admin merchant list failed", { requestId: req.requestId, errorName: error.name });
    return res.status(500).json({ success: false, message: "Unable to list merchants" });
  }
}

export async function adminGetMerchant(req, res) {
  try {
    const merchant = await getAdminMerchant(req.params.merchantId);
    if (!merchant) return res.status(404).json({ success: false, message: "Merchant not found" });
    return res.json({ success: true, data: merchant });
  } catch (error) {
    console.error("Admin merchant detail failed", { requestId: req.requestId, errorName: error.name });
    return res.status(500).json({ success: false, message: "Unable to retrieve merchant" });
  }
}

export async function adminSetMerchantStatus(req, res) {
  try {
    const result = await setAdminMerchantStatus({ merchantId: req.params.merchantId, status: req.body.status, reason: req.body.reason, actorUserId: req.user.id });
    if (!result) return res.status(404).json({ success: false, message: "Merchant not found" });
    return res.json({ success: true, data: { id: result.merchant.id, status: result.merchant.status }, changed: result.changed });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    console.error("Admin merchant status update failed", { requestId: req.requestId, errorName: error.name });
    return res.status(500).json({ success: false, message: "Unable to update merchant status" });
  }
}

export async function adminListAuditLogs(req, res) {
  try {
    const result = await listAdminAuditLogs(req.query);
    return res.json({ success: true, data: result.logs, pagination: result.pagination });
  } catch (error) {
    console.error("Admin audit log list failed", { requestId: req.requestId, errorName: error.name });
    return res.status(500).json({ success: false, message: "Unable to retrieve audit logs" });
  }
}
