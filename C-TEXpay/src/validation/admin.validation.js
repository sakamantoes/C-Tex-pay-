import { z } from "zod";

/* =========================================================
 * Shared primitives
 * ======================================================= */

const pageValue = z.string().regex(/^\d+$/).optional();
const uuid = z.string().uuid("Invalid UUID");

const dateString = z
  .string()
  .trim()
  .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" });

/* =========================================================
 * USER schemas
 * ======================================================= */

const USER_ROLES = ["USER", "MERCHANT", "ADMIN", "SUPER_ADMIN"];
const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"];

export const adminListUsersQuerySchema = z.object({
  page: pageValue,
  limit: pageValue,
  search: z.string().trim().max(255).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  emailVerified: z.enum(["true", "false"]).optional(),
  createdFrom: dateString.optional(),
  createdTo: dateString.optional(),
  sortBy: z
    .enum(["createdAt", "lastLoginAt", "email", "firstName"])
    .optional(),
  sortDir: z.enum(["ASC", "DESC", "asc", "desc"]).optional(),
});

/*
 * The route uses :id in the URL, so the params object is { id: "uuid" }.
 * The controller remaps req.params.id -> req.params.userId before running.
 * The schema key MUST be `id` to match the route path.
 */
export const userIdParamSchema = z.object({
  id: uuid,
});

export const updateUserStatusSchema = z
  .object({
    status: z.enum(USER_STATUSES),
    reason: z.string().trim().min(8).max(500),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: z.enum(USER_ROLES),
    reason: z.string().trim().min(8).max(500),
  })
  .strict();

export const forceLogoutSchema = z
  .object({
    reason: z.string().trim().min(8).max(500),
  })
  .strict();

/* =========================================================
 * MERCHANT schemas
 * ======================================================= */

const MERCHANT_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"];

export const adminMerchantListQuerySchema = z.object({
  page: pageValue,
  limit: pageValue,
  search: z.string().trim().max(255).optional(),
  status: z.enum(MERCHANT_STATUSES).optional(),
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