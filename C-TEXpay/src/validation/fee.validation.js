import { z } from "zod";

const bps = z
  .number()
  .int()
  .min(0, "percentageRateBps must be >= 0")
  .max(10000, "percentageRateBps cannot exceed 10000 (100%)");

const amount = z
  .number()
  .int()
  .min(0, "Amount must be >= 0");

export const createFeeConfigSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional().nullable(),
    merchantId: z.string().uuid().optional().nullable(),
    currency: z.enum(["NGN"]).default("NGN"),
    paymentMethod: z.enum(["ACCOUNT_TRANSFER"]).optional().nullable(),
    feeType: z.enum(["PERCENTAGE", "FIXED", "PERCENTAGE_PLUS_FIXED"]),
    percentageRateBps: bps.default(0),
    fixedAmount: amount.default(0),
    minimumFee: amount.default(0),
    maximumFee: amount.optional().nullable(),
    providerFeeTreatment: z
      .enum(["ABSORBED", "PASSED_TO_MERCHANT", "UNKNOWN"])
      .default("UNKNOWN"),
    effectiveFrom: z.string().datetime().optional(),
    effectiveUntil: z.string().datetime().optional().nullable(),
  })
  .strict()
  .refine(
    (d) => d.maximumFee === null || d.maximumFee === undefined || d.maximumFee >= d.minimumFee,
    { message: "maximumFee must be >= minimumFee", path: ["maximumFee"] }
  );

export const updateFeeConfigSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    percentageRateBps: bps.optional(),
    fixedAmount: amount.optional(),
    minimumFee: amount.optional(),
    maximumFee: amount.optional().nullable(),
    providerFeeTreatment: z.enum(["ABSORBED", "PASSED_TO_MERCHANT", "UNKNOWN"]).optional(),
    effectiveFrom: z.string().datetime().optional(),
    effectiveUntil: z.string().datetime().optional().nullable(),
  })
  .strict();

export const feeConfigStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
  .strict();

export const feeConfigIdParamSchema = z.object({
  id: z.string().uuid("Invalid fee config ID"),
});

export const listFeeConfigsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  merchantId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  currency: z.enum(["NGN"]).optional(),
});