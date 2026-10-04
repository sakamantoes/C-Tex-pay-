import { z } from "zod";

export const memberIdParamSchema = z.object({
  id: z.string().uuid("Invalid member ID format"),
});

export const assignRoleToMemberSchema = z.object({
  roleId: z.string().uuid("Invalid role ID format"),
});

export const assignRoleToMemberParamSchema = z.object({
  id: z.string().uuid("Invalid member ID format"),
  roleId: z.string().uuid("Invalid role ID format"),
});

export const removeMemberSchema = z.object({
  confirm: z.boolean().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please provide a valid email address"),
  roleId: z.string().uuid("Invalid role ID format"),
});

export const acceptMemberInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required").optional(),
}).refine((value) => value.token, {
  message: "Invitation token is required",
  path: ["token"],
});