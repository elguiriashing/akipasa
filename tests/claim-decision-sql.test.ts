import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterAll, expect, it } from "vitest";
let db: PGlite;
const uid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const claim = uid(10),
  venue = uid(5),
  applicant = uid(2);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
 create type app_role as enum ('consumer','organiser','moderator','administrator');
 create type claim_status as enum ('pending','approved','rejected'); create type venue_member_role as enum ('owner','manager');
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table profiles(id uuid primary key,app_role app_role,display_name text,preferred_locale text);
 create function has_platform_role(roles app_role[]) returns boolean language sql as $$select exists(select 1 from profiles where id=auth.uid() and app_role=any(roles))$$;
 create table auth.users(id uuid primary key,email text,deleted_at timestamptz,email_confirmed_at timestamptz);
 create table venues(id uuid primary key,name text,verified boolean,status text,updated_at timestamptz);
 create table venue_claims(id uuid primary key,venue_id uuid references venues(id) on delete cascade,claimant_id uuid references profiles(id) on delete cascade,status claim_status default 'pending',decided_by uuid,decision_reason text,decided_at timestamptz);
 create table venue_members(venue_id uuid,profile_id uuid,role venue_member_role,primary key(venue_id,profile_id));
 create table moderation_actions(actor_id uuid,action text,target_type text,target_id uuid,reason text check(reason<>'force audit failure'),metadata jsonb);
 insert into profiles values('${uid(1)}','moderator','Staff','en'),('${applicant}','consumer','Applicant','es'),('${uid(3)}','administrator','Admin','en'),('${uid(4)}','organiser','Other','en');
 insert into auth.users values('${applicant}','applicant@example.test',null,now());
 insert into venues values('${venue}','Example Venue',false,'published',now());
 grant usage on schema public,auth to anon,authenticated,service_role;
 grant select on profiles to authenticated;`);
  await db.exec(
    readFileSync(
      "database/migrations/20261010114606_claim_decision_emails.sql",
      "utf8",
    ),
  );
  const moderation = readFileSync(
    "database/migrations/0054_publish_geocoded_community_events.sql",
    "utf8",
  )
    .split("create or replace function moderate_item(")[1]
    .split("$$;")[0];
  await db.exec(
    `create or replace function moderate_item(${moderation}$$; revoke all on function moderate_item(text,uuid,text,text,uuid) from public; grant execute on function moderate_item(text,uuid,text,text,uuid) to authenticated;`,
  );
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role; delete from venue_claims; delete from venue_members; delete from moderation_actions;
 update auth.users set deleted_at=null,email='applicant@example.test',email_confirmed_at=now();
 update venues set name='Example Venue';
 update profiles set display_name='Applicant',preferred_locale='es' where id='${applicant}';
 insert into venue_claims(id,venue_id,claimant_id) values('${claim}','${venue}','${applicant}');`);
});
afterAll(async () => {
  await db?.close();
});
async function decide(
  decision = "approved",
  reason = "Verified ownership",
  actor = uid(1),
) {
  await db.exec(
    `set role authenticated; select set_config('test.uid','${actor}',false)`,
  );
  const result = db.query("select moderate_item('venue_claim',$1,$2,$3,null)", [
    claim,
    decision,
    reason,
  ]);
  try {
    return await result;
  } finally {
    await db.exec("reset role");
  }
}
async function lease() {
  await db.exec("set role service_role");
  try {
    return await db.query<{
      claim_id: string;
      lease_id: string;
      payload: Record<string, unknown>;
    }>("select * from claim_claim_decision_emails(null)");
  } finally {
    await db.exec("reset role");
  }
}
it("atomically queues one localized approval and preserves ownership/audit; duplicate decisions do not resend", async () => {
  await decide();
  const result = await db.query<{
    payload: Record<string, unknown>;
    status: string;
    recipient: string;
  }>("select * from claim_decision_emails");
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0]).toMatchObject({
    status: "pending",
    recipient: "applicant@example.test",
    payload: {
      locale: "es",
      decision: "approved",
      reason: "Verified ownership",
      venueName: "Example Venue",
    },
  });
  expect((await db.query("select * from venue_members")).rows).toHaveLength(1);
  expect(
    (await db.query("select * from moderation_actions")).rows,
  ).toHaveLength(1);
  await expect(decide()).rejects.toThrow("item not pending");
  expect(
    (await db.query("select * from claim_decision_emails")).rows,
  ).toHaveLength(1);
});
it("queues an English denial with the actual reason, no ownership, and allows a new claim", async () => {
  await db.exec(
    `update profiles set preferred_locale='en' where id='${applicant}'`,
  );
  await decide("rejected", "Please provide an official contact", uid(3));
  expect(
    (
      await db.query<{ payload: Record<string, unknown> }>(
        "select payload from claim_decision_emails",
      )
    ).rows[0].payload,
  ).toMatchObject({
    locale: "en",
    decision: "rejected",
    reason: "Please provide an official contact",
  });
  expect((await db.query("select * from venue_members")).rows).toHaveLength(0);
  await db.exec(
    `insert into venue_claims(id,venue_id,claimant_id) values('${uid(11)}','${venue}','${applicant}')`,
  );
  expect(
    (await db.query("select * from claim_decision_emails")).rows,
  ).toHaveLength(1);
});
it("rejects nonstaff decisions and rolls the queue and ownership back if audit fails", async () => {
  await expect(decide("approved", "Verified", applicant)).rejects.toThrow(
    "moderator role required",
  );
  await expect(decide("approved", "force audit failure")).rejects.toThrow(
    "check constraint",
  );
  expect(
    (await db.query("select * from claim_decision_emails")).rows,
  ).toHaveLength(0);
  expect((await db.query("select * from venue_members")).rows).toHaveLength(0);
  expect(
    (await db.query<{ status: string }>("select status from venue_claims"))
      .rows[0].status,
  ).toBe("pending");
});
it("restricts outbox reads to the applicant/staff and leasing to the service role", async () => {
  await decide();
  for (const actor of [uid(1), uid(3), applicant, uid(4)]) {
    await db.exec(
      `set role authenticated; select set_config('test.uid','${actor}',false)`,
    );
    expect(
      (await db.query("select * from claim_decision_emails")).rows,
    ).toHaveLength(actor === uid(4) ? 0 : 1);
    await expect(
      db.query("select * from claim_claim_decision_emails(null)"),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query("update claim_decision_emails set status='sent'"),
    ).rejects.toThrow("permission denied");
  }
  await db.exec("set role anon");
  await expect(db.query("select * from claim_decision_emails")).rejects.toThrow(
    "permission denied",
  );
  await expect(
    db.query("select * from claim_claim_decision_emails(null)"),
  ).rejects.toThrow("permission denied");
  await db.exec("reset role");
});
it("leases once, rejects stale acknowledgements, retries transient failures and never re-leases sent mail", async () => {
  await decide();
  const first = (await lease()).rows[0];
  expect((await lease()).rows).toHaveLength(0);
  await db.exec("set role service_role");
  expect(
    (
      await db.query<{ ok: boolean }>(
        "select finish_claim_decision_email($1,$2,true,'mail-1') as ok",
        [claim, uid(99)],
      )
    ).rows[0].ok,
  ).toBe(false);
  await db.query(
    "select finish_claim_decision_email($1,$2,false,null,'provider_503',true,true)",
    [claim, first.lease_id],
  );
  await db.exec(
    "reset role; update claim_decision_emails set available_at=now()",
  );
  const second = (await lease()).rows[0];
  expect(second.lease_id).not.toBe(first.lease_id);
  await db.exec("set role service_role");
  await db.query("select finish_claim_decision_email($1,$2,true,'mail-1')", [
    claim,
    second.lease_id,
  ]);
  await db.exec("reset role");
  expect((await lease()).rows).toHaveLength(0);
});
it("holds ambiguous old sends and permanent errors instead of blindly retrying", async () => {
  await decide();
  await lease();
  await db.exec(
    "update claim_decision_emails set attempted_at=now()-interval '11 minutes',first_attempt_at=now()-interval '24 hours'",
  );
  expect((await lease()).rows).toHaveLength(0);
  expect(
    (
      await db.query<{ status: string }>(
        "select status from claim_decision_emails",
      )
    ).rows[0].status,
  ).toBe("review");
  await db.exec(
    "update claim_decision_emails set status='pending',first_attempt_at=null,available_at=now()",
  );
  const permanentLease = (await lease()).rows[0];
  await db.query(
    "select finish_claim_decision_email($1,$2,false,null,'provider_422',false,false)",
    [claim, permanentLease.lease_id],
  );
  expect((await lease()).rows).toHaveLength(0);
  expect(
    (
      await db.query<{ status: string }>(
        "select status from claim_decision_emails",
      )
    ).rows[0].status,
  ).toBe("blocked");
});
it("blocks missing/unverified email, suppresses changed email and cascades deletion", async () => {
  await db.exec("update auth.users set email_confirmed_at=null");
  await decide();
  expect((await lease()).rows).toHaveLength(0);
  expect(
    (
      await db.query<{ status: string }>(
        "select status from claim_decision_emails",
      )
    ).rows[0].status,
  ).toBe("blocked");
  await db.exec(
    "update auth.users set email_confirmed_at=now(); update claim_decision_emails set status='pending'; update auth.users set email='changed@example.test'",
  );
  expect((await lease()).rows).toHaveLength(0);
  await db.exec(`delete from venue_claims where id='${claim}'`);
  expect(
    (await db.query("select * from claim_decision_emails")).rows,
  ).toHaveLength(0);
});

