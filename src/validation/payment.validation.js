import { z } from "zod";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
|--------------------------------------------------------------------------
| Create payment
|--------------------------------------------------------------------------
| amount is integer in smallest currency unit (kobo for NGN).
| 25000 = NGN 250.00
*/

export const createPaymentSchema = z
  .object({
    amount: z
      .number({ invalid_type_error: "amount must be a number" })
      .int("amount must be an integer")
      .positive("amount must be positive")
      .finite("amount must be finite")
      .max(1_000_000_000_00, "amount exceeds maximum allowed"),
    currency: z.enum(["NGN"]).default("NGN"),
    customerId: z.string().regex(UUID_REGEX, "Invalid customerId").optional(),
    reference: z
      .string()
      .trim()
      .min(1, "reference cannot be empty")
      .max(255, "reference must not exceed 255 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, "description must not exceed 500 characters")
      .optional(),
    metadata: z.record(z.any()).optional().nullable(),
    paymentMethod: z.enum(["ACCOUNT_TRANSFER"]).optional(),
  })
  .strict();

/*
|--------------------------------------------------------------------------
| Param: payment reference
|--------------------------------------------------------------------------
*/

export const paymentReferenceParamSchema = z.object({
  paymentReference: z
    .string()
    .trim()
    .min(5, "Invalid payment reference")
    .max(50, "Invalid payment reference"),
});

/*
|--------------------------------------------------------------------------
| Query: merchant list
|--------------------------------------------------------------------------
*/

const dateString = z
  .string()
  .trim()
  .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" });

export const listPaymentsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  status: z
    .enum(["PENDING", "SUCCESS", "FAILED", "EXPIRED", "CANCELLED"])
    .optional(),
  customerId: z.string().regex(UUID_REGEX).optional(),
  merchantReference: z.string().trim().max(255).optional(),
  paymentReference: z.string().trim().max(50).optional(),
  search: z.string().trim().max(255).optional(),
  createdFrom: dateString.optional(),
  createdTo: dateString.optional(),
  sortBy: z.enum(["createdAt", "amount", "status", "updatedAt"]).optional(),
  sortDir: z.enum(["ASC", "DESC", "asc", "desc"]).optional(),
});

/*
|--------------------------------------------------------------------------
| Query: admin list
|--------------------------------------------------------------------------
*/

export const adminListPaymentsQuerySchema = listPaymentsQuerySchema.extend({
  merchantId: z.string().regex(UUID_REGEX).optional(),
});