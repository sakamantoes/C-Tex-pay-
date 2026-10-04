import {
  listAllPayments,
  getAdminPaymentByReference,
  toAdminPayment,
  toAdminPaymentFull,
} from "../service/payment.service.js";

/*
|--------------------------------------------------------------------------
| GET /api/v1/admin/payments   (JWT dashboard auth)
|--------------------------------------------------------------------------
| Permission: payments.read_all
*/

export const adminListPayments = async (req, res) => {
  try {
    const q = req.query;

    const result = await listAllPayments({
      merchantId: q.merchantId,
      page: q.page,
      limit: q.limit,
      status: q.status,
      customerId: q.customerId,
      merchantReference: q.merchantReference,
      paymentReference: q.paymentReference,
      search: q.search,
      createdFrom: q.createdFrom,
      createdTo: q.createdTo,
      sortBy: q.sortBy,
      sortDir: q.sortDir,
    });

    return res.status(200).json({
      success: true,
      data: {
        payments: result.payments.map(toAdminPayment),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    console.error("Admin list payments failed", error);
    return res.status(500).json({
      success: false,
      message: "Unable to list payments",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/v1/admin/payments/:paymentReference
|--------------------------------------------------------------------------
| Permission: payments.read_all
*/

export const adminGetPayment = async (req, res) => {
  try {
    const { paymentReference } = req.params;

    const payment = await getAdminPaymentByReference(paymentReference);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const history = payment.statusHistory || [];

    return res.status(200).json({
      success: true,
      data: toAdminPaymentFull(payment, history),
    });
  } catch (error) {
    console.error("Admin get payment failed", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment",
    });
  }
};