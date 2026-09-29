import {
  createPayment as createPaymentService,
  verifyPayment as verifyPaymentService,
  getPaymentForMerchant,
  listPaymentsForMerchant,
  toPublicPayment,
} from "../service/payment.service.js";

/*
|--------------------------------------------------------------------------
| Status mapping helper
|--------------------------------------------------------------------------
*/

const ACTION_TEXT = {
  initialize: {
    failure: "Unable to initialize payment",
    provider: "Payment could not be initialized with the provider.",
    generic: "Payment could not be initialized. Please try again.",
  },

  verify: {
    failure: "Unable to verify payment",
    provider: "Payment could not be verified with the provider.",
    generic: "Payment could not be verified. Please try again.",
  },
};

function mapErrorToResponse(error, action = "initialize") {
  const text = ACTION_TEXT[action] || ACTION_TEXT.initialize;

  switch (error?.code) {
    /*
    |--------------------------------------------------------------------------
    | 409
    |--------------------------------------------------------------------------
    */

    case "IDEMPOTENCY_CONFLICT":
      return {
        status: 409,
        message:
          "Idempotency-Key was reused with a different request payload",
      };

    case "REFERENCE_MISMATCH":
      return {
        status: 409,
        message: "Payment reference mismatch",
      };

    case "AMOUNT_MISMATCH":
      return {
        status: 409,
        message: "Amount paid does not match expected amount",
      };

    case "CURRENCY_MISMATCH":
      return {
        status: 409,
        message: "Currency mismatch",
      };

    case "INVALID_VERIFICATION_STATE":
      return {
        status: 409,
        message: error.message,
      };

    case "INVALID_STATE_TRANSITION":
      return {
        status: 409,
        message: error.message,
      };

    /*
    |--------------------------------------------------------------------------
    | 404
    |--------------------------------------------------------------------------
    */

    case "CUSTOMER_NOT_FOUND":
      return {
        status: 404,
        message: "Customer not found",
      };

    case "MERCHANT_NOT_FOUND":
      return {
        status: 404,
        message: "Merchant not found",
      };

    case "PAYMENT_NOT_FOUND":
      return {
        status: 404,
        message: "Payment not found",
      };

    /*
    |--------------------------------------------------------------------------
    | 403
    |--------------------------------------------------------------------------
    */

    case "MERCHANT_INACTIVE":
      return {
        status: 403,
        message: "Merchant account is not active",
      };

    /*
    |--------------------------------------------------------------------------
    | 400
    |--------------------------------------------------------------------------
    */

    case "UNSUPPORTED_CURRENCY":
      return {
        status: 400,
        message: "Unsupported currency",
      };

    case "UNSUPPORTED_METHOD":
      return {
        status: 400,
        message: "Unsupported payment method",
      };

    case "INVALID_AMOUNT":
      return {
        status: 400,
        message: "Amount must be a valid number",
      };

    case "INVALID_AMOUNT_PRECISION":
      return {
        status: 400,
        message: "Amount cannot have more than 2 decimal places",
      };

    case "AMOUNT_OUT_OF_RANGE":
    case "INVALID_IDEMPOTENCY_KEY":
    case "INVALID_METADATA":
    case "METADATA_TOO_LARGE":
    case "INVALID_DESCRIPTION":
    case "DESCRIPTION_TOO_LONG":
    case "INVALID_MERCHANT_REFERENCE":
    case "INVALID_SEARCH":
    case "INVALID_DATE":
    case "MERCHANT_ID_REQUIRED":
      return {
        status: 400,
        message: error.message,
      };

    case "PAYMENT_REFERENCE_REQUIRED":
      return {
        status: 400,
        message: "Payment reference is required",
      };

    /*
    |--------------------------------------------------------------------------
    | 400 Sequelize validation
    |--------------------------------------------------------------------------
    */

    case "SEQUELIZE_VALIDATION_ERROR":
      return {
        status: 400,
        message: "Validation failed",
        errors: error.fields || [],
      };

    /*
    |--------------------------------------------------------------------------
    | 500 Database
    |--------------------------------------------------------------------------
    */

    case "SEQUELIZE_DATABASE_ERROR":
      return {
        status: 500,
        message: text.failure,
      };

    /*
    |--------------------------------------------------------------------------
    | Provider errors
    |--------------------------------------------------------------------------
    */

    case "PROVIDER_TIMEOUT":
      return {
        status: 504,
        message: "Payment provider timed out. Please retry.",
      };

    case "PROVIDER_NETWORK_ERROR":
      return {
        status: 503,
        message:
          "Payment provider temporarily unavailable. Please retry.",
      };

    case "PROVIDER_REJECTED":
      return {
        status: 502,
        message: text.provider,
      };

    case "PROVIDER_AUTH_FAILED":
      return {
        status: 502,
        message: "Payment service temporarily unavailable.",
      };

    case "PROVIDER_RESPONSE_MALFORMED":
      return {
        status: 502,
        message:
          "Payment service encountered an unexpected response.",
      };

    case "PROVIDER_ERROR":
      return {
        status: 502,
        message: text.generic,
      };

    /*
    |--------------------------------------------------------------------------
    | Bank transfer initialization
    |--------------------------------------------------------------------------
    */

    case "ACCOUNT_TRANSFER_INIT_FAILED":
      return {
        status: 502,
        message:
          "Payment could not generate a transfer account. Please retry with a new Idempotency-Key.",
      };

    default:
      return null;
  }
}

