import {
  createPayment as createPaymentService,
  getPaymentForMerchant,
  listPaymentsForMerchant,
  toPublicPayment,
} from "../service/payment.service.js";

/*
|--------------------------------------------------------------------------
| Status mapping helper
|--------------------------------------------------------------------------
| Keeps the catch block small and makes the contract obvious in one place.
| Returns null if the error has no mapped status, letting the caller
| fall through to the generic 500 handler.
*/

function mapErrorToResponse(error) {
  switch (error.code) {
    // -------- 409 Conflict --------
    case "IDEMPOTENCY_CONFLICT":
      return {
        status: 409,
        message:
          "Idempotency-Key was reused with a different request payload",
      };

    // -------- 404 Not Found --------
    case "CUSTOMER_NOT_FOUND":
      return { status: 404, message: "Customer not found" };
    case "MERCHANT_NOT_FOUND":
      return { status: 404, message: "Merchant not found" };

    // -------- 403 Forbidden --------
    case "MERCHANT_INACTIVE":
      return { status: 403, message: "Merchant account is not active" };

    // -------- 400 Bad Request --------
    case "UNSUPPORTED_CURRENCY":
      return { status: 400, message: "Unsupported currency" };
    case "UNSUPPORTED_METHOD":
      return { status: 400, message: "Unsupported payment method" };
    case "INVALID_AMOUNT":
      return { status: 400, message: "Amount must be a valid number" };
    case "INVALID_AMOUNT_PRECISION":
      return {
        status: 400,
        message: "Amount cannot have more than 2 decimal places",
      };
    case "AMOUNT_OUT_OF_RANGE":
      return { status: 400, message: error.message };
    case "INVALID_IDEMPOTENCY_KEY":
      return { status: 400, message: error.message };
    case "INVALID_METADATA":
      return { status: 400, message: error.message };
    case "METADATA_TOO_LARGE":
      return { status: 400, message: error.message };
    case "INVALID_DESCRIPTION":
      return { status: 400, message: error.message };
    case "DESCRIPTION_TOO_LONG":
      return { status: 400, message: error.message };
    case "INVALID_MERCHANT_REFERENCE":
      return { status: 400, message: error.message };
    case "INVALID_SEARCH":
      return { status: 400, message: error.message };
    case "INVALID_DATE":
      return { status: 400, message: error.message };
    case "MERCHANT_ID_REQUIRED":
      return { status: 400, message: error.message };

    // -------- 400 with field details --------
    case "SEQUELIZE_VALIDATION_ERROR":
      return {
        status: 400,
        message: "Validation failed",
        errors: error.fields || [],
      };

    // -------- 500 (sanitized) --------
    case "SEQUELIZE_DATABASE_ERROR":
      return { status: 500, message: "Unable to initialize payment" };

    default:
      return null;
  }
}

/*
|--------------------------------------------------------------------------
| POST /api/v1/payments   (API key auth)
|--------------------------------------------------------------------------
| Permission: payments.create
*/

export const createPayment = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const {
      amount,
      currency,
      customerId,
      reference,
      description,
      metadata,
      paymentMethod,
    } = req.body;

    const idempotencyKey = req.headers["idempotency-key"] || null;

    console.log("Payment initialization requested", {
      merchantId,
      idempotencyKey,
    });

    const { payment, replayed } = await createPaymentService({
      merchantId,
      amount,
      currency,
      customerId,
      merchantReference: reference || null,
      description,
      metadata,
      paymentMethod,
      idempotencyKey,
    });

    if (replayed) {
      console.log("Idempotency replay detected", {
        merchantId,
        paymentReference: payment.paymentReference,
      });
      return res.status(200).json({
        success: true,
        message: "Payment already initialized (idempotent replay)",
        data: toPublicPayment(payment),
      });
    }

    console.log("Payment initialization completed", {
      merchantId,
      paymentReference: payment.paymentReference,
      merchantReference: payment.merchantReference,
    });

    return res.status(201).json({
      success: true,
      message: "Payment initialized successfully",
      data: toPublicPayment(payment),
    });
  } catch (error) {
    // 1) Try the domain-aware mapping first.
    const mapped = mapErrorToResponse(error);
    if (mapped) {
      if (mapped.status === 409) {
        console.warn("Idempotency conflict detected", {
          merchantId: req.merchant?.id,
        });
      }
      const body = {
        success: false,
        message: mapped.message,
      };
      if (mapped.errors) body.errors = mapped.errors;
      return res.status(mapped.status).json(body);
    }

    // 2) Safety net: direct Sequelize validation error (in case the
    //    service-level wrapper was bypassed somewhere).
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: (error.errors || []).map((err) => ({
          field: err.path || err.field || "unknown",
          message: err.message,
        })),
      });
    }

    // 3) Fallthrough — unexpected server error.
    console.error("Payment initialization failed", {
      merchantId: req.merchant?.id,
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to initialize payment",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/v1/payments/:paymentReference   (API key auth)
|--------------------------------------------------------------------------
| Permission: payments.read
*/

export const getPayment = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { paymentReference } = req.params;

    const payment = await getPaymentForMerchant({
      merchantId,
      paymentReference,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: toPublicPayment(payment),
    });
  } catch (error) {
    console.error("Get payment failed", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/v1/payments   (API key auth)
|--------------------------------------------------------------------------
| Permission: payments.read
*/

export const listPayments = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const query = req.query;

    const result = await listPaymentsForMerchant({
      merchantId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      customerId: query.customerId,
      merchantReference: query.merchantReference,
      paymentReference: query.paymentReference,
      search: query.search,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });

    return res.status(200).json({
      success: true,
      data: {
        payments: result.payments.map(toPublicPayment),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    // Reuse the same mapping so filter validation errors return 400, not 500.
    const mapped = mapErrorToResponse(error);
    if (mapped) {
      const body = { success: false, message: mapped.message };
      if (mapped.errors) body.errors = mapped.errors;
      return res.status(mapped.status).json(body);
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: (error.errors || []).map((err) => ({
          field: err.path || err.field || "unknown",
          message: err.message,
        })),
      });
    }

    console.error("List payments failed", error);
    return res.status(500).json({
      success: false,
      message: "Unable to list payments",
    });
  }
};