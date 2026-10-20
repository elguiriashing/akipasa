import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const filename = "20261020185822_referral_audit_sequence_acl.sql";
const repair = readFileSync(`database/migrations/${filename}`, "utf8");
const admin = "00000000-0000-4000-8000-000000000001";
let db: PGlite;
let inherited: Array<{
  role: string;
  usage: boolean;
  read: boolean;
  write: boolean;
}>;
const capabilities = (sequence: string) =>
  db.query<{ role: string; usage: boolean; read: boolean; write: boolean }>(
    `select role,has_sequence_privilege(role,$1,'USAGE') usage,has_sequence_privilege(role,$1,'SELECT') read,has_sequence_privilege(role,$1,'UPDATE') write from unnest(array['anon','authenticated','service_role']) role order by role`,
    [sequence],
  );
async function as(role: string, sql: string) {
  await db.exec(
    `set role ${role};select set_config('test.uid','${role === "authenticated" ? admin : ""}',false)`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;grant usage on schema public,auth to anon,authenticated,service_role;
 alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table public.profiles(id uuid primary key,app_role text);
 create function public.current_app_role() returns text language sql stable security definer as $$select app_role from public.profiles where id=auth.uid()$$;
 create table public.billing_subscriptions(profile_id uuid);create table public.billing_customers(profile_id uuid,stripe_customer_id text);
 insert into public.profiles values('${admin}','administrator');
 create sequence public.unrelated_referral_acl_fixture_seq;
 `);
  await db.exec(
    readFileSync(
      "database/migrations/20261020170421_shared_referral_foundation.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "database/migrations/20261020180654_referral_payout_review.sql",
      "utf8",
    ),
  );
  inherited = (await capabilities("public.suite_referral_audit_id_seq")).rows;
  await db.exec(repair);
}, 30000);
afterAll(async () => db?.close());
it("reproduces actual inherited public sequence grants and removes all client/service capabilities", async () => {
  expect(inherited).toEqual(
    ["anon", "authenticated", "service_role"].map((role) => ({
      role,
      usage: true,
      read: true,
      write: true,
    })),
  );
  expect(
    (await capabilities("public.suite_referral_audit_id_seq")).rows,
  ).toEqual(
    ["anon", "authenticated", "service_role"].map((role) => ({
      role,
      usage: false,
      read: false,
      write: false,
    })),
  );
});
it("blocks nextval, setval and raw sequence reads as every non-owner role", async () => {
  for (const role of ["anon", "authenticated", "service_role"])
    for (const sql of [
      "select nextval('public.suite_referral_audit_id_seq')",
      "select setval('public.suite_referral_audit_id_seq',999999)",
      "select last_value from public.suite_referral_audit_id_seq",
    ])
      await expect(as(role, sql)).rejects.toThrow(/permission denied/);
});
it("preserves administrator-authorised append-only audit triggers without raw sequence permission", async () => {
  const created = await as(
    "authenticated",
    "insert into public.suite_referral_programmes(name,programme_type) values('Disposable ACL fixture','public') returning id",
  );
  const id = created.rows[0].id;
  await as(
    "authenticated",
    `update public.suite_referral_programmes set name='Updated disposable ACL fixture' where id='${id}'`,
  );
  const result = await as(
    "authenticated",
    `select actor_id,action,entity_id from public.suite_referral_audit order by id`,
  );
  expect(result.rows).toEqual([
    { actor_id: admin, action: "INSERT", entity_id: id },
    { actor_id: admin, action: "UPDATE", entity_id: id },
  ]);
  await expect(
    as(
      "authenticated",
      "insert into public.suite_referral_audit(action,entity_type,entity_id) values('forged','fixture','fixture')",
    ),
  ).rejects.toThrow(/permission denied/);
});
it("changes no unrelated sequence or existing private review sequence ACL", async () => {
  expect(
    (await capabilities("public.unrelated_referral_acl_fixture_seq")).rows,
  ).toEqual(inherited);
  expect(
    (
      await capabilities("public.suite_referral_payout_reviews_revision_seq")
    ).rows.every((row) => !row.usage && !row.read && !row.write),
  ).toBe(true);
});
it("keeps monetary constraints, review gate and verified service-only billing boundary unchanged", async () => {
  const settings = await db.query(
    "select enabled from akisuite_referral_private.review_settings",
  );
  expect(settings.rows).toEqual([{ enabled: false }]);
  for (const field of ["monetary_enabled", "payouts_enabled"])
    await expect(
      as(
        "authenticated",
        `update public.suite_referral_programmes set ${field}=true`,
      ),
    ).rejects.toThrow(/check constraint/);
  const result = await db.query(
    `select has_function_privilege('service_role','public.suite_record_referral_billing(text,text,uuid,text,text,text,text,bigint,text,timestamp with time zone,boolean)','EXECUTE') service,has_function_privilege('authenticated','public.suite_record_referral_billing(text,text,uuid,text,text,text,text,bigint,text,timestamp with time zone,boolean)','EXECUTE') browser`,
  );
  expect(result.rows).toEqual([{ service: true, browser: false }]);
});
it("is repeatable without data changes and both migration copies are identical", async () => {
  const before = await db.query(
    "select count(*) from public.suite_referral_audit",
  );
  await db.exec(repair);
  expect(
    (await db.query("select count(*) from public.suite_referral_audit")).rows,
  ).toEqual(before.rows);
  expect(readFileSync(`supabase/migrations/${filename}`, "utf8")).toBe(repair);
});
