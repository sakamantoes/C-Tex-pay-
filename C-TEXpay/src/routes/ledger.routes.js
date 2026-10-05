import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  getMyBalance,
  listMyLedgerEntries,
} from "../controller/ledger.controller.js";
import { ledgerListQuerySchema } from "../validation/ledger.validation.js";

const router = Router();

router.get(
  "/balance",
  protect,
  requireMerchant,
  requirePermission("ledger.read"),
  getMyBalance
);

router.get(
  "/entries",
  protect,
  requireMerchant,
  requirePermission("ledger.read"),
  validate(ledgerListQuerySchema, "query"),
  listMyLedgerEntries
);

export default router;