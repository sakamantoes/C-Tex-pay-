import { Router } from "express";
import { authenticateApiKey } from "../middleware/apiKeyAuth.middleware.js";
import { requireApiKeyPermission } from "../middleware/apiKeyPermission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createPayment,
  getPayment,
  listPayments,
} from "../controller/payment.controller.js";
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  paymentReferenceParamSchema,
} from "../validation/payment.validation.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| POST /api/v1/payments
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticateApiKey,
  requireApiKeyPermission("payments.create"),
  validate(createPaymentSchema, "body"),
  createPayment
);

/*
|--------------------------------------------------------------------------
| GET /api/v1/payments
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticateApiKey,
  requireApiKeyPermission("payments.read"),
  validate(listPaymentsQuerySchema, "query"),
  listPayments
);

/*
|--------------------------------------------------------------------------
| GET /api/v1/payments/:paymentReference
|--------------------------------------------------------------------------
*/

router.get(
  "/:paymentReference",
  authenticateApiKey,
  requireApiKeyPermission("payments.read"),
  validate(paymentReferenceParamSchema, "params"),
  getPayment
);

export default router;