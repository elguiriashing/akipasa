import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  adminUserSearchSchema,
  roleChangeSchema,
  safeAdminUser,
} from "../src/lib/admin-users";

describe("administrator user CRM", () => {
  it("requires a bounded server-side search term", () => {
    expect(adminUserSearchSchema.safeParse({ q: "a" }).success).toBe(false);
    expect(
      adminUserSearchSchema.safeParse({ q: "alex@example.com" }).success,
    ).toBe(true);
    expect(
      adminUserSearchSchema.safeParse({ q: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("requires explicit confirmation and a reason for role changes", () => {
    const base = {
      profileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      role: "moderator",
      reason: "Approved staffing change",
    };
    expect(roleChangeSchema.safeParse(base).success).toBe(false);
    expect(
      roleChangeSchema.safeParse({ ...base, confirmation: "CONFIRM" }).success,
    ).toBe(true);
  });

  it("returns only the bounded user record contract", () => {
    expect(
      safeAdminUser({
        profile_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        display_name: "Alex",
        app_role: "administrator",
        primary_email: "alex@example.com",
        google_email: null,
        account_status: "active",
        email_confirmed: true,
        last_sign_in_at: null,
        created_at: "2026-07-27T00:00:00.000Z",
        venue_memberships: "2",
        service_role_key: "must be discarded",
      }),
    ).toEqual({
      profile_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      display_name: "Alex",
      app_role: "administrator",
      primary_email: "alex@example.com",
      google_email: null,
      account_status: "active",
      email_confirmed: true,
      last_sign_in_at: null,
      created_at: "2026-07-27T00:00:00.000Z",
      venue_memberships: 2,
    });
  });

  it("hardens Auth lookup and final administrator changes in SQL", () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), "database/migrations/0027_admin_user_crm.sql"),
      "utf8",
    );
    expect(migration).toContain("join auth.users");
    expect(migration).toContain("auth.identities");
    expect(migration).toContain("administrator role required");
    expect(migration).toContain("cannot remove the final administrator");
    expect(migration).toContain("lock table public.profiles");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("u.deleted_at is null");
    expect(migration).toContain(
      "revoke all on function admin_search_users(text,integer) from public",
    );
    expect(migration).not.toContain("service_role");
  });
});
