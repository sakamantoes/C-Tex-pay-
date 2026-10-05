import {
  getBalanceSummary,
  listMerchantLedgerEntries,
  postAdminAdjustment,
  LedgerError,
} from "../service/ledger.service.js";

function mapError(error) {
  if (error instanceof LedgerError) {
    return { status: error.statusCode, message: error.message };
  }
  return { status: 500, message: "Internal error" };
}

/* ------------------------------------------------------
 * GET /api/v1/ledger/balance
 * ---------------------------------------------------- */
export const getMyBalance = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const summary = await getBalanceSummary({ merchantId, currency: "NGN" });
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* ------------------------------------------------------
 * GET /api/v1/ledger/entries
 * ---------------------------------------------------- */
export const listMyLedgerEntries = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const result = await listMerchantLedgerEntries({
      merchantId,
      currency: req.query.currency || "NGN",
      page: req.query.page,
      limit: req.query.limit,
      from: req.query.from,
      to: req.query.to,
      direction: req.query.direction,
      type: req.query.type,
      reference: req.query.reference,
    });
    return res.status(200).json({
      success: true,
      data: result.entries,
      meta: result.pagination,
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* ------------------------------------------------------
 * GET /api/v1/admin/ledger/merchants/:merchantId/balance
 * ---------------------------------------------------- */
export const getMerchantBalanceAdmin = async (req, res) => {
  try {
    const merchantId = req.params.merchantId;
    const summary = await getBalanceSummary({ merchantId, currency: "NGN" });
    return res.status(200).json({
      success: true,
      data: { merchantId, ...summary },
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* ------------------------------------------------------
 * POST /api/v1/admin/ledger/adjustments
 * ---------------------------------------------------- */
export const createAdminAdjustment = async (req, res) => {
  try {
    const {
      merchantId,
      currency,
      amount,
      direction,
      reason,
      adminReference,
    } = req.body;

    const result = await postAdminAdjustment({
      merchantId,
      currency,
      amount,
      direction,
      reason,
      actorUserId: req.user?.id,
      adminReference,
    });

    return res.status(201).json({
      success: true,
      message: "Adjustment posted",
      data: {
        ledgerTransactionId: result.transaction.id,
        reference: result.transaction.reference,
        created: result.created,
      },
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};