import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"];
const USER_ROLES = ["USER", "MERCHANT", "ADMIN", "SUPER_ADMIN"];

const dateString = z
  .string()
  .trim()
  .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date" });

/*
|--------------------------------------------------------------------------
| List query
|--------------------------------------------------------------------------
*/

export const adminListUsersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  search: z.string().trim().max(255).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  emailVerified: z.enum(["true", "false"]).optional(),
  createdFrom: dateString.optional(),
  createdTo: dateString.optional(),
  sortBy: z.enum(["createdAt", "lastLoginAt", "email", "firstName"]).optional(),
  sortDir: z.enum(["ASC", "DESC", "asc", "desc"]).optional(),
});

/*
|--------------------------------------------------------------------------
| Params
|--------------------------------------------------------------------------
*/

export const adminUserIdParamSchema = z.object({
  userId: uuid,
});

/*
|--------------------------------------------------------------------------
| Mutations
|--------------------------------------------------------------------------
*/

export const adminUpdateUserStatusSchema = z
  .object({
    status: z.enum(USER_STATUSES),
    reason: z.string().trim().min(8).max(500),
  })
  .strict();

export const adminUpdateUserRoleSchema = z
  .object({
    role: z.enum(USER_ROLES),
    reason: z.string().trim().min(8).max(500),
  })
  .strict();

export const adminForceLogoutSchema = z
  .object({
    reason: z.string().trim().min(8).max(500),
  })
  .strict();
