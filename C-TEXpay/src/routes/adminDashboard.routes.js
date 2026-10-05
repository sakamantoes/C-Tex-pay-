import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requirePlatformRole } from "../middleware/platformRole.middleware.js";
import { getAdminDashboardSummary } from "../controller/adminDashboard.controller.js";

const router = Router();

router.get(
  "/summary",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  getAdminDashboardSummary,
);

export default router;
