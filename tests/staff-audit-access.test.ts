import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated;
    create type public.app_role as enum ('consumer','organiser','moderator','administrator');
    create function public.has_platform_role(roles public.app_role[])
      returns boolean language sql stable as $$
        select current_setting('test.role', true) = any(
          array(select unnest(roles)::text)
        )
      $$;
    create table public.moderation_actions(id integer primary key, action text not null);
    insert into public.moderation_actions values(1, 'approved');
    alter table public.moderation_actions enable row level security;
    grant usage on schema public to authenticated;
    grant select on public.moderation_actions to authenticated;
    create policy moderation_actions_operator_read
      on public.moderation_actions for select to authenticated
      using (public.has_platform_role(array['moderator','administrator']::public.app_role[]));
  `);
  await db.exec(
    readFileSync(
      "database/migrations/20261011220000_staff_audit_admin_only.sql",
      "utf8",
    ),
  );
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("administrator-only audit access", () => {
  it.each(["consumer", "organiser", "moderator"])(
    "does not expose platform audit entries to %s",
    async (role) => {
      await db.exec(
        `set role authenticated; select set_config('test.role','${role}',false)`,
      );
      try {
        const data = await db.query("select id from public.moderation_actions");
        expect(data.rows).toHaveLength(0);
      } finally {
        await db.exec("reset role");
      }
    },
  );

  it("keeps privileged audit reads available to administrators", async () => {
    await db.exec(
      "set role authenticated; select set_config('test.role','administrator',false)",
    );
    try {
      const result = await db.query("select id from public.moderation_actions");
      expect(result.rows).toHaveLength(1);
    } finally {
      await db.exec("reset role");
    }
  });

  it("keeps both operational migration copies identical", () => {
    expect(
      readFileSync(
        "database/migrations/20261011220000_staff_audit_admin_only.sql",
        "utf8",
      ),
    ).toBe(
      readFileSync(
        "supabase/migrations/20261011220000_staff_audit_admin_only.sql",
        "utf8",
      ),
    );
  });

  it("does not fetch or link full audit content from Staff pages", () => {
    const overview = readFileSync("src/app/[locale]/staff/page.tsx", "utf8");
    const navigation = readFileSync(
      "src/app/[locale]/staff/layout.tsx",
      "utf8",
    );
    const auditRoute = readFileSync(
      "src/app/[locale]/staff/audit/page.tsx",
      "utf8",
    );
    const adminRoute = readFileSync(
      "src/app/[locale]/admin/audit/page.tsx",
      "utf8",
    );
    expect(overview).not.toContain("moderation_actions");
    expect(overview).not.toContain("/staff/audit");
    expect(navigation).not.toContain("/audit");
    expect(auditRoute).toContain("isAdministrator");
    expect(auditRoute).toContain("redirect");
    expect(adminRoute).toContain("isAdministrator");
  });

  it("keeps a full-width responsive Staff layout independent of Admin", () => {
    const css = readFileSync(
      "src/app/[locale]/staff/staff-overview.css",
      "utf8",
    );
    expect(css).toContain(".operations-overview.staff-dashboard");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(css).toContain("staff-dashboard-task-grid");
    expect(css).toContain("@media (max-width: 650px)");
  });
});
