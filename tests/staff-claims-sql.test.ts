import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";
let db: PGlite;
const uid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
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
  await db.exec(
    readFileSync(
      "database/migrations/20261010231800_staff_pending_claim_count.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "database/migrations/20261011010000_claim_submission_alerts.sql",
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

it("counts the same pending claims as the paged review queue without exposing applicant data", async () => {
  for (const id of [uid(1), uid(3)]) {
    await db.exec(
      `set role authenticated; select set_config('test.uid','${id}',false)`,
    );
    const result = await db.query<{ staff_pending_venue_claim_count: number }>(
      "select staff_pending_venue_claim_count()",
    );
    expect(Number(result.rows[0].staff_pending_venue_claim_count)).toBe(24);
    await db.exec("reset role");
  }
});
it("never grants a pending-claims count to anonymous, consumer or organiser roles", async () => {
  for (const id of ["", uid(2), uid(4)]) {
    await db.exec(
      `set role authenticated; select set_config('test.uid','${id}',false)`,
    );
    await expect(
      db.query("select staff_pending_venue_claim_count()"),
    ).rejects.toThrow("staff role required");
    await db.exec("reset role");
  }
  await db.exec("set role anon");
  await expect(
    db.query("select staff_pending_venue_claim_count()"),
  ).rejects.toThrow("permission denied");
  await db.exec("reset role");
});

it("queues exactly one staff alert for future pending claim inserts without backfilling old claims", async () => {
  const before = await db.query<{ count: number }>(
    "select count(*)::integer from public.claim_submission_alerts",
  );
  expect(Number(before.rows[0].count)).toBe(0);
  await db.exec(
    "insert into public.venue_claims(id,venue_id,claimant_id,evidence,status,created_at) values ('10000000-0000-4000-8000-000000000026','10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000002','Evidence is provided','pending',now())",
  );
  const after = await db.query<{
    claim_id: string;
    payload: Record<string, string>;
    status: string;
  }>("select claim_id,payload,status from public.claim_submission_alerts");
  expect(after.rows).toHaveLength(1);
  expect(after.rows[0].status).toBe("pending");
  expect(after.rows[0].payload).toMatchObject({
    venueName: "Venue",
    claimId: "10000000-0000-4000-8000-000000000026",
  });
  expect(JSON.stringify(after.rows[0].payload)).not.toContain(
    "Evidence is provided",
  );
});

it("prevents signed-in clients from accessing private staff alert jobs", async () => {
  for (const id of [uid(1), uid(2)]) {
    await db.exec(
      "set role authenticated; select set_config('test.uid','" +
        id +
        "',false)",
    );
    await expect(
      db.query("select * from public.claim_submission_alerts"),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query("select * from public.claim_due_submission_alerts(null)"),
    ).rejects.toThrow("permission denied");
    await db.exec("reset role");
  }
});
