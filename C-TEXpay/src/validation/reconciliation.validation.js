import { z } from "zod";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isoDate = z
  .string()
  .trim()
  .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid ISO date" });

export const startReconciliationSchema = z
  .object({
    type: z.enum(["PAYMENTS", "PAYOUTS", "FULL"]).default("PAYMENTS"),
    provider: z.enum(["MONNIFY"]).optional(),
    periodStart: isoDate,
    periodEnd: isoDate,
    merchantId: z.string().regex(UUID_REGEX).optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
  })
  .strict();

export const reconciliationListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  status: z
    .enum(["PENDING", "RUNNING", "COMPLETED", "PARTIAL", "FAILED"])
    .optional(),
  reconciliationType: z.enum(["PAYMENTS", "PAYOUTS", "FULL"]).optional(),
});

export const discrepancyListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  reconciliationId: z.string().regex(UUID_REGEX).optional(),
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  type: z
    .enum([
      "MISSING_PROVIDER_RECORD",
      "MISSING_INTERNAL_RECORD",
      "STATUS_MISMATCH",
      "AMOUNT_MISMATCH",
      "CURRENCY_MISMATCH",
      "DUPLICATE_PROVIDER_RECORD",
      "DUPLICATE_INTERNAL_RECORD",
      "REFERENCE_MISMATCH",
      "UNKNOWN_PROVIDER_TRANSACTION",
    ])
    .optional(),
});

export const idParamSchema = z.object({
  id: z.string().regex(UUID_REGEX, "Invalid ID"),
});

export const updateDiscrepancySchema = z
  .object({
    status: z.enum(["INVESTIGATING", "RESOLVED", "IGNORED"]),
    resolutionNote: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();