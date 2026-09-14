import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ownerBackgroundPathSchema,
  ownerPreferencesSchema,
} from "../src/lib/owner-console";

const read = (path: string) => readFileSync(path, "utf8");

describe("owner console", () => {
  it("accepts only supported appearance preferences", () => {
    expect(
      ownerPreferencesSchema.safeParse({
        locale: "en",
        background: "aurora",
        accent: "teal",
        motion: "on",
        glass: "on",
      }).success,
    ).toBe(true);
    expect(
      ownerPreferencesSchema.safeParse({
        locale: "en",
        background: "javascript:alert(1)",
        accent: "teal",
      }).success,
    ).toBe(false);
  });

  it("accepts only UUID-scoped owner image paths", () => {
    expect(
      ownerBackgroundPathSchema.safeParse({
        locale: "en",
        path: "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.webp",
      }).success,
    ).toBe(true);
    expect(
      ownerBackgroundPathSchema.safeParse({
        locale: "en",
        path: "someone-else/background.svg",
      }).success,
    ).toBe(false);
  });

  it("keeps owner backgrounds private and UUID-folder isolated", () => {
    const migration = read(
      "database/migrations/0067_private_owner_backgrounds.sql",
    );
    expect(migration).toContain(
      "'owner-backgrounds','owner-backgrounds',false",
    );
    expect(migration).toContain("10485760");
    expect(migration).toContain("array['image/jpeg','image/png','image/webp']");
    expect(migration).toContain(
      "(storage.foldername(name))[1]=(select auth.uid())::text",
    );
    expect(migration).toContain("and public.has_owner_console()");
    expect(migration).not.toMatch(/alexashing|@[a-z0-9.-]+\.[a-z]{2,}/i);
  });
  it("uses an explicit UUID entitlement with self-only RLS", () => {
    const migration = read("database/migrations/0066_owner_console.sql");
    expect(migration).toContain(
      "profile_id uuid primary key references profiles(id)",
    );
    expect(migration).toContain("profile_id=(select auth.uid())");
    expect(migration).toContain("create function has_owner_console()");
    expect(migration).toContain(
      "revoke all on function has_owner_console() from public,anon",
    );
    expect(migration).not.toMatch(/alexashing|@[a-z0-9.-]+\.[a-z]{2,}/i);
  });

  it("guards the private route and conditionally mounts global owner UI", () => {
    const ownerPage = read("src/app/[locale]/owner/page.tsx");
    const layout = read("src/app/[locale]/layout.tsx");
    const shell = read("src/components/AppShell.tsx");
    expect(ownerPage).toContain("requireOwnerConsole(locale)");
    expect(layout).toContain('supabase.rpc("has_owner_console")');
    expect(layout).toContain("{ownerConsole && (");
    expect(shell).toContain("...(ownerConsole");
  });
});
