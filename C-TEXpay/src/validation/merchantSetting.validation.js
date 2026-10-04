import { z } from "zod";

export const updateMerchantSettingsSchema = z.object({
  notifyPaymentSuccessInApp: z.boolean().optional(),
  notifyPaymentSuccessEmail: z.boolean().optional(),
  notificationEmail: z.union([
    z.string().trim().email().max(255),
    z.literal(""),
    z.null(),
  ]).optional().transform((value) => value === undefined ? undefined : value || null),
}).strict().refine((updates) => Object.keys(updates).length > 0, {
  message: "At least one setting must be provided",
});
