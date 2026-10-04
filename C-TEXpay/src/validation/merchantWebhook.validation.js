import { z } from "zod";

export const createMerchantWebhookSchema = z.object({
  url: z.string().trim().url("Webhook URL must be a valid HTTPS URL").max(2048),
  enabled: z.boolean().optional().default(true),
  description: z.string().trim().max(255).optional().nullable().default(null),
});

export const updateMerchantWebhookSchema = z.object({
  url: z.string().trim().url("Webhook URL must be a valid HTTPS URL").max(2048).optional(),
  enabled: z.boolean().optional(),
  description: z.string().trim().max(255).optional().nullable(),
});

export const revealMerchantWebhookSecretSchema = z.object({
  password: z.string().min(1, "Password is required").max(256),
}).strict();

export const merchantWebhookIdParamSchema = z.object({
  id: z.string().uuid("Invalid merchant webhook ID format"),
});

export const merchantWebhookEventIdParamSchema = z.object({
  id: z.string()
    .trim()
    .regex(/^evt_[A-Z0-9]+$/, "Invalid merchant webhook event ID format"),
});

export const merchantWebhookEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  paymentId: z.string().uuid().optional(),
}).strict();