it("preserves prior delivery uncertainty after a later explicit rate limit and recovers stale leases", async () => {
  await decide();
  const first = (await lease()).rows[0];
  await db.exec("set role service_role");
  await db.query(
    "select finish_claim_decision_email($1,$2,false,null,'provider_503',true,true)",
    [claim, first.lease_id],
  );
  await db.exec(
    "reset role; update claim_decision_emails set available_at=now(),first_attempt_at=now()-interval '22 hours'",
  );
  const next = (await lease()).rows[0];
  await db.exec("set role service_role");
  await db.query(
    "select finish_claim_decision_email($1,$2,false,null,'provider_429',false,true)",
    [claim, next.lease_id],
  );
  await db.exec(
    "reset role; update claim_decision_emails set available_at=now(),first_attempt_at=first_attempt_at-interval '2 hours'",
  );
  expect((await lease()).rows).toHaveLength(0);
  expect(
    (
      await db.query<{ status: string }>(
        "select status from claim_decision_emails",
      )
    ).rows[0].status,
  ).toBe("review");
  await db.exec(
    "update claim_decision_emails set status='pending',delivery_uncertain=false,first_attempt_at=null,available_at=now()",
  );
  const stale = (await lease()).rows[0];
  await db.exec(
    "update claim_decision_emails set attempted_at=now()-interval '11 minutes'",
  );
  const recovered = (await lease()).rows[0];
  expect(recovered.lease_id).not.toBe(stale.lease_id);
  expect(
    (
      await db.query<{ delivery_uncertain: boolean }>(
        "select delivery_uncertain from claim_decision_emails",
      )
    ).rows[0].delivery_uncertain,
  ).toBe(true);
});
it("keeps decision snapshots stable and caps retries for operator review", async () => {
  await decide();
  await db.exec(
    "update venues set name='Changed later'; update profiles set display_name='Changed later',preferred_locale='en'",
  );
  const row = (await lease()).rows[0];
  expect(row.payload).toMatchObject({
    venueName: "Example Venue",
    applicantName: "Applicant",
    locale: "es",
  });
  await db.exec("update claim_decision_emails set attempts=12");
  await db.query(
    "select finish_claim_decision_email($1,$2,false,null,'provider_503',true,true)",
    [claim, row.lease_id],
  );
  expect(
    (
      await db.query<{ status: string }>(
        "select status from claim_decision_emails",
      )
    ).rows[0].status,
  ).toBe("review");
  expect((await lease()).rows).toHaveLength(0);
});
