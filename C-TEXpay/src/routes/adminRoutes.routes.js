import {
  adminListMerchantCustomers,
  adminGetMerchantCustomer,
} from "../controller/adminMerchant.controller.js";

// ... existing admin route mounting ...

router.get(
  "/merchants/:merchantId/customers",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  adminListMerchantCustomers
);

router.get(
  "/merchants/:merchantId/customers/:customerId",
  protect,
  requirePlatformRole("ADMIN", "SUPER_ADMIN"),
  adminGetMerchantCustomer
);