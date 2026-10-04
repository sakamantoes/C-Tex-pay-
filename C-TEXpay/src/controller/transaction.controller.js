import {
  getTransactionForMerchant,
  getTransactionSummaryForMerchant,
  listTransactionsForMerchant,
} from "../service/transaction.service.js";

export const getTransactionSummary = async (req, res) => {
  try {
    const summary = await getTransactionSummaryForMerchant({
      merchantId: req.merchant.id,
    });

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Transaction summary failed", {
      merchantId: req.merchant?.id,
      requestId: req.requestId,
      errorName: error.name,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve transaction summary",
    });
  }
};

export const listTransactions = async (req, res) => {
  try {
    const result = await listTransactionsForMerchant({
      merchantId: req.merchant.id,
      query: req.query,
    });

    return res.status(200).json({
      success: true,
      data: result.transactions,
      meta: result.meta,
    });
  } catch (error) {
    console.error("Transaction list failed", {
      merchantId: req.merchant?.id,
      requestId: req.requestId,
      errorName: error.name,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to list transactions",
    });
  }
};

export const getTransaction = async (req, res) => {
  try {
    const transaction = await getTransactionForMerchant({
      merchantId: req.merchant.id,
      paymentReference: req.params.paymentReference,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Transaction detail lookup failed", {
      merchantId: req.merchant?.id,
      requestId: req.requestId,
      errorName: error.name,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve transaction",
    });
  }
};
