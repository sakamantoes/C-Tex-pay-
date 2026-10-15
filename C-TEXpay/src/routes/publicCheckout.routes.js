import { Router } from "express";
import { validate } from "../middleware/validate.middleware.js";
import { getCheckoutByToken } from "../controller/publicCheckout.controller.js";
import { z } from "zod";

const router = Router();

/**
 * Token format: <paymentReference>.<64-char hex signature>
 * Reference can contain letters, digits, underscore, dash, colon.
 * We do not allow dots in the reference portion.
 */
const tokenParamSchema = z.object({
  token: z
    .string()
    .trim()
    .min(10, "Invalid token")
    .max(500, "Invalid token")
    .regex(/^[A-Za-z0-9_\-:.]+$/, "Invalid token format"),
});

router.get(
  "/:token",
  validate(tokenParamSchema, "params"),
  getCheckoutByToken
);

export default router;