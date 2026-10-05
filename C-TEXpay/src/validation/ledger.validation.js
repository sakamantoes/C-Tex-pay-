import { z } from "zod";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dateString = z
  .string()
  .trim()
  .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" });

export const ledgerListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  currency: z.enum(["NGN"]).optional(),
  direction: z.enum(["DEBIT", "CREDIT"]).optional(),
  type: z
    .enum([
      "PAYMENT_SETTLEMENT",
      "PROVIDER_COST",
      "REFUND",
      "REVERSAL",
      "ADJUSTMENT",
      "PAYOUT",
    ])
    .optional(),
  reference: z.string().trim().max(150).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
});

export const adminAdjustmentSchema = z
  .object({
    merchantId: z.string().regex(UUID_REGEX, "Invalid merchantId"),
    currency: z.enum(["NGN"]).default("NGN"),
    amount: z
      .number()
      .int("Amount must be an integer (minor units)")
      .positive("Amount must be positive"),
    direction: z.enum(["CREDIT", "DEBIT"]),
    reason: z.string().trim().min(3).max(500),
    adminReference: z.string().trim().min(8).max(100),
  })
  .strict();

export const merchantIdParamSchema = z.object({
  merchantId: z.string().regex(UUID_REGEX, "Invalid merchantId"),
});