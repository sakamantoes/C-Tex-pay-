import { Router } from "express";
import { authenticateApiKey } from "../middleware/apiKeyAuth.middleware.js";
import { requireApiKeyPermission } from "../middleware/apiKeyPermission.middleware.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  getTransaction,
  getTransactionSummary,
  listTransactions,
} from "../controller/transaction.controller.js";
import {
  listTransactionsQuerySchema,
  transactionReferenceParamSchema,
} from "../validation/transaction.validation.js";

const router = Router();

router.get(
  "/dashboard/summary",
  protect,
  requireMerchant,
  requirePermission("transactions.read"),
  getTransactionSummary,
);

router.get(
  "/dashboard",
  protect,
  requireMerchant,
  requirePermission("transactions.read"),
  validate(listTransactionsQuerySchema, "query"),
  listTransactions,
);

router.get(
  "/dashboard/:paymentReference",
  protect,
  requireMerchant,
  requirePermission("transactions.read"),
  validate(transactionReferenceParamSchema, "params"),
  getTransaction,
);

router.get(
  "/",
  authenticateApiKey,
  requireApiKeyPermission("transactions.read"),
  validate(listTransactionsQuerySchema, "query"),
  listTransactions,
);

router.get(
  "/:paymentReference",
  authenticateApiKey,
  requireApiKeyPermission("transactions.read"),
  validate(transactionReferenceParamSchema, "params"),
  getTransaction,
);

export default router;
