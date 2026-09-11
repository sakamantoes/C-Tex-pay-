import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { authenticateApiKey } from "../middleware/apiKeyAuth.middleware.js";
import { requireApiKeyPermission } from "../middleware/apiKeyPermission.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  createCustomerController,
  getCustomersController,
  getCustomerController,
  updateCustomerController,
  deleteCustomerController,
} from "../controller/customer.controller.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  customerQuerySchema,
} from "../validation/customer.validation.js";

const router = Router();

router.post(
  "/dashboard",
  protect,
  requireMerchant,
  requirePermission("customers.create"),
  validate(createCustomerSchema),
  createCustomerController
);

router.get(
  "/dashboard",
  protect,
  requireMerchant,
  requirePermission("customers.read"),
  validate(customerQuerySchema, "query"),
  getCustomersController
);

router.get(
  "/dashboard/:id",
  protect,
  requireMerchant,
  requirePermission("customers.read"),
  validate(customerIdParamSchema, "params"),
  getCustomerController
);

router.patch(
  "/dashboard/:id",
  protect,
  requireMerchant,
  requirePermission("customers.update"),
  validate(customerIdParamSchema, "params"),
  validate(updateCustomerSchema),
  updateCustomerController
);

router.delete(
  "/dashboard/:id",
  protect,
  requireMerchant,
  requirePermission("customers.delete"),
  validate(customerIdParamSchema, "params"),
  deleteCustomerController
);

router.post(
  "/",
  authenticateApiKey,
  requireApiKeyPermission("customers.create"),
  validate(createCustomerSchema),
  createCustomerController
);

router.get(
  "/",
  authenticateApiKey,
  requireApiKeyPermission("customers.read"),
  validate(customerQuerySchema, "query"),
  getCustomersController
);

router.get(
  "/:id",
  authenticateApiKey,
  requireApiKeyPermission("customers.read"),
  validate(customerIdParamSchema, "params"),
  getCustomerController
);

router.patch(
  "/:id",
  authenticateApiKey,
  requireApiKeyPermission("customers.update"),
  validate(customerIdParamSchema, "params"),
  validate(updateCustomerSchema),
  updateCustomerController
);

router.delete(
  "/:id",
  authenticateApiKey,
  requireApiKeyPermission("customers.delete"),
  validate(customerIdParamSchema, "params"),
  deleteCustomerController
);

export default router;
