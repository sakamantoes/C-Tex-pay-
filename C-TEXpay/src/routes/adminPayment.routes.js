import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
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
| Authorized via payments.read_all permission on the merchant/role model.
| NOTE: The existing project uses requirePermission(permissionKey) which
| reads req.merchantMember. Admin users are expected to be members of a
| platform-level merchant OR use a super-admin role that owns the
| payments.read_all permission. This preserves the existing RBAC model
| without inventing a new admin bypass.
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protect,
  requirePermission("payments.read_all"),
  validate(adminListPaymentsQuerySchema, "query"),
  adminListPayments
);

router.get(
  "/:paymentReference",
  protect,
  requirePermission("payments.read_all"),
  validate(paymentReferenceParamSchema, "params"),
  adminGetPayment
);

export default router;