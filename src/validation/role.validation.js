import { z } from "zod";

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must not exceed 100 characters"),
  description: z.string().trim().optional(),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters")
    .max(100, "Role name must not exceed 100 characters")
    .optional(),
  description: z.string().trim().optional(),
});

export const roleIdParamSchema = z.object({
  id: z.string().uuid("Invalid role ID format"),
});

export const assignPermissionSchema = z.object({
  permissionId: z.string().uuid("Invalid permission ID format"),
});