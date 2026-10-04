import { z } from "zod";

export const createMerchantSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(255, "Business name must not exceed 255 characters"),
  businessType: z.string().trim().max(100).optional(),
  email: z
    .string()
    .email("Invalid email format")
    .max(255)
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  website: z
    .string()
    .url("Invalid website URL")
    .max(255)
    .optional()
    .or(z.literal("")),
  country: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  address: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export const updateMerchantSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
  onboardingStatus: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"])
    .optional(),
});

export const updateBusinessProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(255, "Business name must not exceed 255 characters")
    .optional(),
  businessType: z.string().trim().max(100).optional(),
  email: z
    .string()
    .email("Invalid email format")
    .max(255)
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  website: z
    .string()
    .url("Invalid website URL")
    .max(255)
    .optional()
    .or(z.literal("")),
  country: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  address: z.string().trim().optional(),
  logoUrl: z
    .string()
    .url("Invalid logo URL")
    .max(500)
    .optional()
    .or(z.literal("")),
  description: z.string().trim().optional(),
});

export const merchantIdParamSchema = z.object({
  id: z.string().uuid("Invalid merchant ID format"),
});