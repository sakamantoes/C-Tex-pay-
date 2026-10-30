import { z } from "zod";

const pageValue = z.string().regex(/^\d+$/).optional();
export const adminMerchantListQuerySchema = z.object({
  page: pageValue,
  limit: pageValue,
  search: z.string().trim().max(255).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
  onboardingStatus: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"])
    .optional(),
});
export const adminMerchantParamsSchema = z.object({
  merchantId: z.string().uuid(),
});
export const adminMerchantStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED"]),
    reason: z.string().trim().min(8).max(500),
  })
  .strict();
export const adminAuditQuerySchema = z.object({
  page: pageValue,
  limit: pageValue,
  action: z.string().trim().max(100).optional(),
  resourceType: z.string().trim().max(100).optional(),
  resourceId: z.string().trim().max(100).optional(),
});
export const adminMerchantCustomerParamsSchema = z.object({
  merchantId: z.string().uuid("Invalid merchant ID"),
  customerId: z.string().uuid("Invalid customer ID"),
});
