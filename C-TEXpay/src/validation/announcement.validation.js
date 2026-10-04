import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1).max(5000),
  audience: z.enum(["ALL", "USERS", "MERCHANTS", "ADMINS", "SUPER_ADMINS", "USER_IDS"]),
  userIds: z.array(z.string().uuid()).min(1).max(1000).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).superRefine((value, context) => {
  if (value.audience === "USER_IDS" && !value.userIds?.length) context.addIssue({ code: "custom", path: ["userIds"], message: "userIds is required for USER_IDS audience" });
  if (value.audience !== "USER_IDS" && value.userIds) context.addIssue({ code: "custom", path: ["userIds"], message: "userIds is only allowed for USER_IDS audience" });
});
