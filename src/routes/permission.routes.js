import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireMerchant } from "../middleware/merchant.middleware.js";
import { getPermissions } from "../controller/permission.controller.js";

const router = Router();

router.get("/", protect, requireMerchant, getPermissions);

export default router;
