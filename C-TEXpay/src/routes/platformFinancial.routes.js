import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requirePlatformRole } from "../middleware/platformRole.middleware.js";
import {
  getWithdrawalFeesController,
  platformFinancialPaymentDetail,
  platformFinancialPayments,
  platformFinancialSummary,
  reconcilePlatformPaymentSettlementController,
  previewWithdrawalFeeController,
  resetWithdrawalFeesController,
  updateWithdrawalFeesController,
} from "../controller/platformFinancial.controller.js";

const router = Router();
router.use(protect, requirePlatformRole("SUPER_ADMIN"));
router.get("/summary", platformFinancialSummary);
router.get("/payments", platformFinancialPayments);
router.get("/payments/:paymentReference", platformFinancialPaymentDetail);
router.patch("/payments/:paymentReference/settlement", reconcilePlatformPaymentSettlementController);
router.get("/withdrawal-fees", getWithdrawalFeesController);
router.get("/withdrawal-fees/preview", previewWithdrawalFeeController);
router.patch("/withdrawal-fees", updateWithdrawalFeesController);
router.post("/withdrawal-fees/reset", resetWithdrawalFeesController);

export default router;
