import { z } from "zod";

const MAX_PAGE = 10_000;
const MAX_LIMIT = 100;
const MAX_AMOUNT = 100_000_000_000;
const MAX_DATE_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const PAYMENT_REFERENCE_PATTERN = /^[A-Za-z0-9_-]{1,30}_\d{8}_[A-Fa-f0-9]{16}$/;

const isoDateTime = z.string().datetime({ offset: true });

export const listTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
    status: z.enum(["PENDING", "SUCCESS", "FAILED", "EXPIRED", "CANCELLED"]).optional(),
    paymentMethod: z.enum(["ACCOUNT_TRANSFER"]).optional(),
    paymentReference: z.string().trim().regex(PAYMENT_REFERENCE_PATTERN).optional(),
    merchantReference: z.string().trim().min(1).max(255).optional(),
    customerId: z.string().uuid().optional(),
    currency: z.enum(["NGN"]).optional(),
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
    minAmount: z.coerce.number().int().min(0).max(MAX_AMOUNT).optional(),
    maxAmount: z.coerce.number().int().min(0).max(MAX_AMOUNT).optional(),
    sortBy: z.enum(["createdAt", "amount", "status"]).default("createdAt"),
    direction: z.enum(["ASC", "DESC"]).default("DESC"),
  })
  .strict()
  .superRefine((query, context) => {
    if (query.from && query.to) {
      const from = Date.parse(query.from);
      const to = Date.parse(query.to);

      if (from > to) {
        context.addIssue({
          code: "custom",
          path: ["from"],
          message: "from must be earlier than or equal to to",
        });
      } else if (to - from > MAX_DATE_RANGE_MS) {
        context.addIssue({
          code: "custom",
          path: ["to"],
          message: "Date range cannot exceed 366 days",
        });
      }
    }

    if (
      query.minAmount !== undefined &&
      query.maxAmount !== undefined &&
      query.minAmount > query.maxAmount
    ) {
      context.addIssue({
        code: "custom",
        path: ["minAmount"],
        message: "minAmount must be less than or equal to maxAmount",
      });
    }
  });

export const transactionReferenceParamSchema = z.object({
  paymentReference: z.string().trim().regex(PAYMENT_REFERENCE_PATTERN, "Invalid payment reference"),
});
