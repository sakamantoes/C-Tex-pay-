import { z } from "zod";

export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(100),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Please provide a valid email address"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  metadata: z.record(z.any()).optional(),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(100).optional(),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(100).optional(),
  email: z.string().trim().toLowerCase().email("Please provide a valid email address").optional(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
  metadata: z.record(z.any()).optional(),
});

export const customerIdParamSchema = z.object({
  id: z.string().uuid("Invalid customer ID format"),
});

export const customerQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20").refine((value) => value <= 100, {
    message: "Limit cannot exceed 100",
  }),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
});
