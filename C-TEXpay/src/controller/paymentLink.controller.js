import {
  createPaymentLink,
  listPaymentLinks,
  getPaymentLinkForMerchant,
  updatePaymentLink,
  deactivatePaymentLink,
  getPublicPaymentLink,
  checkoutPublicLink,
  getPublicPaymentStatus,
  PaymentLinkError,
  parseInstructions,
} from "../service/paymentLink.service.js";

function mapError(error) {
  if (error instanceof PaymentLinkError) {
    return { status: error.statusCode, message: error.message };
  }
  if (error.statusCode) {
    return { status: error.statusCode, message: error.message };
  }
  return { status: 500, message: "Internal error" };
}

/* ---------- Merchant endpoints ---------- */

export const createLink = async (req, res) => {
  try {
    const link = await createPaymentLink({
      merchantId: req.merchant.id,
      ...req.body,
    });
    return res
      .status(201)
      .json({ success: true, message: "Payment link created", data: { link } });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const listLinks = async (req, res) => {
  try {
    const result = await listPaymentLinks({
      merchantId: req.merchant.id,
      ...req.query,
    });
    return res.status(200).json({
      success: true,
      data: result.links,
      meta: result.pagination,
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const getLink = async (req, res) => {
  try {
    const link = await getPaymentLinkForMerchant({
      merchantId: req.merchant.id,
      linkId: req.params.id,
    });
    return res.status(200).json({ success: true, data: { link } });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const updateLink = async (req, res) => {
  try {
    const link = await updatePaymentLink({
      merchantId: req.merchant.id,
      linkId: req.params.id,
      updates: req.body,
    });
    return res
      .status(200)
      .json({ success: true, message: "Payment link updated", data: { link } });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const deactivateLink = async (req, res) => {
  try {
    const link = await deactivatePaymentLink({
      merchantId: req.merchant.id,
      linkId: req.params.id,
    });
    return res.status(200).json({
      success: true,
      message: "Payment link archived",
      data: { link },
    });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

/* ---------- Public endpoints ---------- */

export const getPublicLink = async (req, res) => {
  try {
    const { link } = await getPublicPaymentLink({ slug: req.params.slug });
    return res.status(200).json({ success: true, data: { link } });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const publicCheckout = async (req, res) => {
  try {
    const result = await checkoutPublicLink({
      slug: req.params.slug,
      amount: req.body.amount,
      customer: req.body.customer,
      idempotencyKey: req.body.idempotencyKey,
      requestId: req.requestId,
    });

    return res.status(201).json({
      success: true,
      message: "Payment initialized",
      data: {
        paymentReference: result.payment.paymentReference,
        amount: Number(result.payment.amount),
        currency: result.payment.currency,
        status: result.payment.status,
        paymentInstructions: result.payment.paymentInstructions || null,
        expiresAt: result.payment.expiresAt,
      },
    });
  } catch (error) {
    console.error("Public payment-link checkout failed", {
      requestId: req.requestId,
      errorName: error?.name || "Error",
      errorCode: error?.code || null,
      statusCode: error?.statusCode || null,
      databaseCode: error?.parent?.code || error?.original?.code || null,
    });
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};

export const publicPaymentStatus = async (req, res) => {
  try {
    const status = await getPublicPaymentStatus({
      slug: req.params.slug,
      paymentReference: req.params.paymentReference,
    });
    return res.status(200).json({ success: true, data: status });
  } catch (error) {
    const { status, message } = mapError(error);
    return res.status(status).json({ success: false, message });
  }
};
