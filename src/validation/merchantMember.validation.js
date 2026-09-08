import { z } from "zod";

export const memberIdParamSchema = z.object({
  id: z.string().uuid("Invalid member ID format"),
});

export const assignRoleToMemberSchema = z.object({
  roleId: z.string().uuid("Invalid role ID format"),
});

export const removeMemberSchema = z.object({
  confirm: z.boolean().optional(),
});