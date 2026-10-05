import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requirePlatformRole } from "../middleware/platformRole.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  adminListPayments,
  adminGetPayment,
} from "../controller/adminPayment.controller.js";
import {
  adminListPaymentsQuerySchema,
  paymentReferenceParamSchema,
} from "../validation/payment.validation.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Admin payment routes
|--------------------------------------------------------------------------
| Authenticated via JWT dashboard auth (protect).
| Authorized only for platform ADMIN and SUPER_ADMIN accounts.
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  validate(adminListPaymentsQuerySchema, "query"),
  adminListPayments
);

router.get(
  "/:paymentReference",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  validate(paymentReferenceParamSchema, "params"),
  adminGetPayment
);

export default router;