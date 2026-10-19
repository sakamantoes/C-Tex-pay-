import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requirePlatformRole } from "../middleware/platformRole.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { adminGetMerchant, adminListAuditLogs, adminListMerchants, adminSetMerchantStatus } from "../controller/adminMerchant.controller.js";
import { adminAuditQuerySchema, adminMerchantListQuerySchema, adminMerchantParamsSchema, adminMerchantStatusSchema } from "../validation/admin.validation.js";

const router = Router();
const platformAdmin = [protect, requirePlatformRole("ADMIN", "SUPER_ADMIN")];
router.get("/merchants", ...platformAdmin, validate(adminMerchantListQuerySchema, "query"), adminListMerchants);
router.get("/merchants/:merchantId", ...platformAdmin, validate(adminMerchantParamsSchema, "params"), adminGetMerchant);
router.patch("/merchants/:merchantId/status", ...platformAdmin, validate(adminMerchantParamsSchema, "params"), validate(adminMerchantStatusSchema), adminSetMerchantStatus);
router.get("/audit-logs", ...platformAdmin, validate(adminAuditQuerySchema, "query"), adminListAuditLogs);
export default router;
