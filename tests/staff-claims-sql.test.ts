import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite;
const uid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table profiles(id uuid primary key,app_role text,display_name text,phone text,created_at timestamptz default now());
 create table auth.users(id uuid primary key,email text,deleted_at timestamptz);
 create table cities(id uuid primary key,timezone text);
 create table venues(id uuid primary key,city_id uuid,name text,address text,slug text,discovery_vertical text,contact_phone text,website_url text);
 create table venue_claims(id uuid primary key,venue_id uuid,claimant_id uuid,evidence text,status text,created_at timestamptz);
 insert into profiles(id,app_role,display_name,phone) values('${uid(1)}','moderator','Staff',null),('${uid(2)}','consumer','Applicant','+34600000000'),('${uid(3)}','administrator','Admin',null),('${uid(4)}','organiser','Business',null);
 insert into auth.users values('${uid(2)}','applicant@example.test',null);
 insert into cities values('${uid(5)}','Atlantic/Canary');
 insert into venues values('${uid(6)}','${uid(5)}','Venue','Example Street 1','venue','accommodation','+34900000000','https://example.test');
 insert into venue_claims select gen_random_uuid(),'${uid(6)}','${uid(2)}','Claim evidence',case when n=25 then 'approved' else 'pending' end,'2026-10-10T10:00:00Z'::timestamptz+ n*interval '1 second' from generate_series(1,25) n;
 grant usage on schema public,auth to authenticated,anon;`);
  await db.exec(
    readFileSync(
      "database/migrations/20261010105857_staff_claim_review_details.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("denies anonymous, consumers and business roles even when directly called", async () => {
  for (const id of ["", uid(2), uid(4)]) {
    await db.exec(
      `set role authenticated; select set_config('test.uid','${id}',false)`,
    );
    await expect(
      db.query("select * from staff_pending_venue_claims(0)"),
    ).rejects.toThrow("staff role required");
  }
  await db.exec("set role anon");
  await expect(
    db.query("select * from staff_pending_venue_claims(0)"),
  ).rejects.toThrow("permission denied");
  await db.exec("reset role");
});
it("returns complete pending claims to staff with bounded paging and deterministic order", async () => {
  for (const id of [uid(1), uid(3)]) {
    await db.exec(
      `set role authenticated; select set_config('test.uid','${id}',false)`,
    );
    const first = await db.query<{
      claimant: { email: string; phone: string };
      venues: { timezone: string; address: string };
      total_count: number;
    }>("select * from staff_pending_venue_claims(0)");
    expect(first.rows).toHaveLength(20);
    expect(Number(first.rows[0].total_count)).toBe(24);
    expect(first.rows[0].claimant).toMatchObject({
      email: "applicant@example.test",
      phone: "+34600000000",
    });
    expect(first.rows[0].venues).toMatchObject({
      timezone: "Atlantic/Canary",
      address: "Example Street 1",
    });
    const second = await db.query(
      "select * from staff_pending_venue_claims(20)",
    );
    expect(second.rows).toHaveLength(4);
    await expect(
      db.query("select * from staff_pending_venue_claims(-1)"),
    ).rejects.toThrow("invalid claim offset");
    await db.exec("reset role");
  }
});
it("does not expose a deleted Auth email", async () => {
  await db.exec(
    `update auth.users set deleted_at=now(); set role authenticated; select set_config('test.uid','${uid(1)}',false)`,
  );
  const result = await db.query<{ claimant: { email: string | null } }>(
    "select * from staff_pending_venue_claims(0)",
  );
  expect(result.rows[0].claimant.email).toBeNull();
  await db.exec("reset role");
});
