import { z } from "zod";

/*
 * URL field: validated loosely here. Definitive validation happens in
 * the service via validateMerchantUrl(), which is NODE_ENV-aware.
 * Empty string / null is allowed and means "clear this field."
 */
const urlOrEmpty = z
  .string()
  .trim()
  .max(500, "URL must be 500 characters or fewer")
  .optional()
  .nullable()
  .refine(
    (value) =>
      value === null ||
      value === undefined ||
      value === "" ||
      /^https?:\/\//i.test(value),
    { message: "URL must start with http:// or https://" }
  );

const notificationEmailOrEmpty = z
  .string()
  .trim()
  .email("Invalid email")
  .max(255)
  .optional()
  .nullable()
  .or(z.literal(""));

/*
 * PATCH /merchant-settings/urls
 * Only redirect URL fields.
 */
export const updateMerchantUrlsSchema = z
  .object({
    successRedirectUrl: urlOrEmpty,
    failureRedirectUrl: urlOrEmpty,
    cancelRedirectUrl: urlOrEmpty,
  })
  .strict();

/*
 * PATCH /merchant-settings
 * Notification toggles + notificationEmail + redirect URLs.
 * All fields optional — caller updates only what they send.
 */
export const updateMerchantSettingsSchema = z
  .object({
    notifyPaymentSuccessInApp: z.boolean().optional(),
    notifyPaymentSuccessEmail: z.boolean().optional(),
    notificationEmail: notificationEmailOrEmpty,
    successRedirectUrl: urlOrEmpty,
    failureRedirectUrl: urlOrEmpty,
    cancelRedirectUrl: urlOrEmpty,
  })
  .strict();