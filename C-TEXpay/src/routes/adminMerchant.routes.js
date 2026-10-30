import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requirePlatformRole } from "../middleware/platformRole.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  adminGetMerchant,
  adminGetMerchantCustomer,
  adminListAuditLogs,
  adminListMerchantCustomers,
  adminListMerchants,
  adminSetMerchantStatus,
} from "../controller/adminMerchant.controller.js";
import {
  adminAuditQuerySchema,
  adminMerchantCustomerParamsSchema,
  adminMerchantListQuerySchema,
  adminMerchantParamsSchema,
  adminMerchantStatusSchema,
} from "../validation/admin.validation.js";

const router = Router();

// Shared middleware chain for all admin/platform routes
const platformAdmin = [protect, requirePlatformRole("ADMIN", "SUPER_ADMIN")];

/* =========================================================
 * MERCHANTS
 * ======================================================= */

router.get(
  "/merchants",
  ...platformAdmin,
  validate(adminMerchantListQuerySchema, "query"),
  adminListMerchants
);

router.get(
  "/merchants/:merchantId",
  ...platformAdmin,
  validate(adminMerchantParamsSchema, "params"),
  adminGetMerchant
);

router.patch(
  "/merchants/:merchantId/status",
  ...platformAdmin,
  validate(adminMerchantParamsSchema, "params"),
  validate(adminMerchantStatusSchema),
  adminSetMerchantStatus
);

/* =========================================================
 * MERCHANT CUSTOMERS
 * ======================================================= */

router.get(
  "/merchants/:merchantId/customers",
  ...platformAdmin,
  validate(adminMerchantParamsSchema, "params"),
  adminListMerchantCustomers
);

// Detail — declares BOTH merchantId and customerId so Zod
// preserves customerId on req.params instead of stripping it.
router.get(
  "/merchants/:merchantId/customers/:customerId",
  ...platformAdmin,
  validate(adminMerchantCustomerParamsSchema, "params"),
  adminGetMerchantCustomer
);

/* =========================================================
 * AUDIT LOGS
 * ======================================================= */

router.get(
  "/audit-logs",
  ...platformAdmin,
  validate(adminAuditQuerySchema, "query"),
  adminListAuditLogs
);

export default router;