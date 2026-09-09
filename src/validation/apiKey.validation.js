import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name must not exceed 255 characters"),
  environment: z.enum(["TEST", "LIVE"]).default("TEST"),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .or(z.literal("")),
  permissionKeys: z
    .array(
      z
        .string()
        .min(1)
        .max(100)
    )
    .default([]),
});

export const apiKeyIdParamSchema = z.object({
  id: z.string().uuid("Invalid API key ID format"),
});

export const apiKeyPermissionParamSchema = z.object({
  id: z.string().uuid("Invalid API key ID format"),
  permissionId: z.string().uuid("Invalid permission ID format"),
});

export const getApiKeysQuerySchema = z.object({
  status: z.enum(["ACTIVE", "REVOKED", "EXPIRED"]).optional(),
  environment: z.enum(["TEST", "LIVE"]).optional(),
});

export const usageQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default("1"),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default("20"),
});