function sendMappedError(res, mapped) {
  const body = {
    success: false,
    message: mapped.message,
  };

  if (mapped.errors) {
    body.errors = mapped.errors;
  }

  return res.status(mapped.status).json(body);
}

function sendSequelizeValidationError(res, error) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: (error.errors || []).map((err) => ({
      field: err.path || err.field || "unknown",
      message: err.message,
    })),
  });
}

/*
|--------------------------------------------------------------------------
| POST /api/v1/payments
|--------------------------------------------------------------------------
| API key authentication
| Permission: payments.create
|--------------------------------------------------------------------------
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

    const idempotencyKey =
      req.headers["idempotency-key"] || null;

    console.log("Payment initialization requested", {
      merchantId,
      idempotencyKey,
    });

    const { payment, replayed } =
      await createPaymentService({
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
        message:
          "Payment already initialized (idempotent replay)",
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
    const mapped =
      mapErrorToResponse(error, "initialize");

    if (mapped) {
      if (mapped.status === 409) {
        console.warn(
          "Idempotency conflict detected",
          {
            merchantId: req.merchant?.id,
          }
        );
      }

      return sendMappedError(res, mapped);
    }

    if (
      error.name ===
      "SequelizeValidationError"
    ) {
      return sendSequelizeValidationError(
        res,
        error
      );
    }

    console.error(
      "Payment initialization failed",
      {
        merchantId: req.merchant?.id,
        error: error.message,
        stack: error.stack,
      }
    );

    return res.status(500).json({
      success: false,
      message: "Unable to initialize payment",
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/v1/payments/:paymentReference/verify
|--------------------------------------------------------------------------
| API key authentication
| Permission: payments.read
|--------------------------------------------------------------------------
*/

export const verifyPayment = async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const { paymentReference } =
      req.params;

    console.log(
      "Payment verification requested",
      {
        merchantId,
        paymentReference,
      }
    );

    const {
      payment,
      alreadyVerified,
    } = await verifyPaymentService({
      merchantId,
      paymentReference,
    });

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    | Verification success is NOT the same thing as payment success.
    |
    | Example:
    |
    | status = EXPIRED
    |
    | The verification operation succeeded, but
    | the payment itself expired.
    |--------------------------------------------------------------------------
    */

    let message;

    if (alreadyVerified) {
      if (payment.status === "SUCCESS") {
        message = "Payment already completed";
      } else {
        message = `Payment status is ${payment.status}`;
      }
    } else {
      switch (payment.status) {
        case "SUCCESS":
          message = "Payment completed successfully";
          break;

        case "PENDING":
          message =
            "Payment is still pending";
          break;

        case "FAILED":
          message =
            "Payment failed";
          break;

        case "EXPIRED":
          message =
            "Payment has expired";
          break;

        case "CANCELLED":
          message =
            "Payment has been cancelled";
          break;

        default:
          message =
            "Payment status retrieved successfully";
      }
    }

    return res.status(200).json({
      success: true,
      message,
      data: toPublicPayment(payment),
    });
  } catch (error) {
    const mapped =
      mapErrorToResponse(error, "verify");

    if (mapped) {
      return sendMappedError(res, mapped);
    }

    console.error(
      "Payment verification failed",
      {
        merchantId: req.merchant?.id,
        paymentReference:
          req.params?.paymentReference,
        error: error.message,
        stack: error.stack,
      }
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/v1/payments/:paymentReference
|--------------------------------------------------------------------------
| Permission: payments.read
|--------------------------------------------------------------------------
*/

export const getPayment = async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const { paymentReference } =
      req.params;

    const payment =
      await getPaymentForMerchant({
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
    console.error(
      "Get payment failed",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/v1/payments
|--------------------------------------------------------------------------
| Permission: payments.read
|--------------------------------------------------------------------------
*/

export const listPayments = async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const query = req.query;

    const result =
      await listPaymentsForMerchant({
        merchantId,
        page: query.page,
        limit: query.limit,
        status: query.status,
        customerId: query.customerId,
        merchantReference:
          query.merchantReference,
        paymentReference:
          query.paymentReference,
        search: query.search,
        createdFrom:
          query.createdFrom,
        createdTo:
          query.createdTo,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
      });

    return res.status(200).json({
      success: true,
      data: {
        payments:
          result.payments.map(
            toPublicPayment
          ),
        pagination:
          result.pagination,
      },
    });
  } catch (error) {
    const mapped =
      mapErrorToResponse(
        error,
        "initialize"
      );

    if (
      mapped &&
      mapped.status < 500
    ) {
      return sendMappedError(
        res,
        mapped
      );
    }

    if (
      error.name ===
      "SequelizeValidationError"
    ) {
      return sendSequelizeValidationError(
        res,
        error
      );
    }

    console.error(
      "List payments failed",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to list payments",
    });
  }
};