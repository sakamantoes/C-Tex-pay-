import { z } from "zod";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createPayoutSchema = z
  .object({
    amount: z
      .number()
      .int("amount must be an integer in kobo")
      .positive("amount must be positive"),
    currency: z.enum(["NGN"]).default("NGN"),
    bankCode: z.string().trim().regex(/^\d{3,10}$/, "Invalid bank code"),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
    accountName: z.string().trim().min(2).max(255),
    narration: z.string().trim().max(500).optional().nullable(),
    merchantReference: z.string().trim().max(255).optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  })
  .strict();

export const validateBankAccountSchema = z
  .object({
    bankCode: z.string().trim().regex(/^\d{3,10}$/, "Invalid bank code"),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
  })
  .strict();

export const payoutIdParamSchema = z.object({
  id: z.string().regex(UUID_REGEX, "Invalid payout ID"),
});

export const listPayoutsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  status: z
    .enum(["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REVERSED"])
    .optional(),
});