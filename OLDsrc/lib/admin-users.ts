import { z } from "zod";
import { appRoles } from "./roles";

export const adminUserSearchSchema = z.object({
  q: z.string().trim().min(2).max(200),
});

export const adminUserIdSchema = z.string().uuid();

export const roleChangeSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(appRoles),
  reason: z.string().trim().min(10).max(500),
  confirmation: z.literal("CONFIRM"),
});

export type AdminUserRecord = {
  profile_id: string;
  display_name: string | null;
  app_role: "consumer" | "organiser" | "moderator" | "administrator";
  primary_email: string | null;
  google_email: string | null;
  account_status: "active" | "pending" | "suspended" | "deleted";
  email_confirmed: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  venue_memberships: number;
};

export function safeAdminUser(record: unknown): AdminUserRecord | null {
  const parsed = z
    .object({
      profile_id: z.string().uuid(),
      display_name: z.string().nullable(),
      app_role: z.enum(["consumer", "organiser", "moderator", "administrator"]),
      primary_email: z.string().email().nullable(),
      google_email: z.string().email().nullable(),
      account_status: z.enum(["active", "pending", "suspended", "deleted"]),
      email_confirmed: z.boolean(),
      last_sign_in_at: z.string().nullable(),
      created_at: z.string(),
      venue_memberships: z.coerce.number().int().nonnegative(),
    })
    .safeParse(record);
  return parsed.success ? parsed.data : null;
}
