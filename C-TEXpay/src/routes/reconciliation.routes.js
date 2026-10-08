import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  startReconciliation,
  listRuns,
  getRun,
  listDiscrepancyList,
  getOneDiscrepancy,
  updateDiscrepancy,
} from "../controller/reconciliation.controller.js";
import {
  startReconciliationSchema,
  reconciliationListQuerySchema,
  discrepancyListQuerySchema,
  idParamSchema,
  updateDiscrepancySchema,
} from "../validation/reconciliation.validation.js";

const router = Router();

router.post(
  "/",
  protect,
  requireMerchant,
  requirePermission("reconciliation.manage"),
  validate(startReconciliationSchema),
  startReconciliation
);

router.get(
  "/",
  protect,
  requireMerchant,
  requirePermission("reconciliation.read"),
  validate(reconciliationListQuerySchema, "query"),
  listRuns
);

router.get(
  "/discrepancies",
  protect,
  requireMerchant,
  requirePermission("reconciliation.read"),
  validate(discrepancyListQuerySchema, "query"),
  listDiscrepancyList
);

router.get(
  "/discrepancies/:id",
  protect,
  requireMerchant,
  requirePermission("reconciliation.read"),
  validate(idParamSchema, "params"),
  getOneDiscrepancy
);

router.patch(
  "/discrepancies/:id",
  protect,
  requireMerchant,
  requirePermission("reconciliation.manage"),
  validate(idParamSchema, "params"),
  validate(updateDiscrepancySchema),
  updateDiscrepancy
);

router.get(
  "/:id",
  protect,
  requireMerchant,
  requirePermission("reconciliation.read"),
  validate(idParamSchema, "params"),
  getRun
);

export default router;