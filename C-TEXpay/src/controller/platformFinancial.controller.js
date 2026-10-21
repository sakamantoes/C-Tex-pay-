import { z } from "zod";
import {
  getPlatformFinancialPayment,
  getPlatformFinancialSummary,
  listPlatformFinancialPayments,
  reconcilePlatformPaymentSettlement,
} from "../service/platformFinancialReport.service.js";
import {
  calculateWithdrawalCharges,
  getWithdrawalFeeTiers,
  resetWithdrawalFeeTiers,
  updateWithdrawalFeeTiers,
} from "../service/withdrawalFee.service.js";

const uuid = z.string().uuid();
const reportQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  provider: z.enum(["MONNIFY", "XIXAPAY"]).optional(),
  merchantId: uuid.optional(),
  settlementStatus: z.enum(["PENDING", "REPORTED", "CONFIRMED", "DISCREPANCY", "UNAVAILABLE"]).optional(),
}).strict();

function validateQuery(query, res) {
  const parsed = reportQuery.safeParse(query);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid financial report filters", fields: parsed.error.flatten().fieldErrors });
    return null;
  }
  if (parsed.data.dateFrom && parsed.data.dateTo && new Date(parsed.data.dateFrom) > new Date(parsed.data.dateTo)) {
    res.status(400).json({ success: false, message: "dateFrom must be before dateTo" });
    return null;
  }
  return parsed.data;
}

export async function platformFinancialSummary(req, res) {
  const filters = validateQuery(req.query, res);
  if (!filters) return;
  try {
    return res.json({ success: true, data: await getPlatformFinancialSummary(filters) });
  } catch (error) {
    console.error("Platform financial summary failed", { requestId: req.requestId, errorName: error.name });
    return res.status(500).json({ success: false, message: "Unable to load financial summary" });
  }
}

export async function platformFinancialPayments(req, res) {
  const filters = validateQuery(req.query, res);
  if (!filters) return;
  try {
    const result = await listPlatformFinancialPayments(filters);
    return res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    console.error("Platform financial payments failed", { requestId: req.requestId, errorName: error.name });
    return res.status(500).json({ success: false, message: "Unable to load financial payment records" });
  }
}

export async function platformFinancialPaymentDetail(req, res) {
  try {
    const record = await getPlatformFinancialPayment(req.params.paymentReference);
    if (!record) return res.status(404).json({ success: false, message: "Successful payment financial record not found" });
    return res.json({ success: true, data: record });
  } catch (error) {
    console.error("Platform financial detail failed", { requestId: req.requestId, errorName: error.name });
    return res.status(500).json({ success: false, message: "Unable to load payment financial details" });
  }
}

export async function reconcilePlatformPaymentSettlementController(req, res) {
  const parsed = z.object({
    actualSettlementAmount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    actualProviderFee: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional().nullable(),
    reason: z.string().trim().min(8).max(500),
  }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid settlement reconciliation input", fields: parsed.error.flatten().fieldErrors });
  try {
    const record = await reconcilePlatformPaymentSettlement({
      paymentReference: req.params.paymentReference,
      actorUserId: req.user.id,
      ...parsed.data,
    });
    return res.json({ success: true, message: "Settlement reconciliation recorded", data: record });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to record settlement reconciliation" });
  }
}

export async function getWithdrawalFeesController(req, res) {
  try {
    return res.json({ success: true, data: await getWithdrawalFeeTiers() });
  } catch (error) {
    console.error("Withdrawal fee tier read failed", { requestId: req.requestId, errorName: error.name });
    return res.status(503).json({ success: false, message: "Withdrawal fee configuration is unavailable" });
  }
}

export async function previewWithdrawalFeeController(req, res) {
  const parsed = z.object({
    amount: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    feeMode: z.enum(["FEE_ON_TOP", "DEDUCT_FROM_AMOUNT"]).default("FEE_ON_TOP"),
  }).strict().safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid withdrawal fee preview request" });
  try {
    const data = await calculateWithdrawalCharges(parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to calculate withdrawal charge" });
  }
}

const updateSchema = z.object({
  reason: z.string().trim().min(8).max(500),
  fees: z.array(z.object({
    tierKey: z.enum(["UNDER_10000", "FROM_10000_TO_50000", "FROM_50000"]),
    feeAmount: z.number().int().min(0).max(100_000_000),
  }).strict()).length(3),
}).strict();

export async function updateWithdrawalFeesController(req, res) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid withdrawal fee configuration", fields: parsed.error.flatten().fieldErrors });
  try {
    const tiers = await updateWithdrawalFeeTiers({ ...parsed.data, updatedBy: req.user.id });
    return res.json({ success: true, message: "Withdrawal charges updated", data: tiers });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to update withdrawal charges" });
  }
}

const resetSchema = z.object({ reason: z.string().trim().min(8).max(500) }).strict();
export async function resetWithdrawalFeesController(req, res) {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "A change reason of at least 8 characters is required" });
  try {
    const tiers = await resetWithdrawalFeeTiers({ ...parsed.data, updatedBy: req.user.id });
    return res.json({ success: true, message: "Default withdrawal charges restored", data: tiers });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to restore withdrawal charges" });
  }
}
