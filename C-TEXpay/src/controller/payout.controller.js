import {
  createPayout,
  validateBankAccount,
  getPayoutForMerchant,
  listPayoutsForMerchant,
  listAllPayouts,
  refreshPayoutFromProvider,
  reversePayout,
  PayoutError,
  quotePayout,
  authorizePayout,
  listPayoutBanks,
} from "../service/payout.service.js";

function mapError(error) {
  if (error instanceof PayoutError) {
    return { status: error.statusCode, message: error.message };
  }
  if (error.statusCode) {
    return { status: error.statusCode, message: error.message };
  }
  return { status: 500, message: "Internal error" };
}

function toPublicPayout(payout) {
  if (!payout) return null;
  const d = payout.toJSON ? payout.toJSON() : payout;
  return {
    id: d.id,
    amount: Number(d.amount),
    feeMode: d.feeMode,
    feeAmount: Number(d.feeAmount || 0),
    providerFeeReported: d.providerFeeReported == null ? null : Number(d.providerFeeReported),
    walletDebitAmount: Number(d.walletDebitAmount ?? d.amount),
    beneficiaryAmount: Number(d.beneficiaryAmount ?? d.amount),
    currency: d.currency,
    bankCode: d.bankCode,
    bankName: d.bankName || d.providerMetadata?.beneficiaryBankName || d.providerMetadata?.submission?.destinationBankName || null,
    authorizationRequired: d.providerStatus === "PENDING_AUTHORIZATION",
    accountNumber: (d.accountNumberLast4 || (String(d.accountNumber || "").startsWith("enc:") ? "" : d.accountNumber?.slice(-4)))
      ? `••••${d.accountNumberLast4 || d.accountNumber.slice(-4)}`
      : null,
    accountName: d.accountName,
    narration: d.narration,
    merchantReference: d.merchantReference,
    status: d.status,
    failureCode: d.failureCode,
    failureReason: d.failureReason,
    initiatedAt: d.initiatedAt,
    processingAt: d.processingAt,
    completedAt: d.completedAt,
    failedAt: d.failedAt,
    reversedAt: d.reversedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function toAdminPayout(payout) {
  if (!payout) return null;
  const d = payout.toJSON ? payout.toJSON() : payout;
  return {
    ...toPublicPayout(payout),
    merchantId: d.merchantId,
    provider: d.provider,
    providerReference: d.providerReference,
    providerStatus: d.providerStatus,
    reserveLedgerTransactionId: d.reserveLedgerTransactionId,
    settleLedgerTransactionId: d.settleLedgerTransactionId,
  };
}

/* POST /api/v1/payouts */
export const createPayoutController = async (req, res) => {
  try {
    const idempotencyKey = req.headers["idempotency-key"];
    const merchantId = req.merchant.id;

    const result = await createPayout({
      merchantId,
      amount: req.body.amount,
      currency: req.body.currency,
      bankCode: req.body.bankCode,
      accountNumber: req.body.accountNumber,
      accountName: req.body.accountName,
      narration: req.body.narration,
      merchantReference: req.body.merchantReference,
      idempotencyKey,
      metadata: req.body.metadata,
      feeMode: req.body.feeMode,
    });

    const status = result.replayed ? 200 : 201;
    const message = result.replayed
      ? "Payout already initiated (idempotent replay)"
      : "Payout initiated";

    if (result.providerError) {
      return res.status(202).json({
        success: true,
        message:
          "Payout recorded — provider response pending reconciliation",
        data: toPublicPayout(result.payout),
      });
    }

    return res.status(status).json({
      success: true,
      message,
      data: toPublicPayout(result.payout),
    });
  } catch (error) {
    const { status, message } = mapError(error);
    console.error("Create payout failed", {
      merchantId: req.merchant?.id,
      errorCode: error.code,
      message: error.message,
    });
    return res.status(status).json({ success: false, message });
  }
};

export const quotePayoutController = async (req, res) => {
  try {
    const data = await quotePayout({
      merchantId: req.merchant.id,
      amount: req.body.amount,
      currency: req.body.currency,
      feeMode: req.body.feeMode,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const authorizePayoutController = async (req, res) => {
  try {
    const payout = await authorizePayout({
      merchantId: req.merchant.id,
      payoutId: req.params.id,
      authorizationCode: req.body.authorizationCode,
    });
    return res.status(200).json({ success: true, data: toPublicPayout(payout) });
  } catch (error) {
    const { status, message } = mapError(error);
    console.error("Payout authorization failed", {
      merchantId: req.merchant?.id,
      payoutId: req.params.id,
      errorCode: error.code,
      statusCode: status,
    });
    return res.status(status).json({ success: false, message });
  }
};

/* POST /api/v1/payouts/validate-bank-account */
export const validateBankAccountController = async (req, res) => {
  try {
    const result = await validateBankAccount({
      bankCode: req.body.bankCode,
      accountNumber: req.body.accountNumber,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const listPayoutBanksController = async (req, res) => {
  try {
    const banks = await listPayoutBanks();
    return res.status(200).json({ success: true, data: banks });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* GET /api/v1/payouts */
export const listMyPayouts = async (req, res) => {
  try {
    const result = await listPayoutsForMerchant({
      merchantId: req.merchant.id,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.status(200).json({
      success: true,
      data: result.payouts.map(toPublicPayout),
      meta: result.pagination,
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* GET /api/v1/payouts/:id */
export const getMyPayout = async (req, res) => {
  try {
    const payout = await getPayoutForMerchant({
      merchantId: req.merchant.id,
      payoutId: req.params.id,
    });
    if (!payout) {
      return res
        .status(404)
        .json({ success: false, message: "Payout not found" });
    }
    return res.status(200).json({ success: true, data: toPublicPayout(payout) });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* GET /api/v1/admin/payouts */
export const adminListPayouts = async (req, res) => {
  try {
    const result = await listAllPayouts({
      merchantId: req.query.merchantId,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.status(200).json({
      success: true,
      data: result.payouts.map(toAdminPayout),
      meta: result.pagination,
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* GET /api/v1/admin/payouts/:id */
export const adminGetPayout = async (req, res) => {
  try {
    const payout = await getPayoutForMerchant({
      merchantId: null,
      payoutId: req.params.id,
    });
    if (!payout) {
      return res
        .status(404)
        .json({ success: false, message: "Payout not found" });
    }
    return res.status(200).json({ success: true, data: toAdminPayout(payout) });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* POST /api/v1/admin/payouts/:id/refresh */
export const adminRefreshPayout = async (req, res) => {
  try {
    const result = await refreshPayoutFromProvider({ payoutId: req.params.id });
    return res.status(200).json({
      success: true,
      message: result.changed
        ? "Payout status updated"
        : "Payout status unchanged",
      data: toAdminPayout(result.payout),
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* POST /api/v1/admin/payouts/:id/reverse */
export const adminReversePayout = async (req, res) => {
  try {
    const payout = await getPayoutForMerchant({
      merchantId: null,
      payoutId: req.params.id,
    });
    if (!payout) {
      return res
        .status(404)
        .json({ success: false, message: "Payout not found" });
    }
    await reversePayout({
      payout,
      reason: req.body?.reason || "Admin reversal",
    });
    return res.status(200).json({
      success: true,
      message: "Payout reversed",
      data: toAdminPayout(await payout.reload()),
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};
