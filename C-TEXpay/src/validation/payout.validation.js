import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

const money = z
  .number()
  .int("Amount must be an integer in kobo")
  .positive("Amount must be positive")
  .max(Number.MAX_SAFE_INTEGER, "Amount exceeds maximum");

const currency = z.enum(["NGN"]).default("NGN");

const feeMode = z.enum(["FEE_ON_TOP", "DEDUCT_FROM_AMOUNT"]).default("FEE_ON_TOP");

const bankCode = z
  .string()
  .trim()
  .regex(/^\d{3,10}$/, "Bank code must be 3-10 digits");

const accountNumber = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Account number must be exactly 10 digits");

export const createPayoutSchema = z
  .object({
    amount: money,
    currency,
    bankCode,
    accountNumber,
    accountName: z.string().trim().min(2).max(255),
    narration: z.string().trim().max(255).optional().nullable(),
    merchantReference: z.string().trim().max(100).optional().nullable(),
    feeMode,
    metadata: z.record(z.any()).optional().nullable(),
  })
  .strict();

export const payoutQuoteSchema = z
  .object({
    amount: money,
    currency,
    feeMode,
  })
  .strict();

export const payoutAuthorizationSchema = z
  .object({
    authorizationCode: z
      .string()
      .trim()
      .regex(/^\d{4,10}$/, "Authorization code must be 4-10 digits"),
  })
  .strict();

export const validateBankAccountSchema = z
  .object({
    bankCode,
    accountNumber,
  })
  .strict();

export const payoutIdParamSchema = z.object({
  id: uuid,
});

export const listPayoutsQuerySchema = z.object({
  status: z
    .enum(["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REVERSED"])
    .optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});