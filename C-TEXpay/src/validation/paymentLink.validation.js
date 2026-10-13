import { z } from "zod";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Amount in kobo. Min ₦50 = 5000 kobo. Max ₦10,000,000 = 1_000_000_000 kobo.
const MIN_KOBO = 5_000;
const MAX_KOBO = 1_000_000_000;

export const createPaymentLinkSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    description: z.string().trim().max(500).optional().nullable(),
    amountType: z.enum(["FIXED", "CUSTOM"]),
    amount: z
      .number()
      .int("Amount must be an integer in kobo")
      .min(MIN_KOBO, `Minimum is ${MIN_KOBO} kobo`)
      .max(MAX_KOBO, `Maximum is ${MAX_KOBO} kobo`)
      .optional()
      .nullable(),
    allowMultiplePayments: z.boolean().optional().default(true),
    expiresAt: z
      .string()
      .datetime({ offset: true })
      .optional()
      .nullable(),
  })
  .strict()
  .refine(
    (d) => d.amountType !== "FIXED" || (d.amount && d.amount > 0),
    { message: "amount is required for FIXED links", path: ["amount"] }
  );

export const updatePaymentLinkSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    amount: z
      .number()
      .int()
      .min(MIN_KOBO)
      .max(MAX_KOBO)
      .optional()
      .nullable(),
    allowMultiplePayments: z.boolean().optional(),
    expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  })
  .strict();

export const paymentLinkIdParamSchema = z.object({
  id: z.string().regex(UUID_REGEX, "Invalid Payment Link ID"),
});

export const paymentLinkSlugParamSchema = z.object({
  slug: z.string().trim().min(6).max(32),
});

export const listPaymentLinksQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  search: z.string().trim().max(100).optional(),
});

export const publicCheckoutSchema = z
  .object({
    amount: z.number().int().min(MIN_KOBO).max(MAX_KOBO).optional(),
    customer: z
      .object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(30).optional().nullable(),
      })
      .strict(),
    idempotencyKey: z.string().trim().min(8).max(255).optional(),
  })
  .strict();

export const publicPaymentRefParamSchema = z.object({
  slug: z.string().trim().min(6).max(32),
  paymentReference: z.string().trim().min(5).max(60),
});