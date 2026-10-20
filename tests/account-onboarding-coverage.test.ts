import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite;
const pending = "11111111-1111-4111-8111-111111111111",
  old = "22222222-2222-4222-8222-222222222222";
async function user(id: string) {
  await db.exec(
    `reset role;set request.jwt.claim.sub='${id}';set role authenticated`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create schema fiscal_private;create schema akihq_hospitality;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,fiscal_private to authenticated;
 create table profiles(id uuid primary key,app_role text default 'consumer',created_at timestamptz default now(),username text unique,bio text,preferred_locale text,terms_version text,terms_accepted_at timestamptz,updated_at timestamptz);
 create table public.venues(secret text);insert into public.venues values('public discovery');
 create table public.passport_enrollments(profile_id uuid);
 create table public.suite_saved_stays(profile_id uuid);
 create table public.crm_workspaces(secret text);insert into public.crm_workspaces values('workspace secret');
 create table fiscal_private.commands(value text);
 create table akihq_hospitality.commands(value text);
 create function public.crm_can_access_workspace(p_workspace text) returns boolean language sql stable security definer set search_path='' as $$select true;$$;
 create function fiscal_private.allowed(w text,capability text default 'read') returns boolean language sql stable security definer set search_path='' as $$select true;$$;
 create function public.enroll_in_passport(p_passport uuid) returns uuid language plpgsql security definer set search_path='' as $$begin insert into public.passport_enrollments values(auth.uid());return p_passport;end;$$;
 create function public.list_managed_operating_locations(p_limit integer default 50,p_offset integer default 0) returns table(id text) language plpgsql stable security definer set search_path='' as $$declare secret text:=(select w.secret from public.crm_workspaces w limit 1);begin return query select secret;end;$$;
 create function public.legacy_venue_write() returns void language sql security definer set search_path='' as $$insert into public.venues values('new business')$$;
 create function public.my_booking_history(p_tab text default 'upcoming',p_page integer default 0) returns jsonb language sql stable security definer set search_path='' as $$with rows as(select 'booking' value) select to_jsonb(value) from rows;$$;
 create function public.admin_passport_awards(p_action text,p_payload jsonb) returns jsonb language sql set search_path='' as $$select jsonb_build_object('private','award');$$;
 create function public.my_booking_email_export() returns jsonb language sql security definer set search_path='' as $$select jsonb_build_object('own','export');$$;
 alter table public.crm_workspaces enable row level security;
 create policy workspace_member on public.crm_workspaces to authenticated using(public.crm_can_access_workspace('workspace'));
 grant select on public.crm_workspaces,public.venues to authenticated;grant insert on public.venues,public.suite_saved_stays to authenticated;
 insert into profiles(id)values('${old}');`);
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20261020170448_account_completion_age_declaration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    `update account_private.onboarding_rollout set starts_at=now()-interval '1 hour',approved_terms_version='2026-07-23';insert into profiles(id)values('${pending}');`,
  );
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20261020180946_account_completion_database_coverage.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
afterAll(async () => {
  await db.close();
});
it("denies direct RPC reads before original declaration-time reads", async () => {
  await user(pending);
  await expect(
    db.query<Record<string, unknown>>(
      "select * from public.list_managed_operating_locations()",
    ),
  ).rejects.toThrow(/account completion required/);
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select * from public.crm_workspaces",
      )
    ).rows,
  ).toEqual([]);
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select public.crm_can_access_workspace('workspace') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select fiscal_private.allowed('workspace') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
});
it("denies previously uncovered Passport, listing and saved-stay mutations", async () => {
  await user(pending);
  for (const query of [
    `select public.enroll_in_passport('${pending}')`,
    `select public.legacy_venue_write()`,
    `insert into public.suite_saved_stays values(auth.uid())`,
  ])
    await expect(db.query<Record<string, unknown>>(query)).rejects.toThrow(
      /account completion required/,
    );
});
it("guards SQL JSON wrappers while keeping privacy export and public discovery", async () => {
  await user(pending);
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select public.my_booking_history() data",
      )
    ).rows[0].data,
  ).toBeNull();
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select public.admin_passport_awards('issue','{}') data",
      )
    ).rows[0].data,
  ).toBeNull();
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select public.my_booking_email_export() data",
      )
    ).rows[0].data,
  ).toEqual({ own: "export" });
  expect(
    (await db.query<Record<string, unknown>>("select * from public.venues"))
      .rows,
  ).toEqual([{ secret: "public discovery" }]);
  await expect(
    db.query<Record<string, unknown>>(
      "select * from account_private.guard_definition_backup",
    ),
  ).rejects.toThrow(/permission denied/);
});
it("keeps exempt customers and their prior functions operational without deleting data", async () => {
  await user(old);
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select * from public.list_managed_operating_locations()",
      )
    ).rows,
  ).toEqual([{ id: "workspace secret" }]);
  await db.query<Record<string, unknown>>("select public.legacy_venue_write()");
  await db.query<Record<string, unknown>>(
    `select public.enroll_in_passport('${old}')`,
  );
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select public.my_booking_history() data",
      )
    ).rows[0].data,
  ).toBe("booking");
});
it("allows completed accounts, denies negative retries and preserves service-side work", async () => {
  const completed = "33333333-3333-4333-8333-333333333333";
  await db.exec(`reset role;insert into profiles(id)values('${completed}')`);
  await user(completed);
  await db.query<Record<string, unknown>>(
    "select public.complete_account_onboarding(true,'complete_user',null,'2026-07-23','en')",
  );
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select * from public.list_managed_operating_locations()",
      )
    ).rows,
  ).toEqual([{ id: "workspace secret" }]);
  await user(pending);
  await db.query<Record<string, unknown>>(
    "select public.complete_account_onboarding(false)",
  );
  await expect(
    db.query<Record<string, unknown>>(
      "select * from public.list_managed_operating_locations()",
    ),
  ).rejects.toThrow(/account completion required/);
  await db.exec("reset role;set request.jwt.claim.sub=''");
  await db.query<Record<string, unknown>>(
    "insert into fiscal_private.commands values('internal job')",
  );
  await db.query<Record<string, unknown>>(
    "insert into akihq_hospitality.commands values('internal job')",
  );
  expect(
    (
      await db.query<Record<string, unknown>>(
        "select count(*)::int total from public.venues",
      )
    ).rows[0].total,
  ).toBe(2);
});
