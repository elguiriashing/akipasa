import { beforeAll, afterAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { eventStayHref, nearbyEventsHref } from "../src/lib/trip-links";
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const person = uid(1),
  staff = uid(2),
  venue = uid(3),
  program = uid(4),
  reward = uid(5),
  token = uid(6);
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
 create table profiles(id uuid primary key);
 create domain geography as float8;create domain geometry as float8;
 -- Geometry substitutes are limited to testing RPC validation/control flow, not spatial accuracy.
 create function st_makepoint(float8,float8) returns float8 language sql as $$ select $2 $$;
 create function st_setsrid(float8,int) returns float8 language sql as $$ select $1 $$;
 create function st_distance(geography,geography) returns float8 language sql as $$ select abs($1-$2)*111000 $$;
 create table venues(id uuid primary key,location geography,status text,verified boolean);
 create table venue_checkin_credentials(id uuid primary key,venue_id uuid,token uuid,active boolean);
 create table check_ins(id uuid primary key default gen_random_uuid(),profile_id uuid,venue_id uuid,idempotency_key uuid,state text,risk_flags text[],distance_meters int,location_accuracy_meters int,credential_id uuid,created_at timestamptz default now(),unique(profile_id,idempotency_key));
 create table loyalty_programs(id uuid primary key,venue_id uuid,stamps_required int,active boolean);
 create table business_rewards(id uuid primary key,venue_id uuid,claim_window_days int,active boolean);
 create table loyalty_program_rewards(program_id uuid,reward_id uuid);
 create table loyalty_ledger(id uuid default gen_random_uuid(),profile_id uuid,program_id uuid,check_in_id uuid,delta int,reason text,created_at timestamptz default now(),unique(check_in_id,program_id));
 create table reward_claims(id uuid primary key default gen_random_uuid(),profile_id uuid,reward_id uuid,program_id uuid,enrollment_id uuid,claim_code uuid default gen_random_uuid(),status text default 'ready',created_at timestamptz default now(),expires_at timestamptz,redeemed_at timestamptz);
 create table passport_enrollments(id uuid primary key,profile_id uuid,passport_id uuid,state text,expires_at timestamptz,completed_at timestamptz);
 create table passport_rewards(passport_id uuid,reward_id uuid,access_tier text);
 create table passport_steps(id uuid,passport_id uuid,venue_id uuid);
 create table passport_progress(profile_id uuid,step_id uuid,check_in_id uuid,enrollment_id uuid);
 create table xp_ledger(profile_id uuid,check_in_id uuid,delta int,reason text,idempotency_key text);
 create table behaviour_events(event_type text,received_at timestamptz,entity_type text,entity_id uuid);
 create table events(id uuid,venue_id uuid);
 create function has_active_entitlement(uuid,text) returns boolean language sql as $$ select false $$;
 create function is_venue_member(uuid) returns boolean language sql as $$ select auth.uid()='${staff}'::uuid and $1='${venue}'::uuid $$;
 insert into profiles values('${person}'),('${staff}');
 insert into venues values('${venue}',36,'published',true);
 insert into venue_checkin_credentials values('${token}','${venue}','${token}',true);
 insert into loyalty_programs values('${program}','${venue}',3,true);
 insert into business_rewards values('${reward}','${venue}',30,true);
 insert into loyalty_program_rewards values('${program}','${reward}');
 select set_config('test.uid','${person}',false);
 `);
  const sql = readFileSync(
    new URL(
      "../database/migrations/0084_product_readiness_loyalty_reporting.sql",
      import.meta.url,
    ),
    "utf8",
  );
  // Viewport PostGIS is validated against the real deployed database separately.
  await db.exec(
    sql.slice(
      0,
      sql.indexOf("create or replace function public.public_stay_viewport"),
    ) + "commit;",
  );
}, 30000);
afterAll(async () => db.close());
it("rejects missing/non-finite locations and missing idempotency before issuing value", async () => {
  for (const [lat, lng, accuracy] of [
    [null, 0, 10],
    [36, null, 10],
    [36, 0, null],
    ["NaN", 0, 10],
    ["Infinity", 0, 10],
    [91, 0, 10],
    [36, 181, 10],
    [36, 0, 501],
  ]) {
    await expect(
      db.query(
        "select check_in_by_token($1,$2,$3::float8,$4::float8,$5::int)",
        [token, uid(7), lat, lng, accuracy],
      ),
    ).rejects.toThrow("valid precise location");
  }
  await expect(
    db.query("select check_in_by_token($1,null,36,0,10)", [token]),
  ).rejects.toThrow("idempotency");
  expect(
    (await db.query("select count(*)::int n from loyalty_ledger")).rows,
  ).toEqual([{ n: 0 }]);
});
it("rejects unusable venue locations and preserves geofence replay outcomes", async () => {
  await db.exec(`update venues set location=null;`);
  await expect(
    db.query("select check_in_by_token($1,$2,36,0,10)", [token, uid(7)]),
  ).rejects.toThrow("venue location");
  await db.exec("update venues set location=36;");
  for (let i = 0; i < 2; i++) {
    const r = await db.query<{ v: { state: string } }>(
      "select check_in_by_token($1,$2,38,0,10) v",
      [token, uid(7)],
    );
    expect(r.rows[0].v.state).toBe("outside_geofence");
  }
  expect(
    (await db.query("select count(*)::int n from loyalty_ledger")).rows[0],
  ).toEqual({ n: 0 });
});
it("awards a replayed valid check-in once and enforces cooldown across credentials", async () => {
  for (let i = 0; i < 2; i++)
    await db.query("select check_in_by_token($1,$2,36,0,10)", [token, uid(8)]);
  const r = await db.query<{ v: { state: string } }>(
    "select check_in_by_token($1,$2,36,0,10) v",
    [token, uid(9)],
  );
  expect(r.rows[0].v.state).toBe("cooldown");
  expect(
    (await db.query("select sum(delta)::int n from loyalty_ledger")).rows[0],
  ).toEqual({ n: 1 });
});
it("keeps one ready stamp claim, freezes its cost, and redeems only once", async () => {
  await db.exec(
    `insert into loyalty_ledger(profile_id,program_id,delta) values('${person}','${program}',2);`,
  );
  const claim = await db.query<{ id: string }>(
    "select claim_stamp_reward($1,$2) id",
    [program, reward],
  );
  expect(
    (await db.query("select claim_stamp_reward($1,$2) id", [program, reward]))
      .rows,
  ).toEqual(claim.rows);
  const code = (
    await db.query<{ claim_code: string }>(
      "select claim_code from reward_claims where id=$1",
      [claim.rows[0].id],
    )
  ).rows[0].claim_code;
  await expect(
    db.query("select redeem_reward_claim($1)", [code]),
  ).rejects.toThrow("venue access");
  await db.exec(
    `update loyalty_programs set stamps_required=8; select set_config('test.uid','${staff}',false);`,
  );
  await db.query("select redeem_reward_claim($1)", [code]);
  await db.query("select redeem_reward_claim($1)", [code]);
  expect(
    (await db.query("select sum(delta)::int n from loyalty_ledger")).rows[0],
  ).toEqual({ n: 0 });
  await db.exec(`select set_config('test.uid','${person}',false);`);
  await expect(
    db.query("select claim_stamp_reward($1,$2)", [program, reward]),
  ).rejects.toThrow("not enough stamps");
});
it("denies cross-venue owner reports and returns aggregate metrics to the owner", async () => {
  await expect(
    db.query("select venue_owner_results($1)", [venue]),
  ).rejects.toThrow("venue access");
  await db.exec(`select set_config('test.uid','${staff}',false);`);
  const r = await db.query<{
    v: { accepted_checkins: number; rewards_redeemed: number };
  }>("select venue_owner_results($1) v", [venue]);
  expect(r.rows[0].v.accepted_checkins).toBe(1);
  expect(r.rows[0].v.rewards_redeemed).toBe(1);
  await expect(
    db.query("select venue_owner_results($1)", [uid(99)]),
  ).rejects.toThrow("venue access");
});
it("carries event destination and Madrid dates into stays and back", () => {
  const url = new URL(
    eventStayHref(
      "es",
      "malaga",
      "2026-09-26T23:30:00Z",
      "2026-09-27T02:00:00Z",
    ),
  );
  expect(url.searchParams.get("checkIn")).toBe("2026-09-27");
  expect(url.searchParams.get("checkOut")).toBe("2026-09-28");
  const back = new URL(
    nearbyEventsHref("es", "Málaga", "2026-09-27", "2026-09-28"),
  );
  expect(back.searchParams.get("locality")).toBe("malaga");
  expect(back.searchParams.get("dateFrom")).toBe("2026-09-27");
});

it("makes passport issuance idempotent and rejects expired or foreign enrollments", async () => {
  await db.exec(`select set_config('test.uid','${person}',false);
    insert into passport_enrollments values('${uid(40)}','${person}','${uid(41)}','completed',now()+interval '1 day',now()),('${uid(42)}','${person}','${uid(41)}','completed',now()-interval '1 day',now()),('${uid(43)}','${staff}','${uid(41)}','completed',now()+interval '1 day',now());
    insert into passport_rewards values('${uid(41)}','${reward}','free');`);
  const first = await db.query("select claim_passport_reward($1,$2) id", [
    uid(40),
    reward,
  ]);
  expect(
    (
      await db.query("select claim_passport_reward($1,$2) id", [
        uid(40),
        reward,
      ])
    ).rows,
  ).toEqual(first.rows);
  await expect(
    db.query("select claim_passport_reward($1,$2)", [uid(42), reward]),
  ).rejects.toThrow("reward unavailable");
  await expect(
    db.query("select claim_passport_reward($1,$2)", [uid(43), reward]),
  ).rejects.toThrow("reward unavailable");
});
