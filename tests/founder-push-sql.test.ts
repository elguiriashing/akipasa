import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";

let db: PGlite;
const uid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const token = (n: number) => `synthetic-fcm-device-token-${n}`;
type Job = {
  claim_id: string;
  device_id: string;
  lease_id: string;
  attempts: number;
};
async function service<T>(sql: string, params: unknown[] = []) {
  await db.exec("set role service_role");
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("reset role").catch(() => undefined);
  }
}
async function register(user = 1, session = 101, deviceToken = token(1)) {
  return (
    await service<{ id: string }>(
      "select public.register_founder_push_device($1,$2,$3) id",
      [uid(user), uid(session), deviceToken],
    )
  ).rows[0].id;
}
async function claim(n = 501, status = "pending") {
  await db.query(
    "insert into venue_claims(id,venue_id,claimant_id,status) values($1,$2,$3,$4)",
    [uid(n), uid(301), uid(4), status],
  );
}
async function lease(
  claimId: string | null = null,
  startedAt = "2000-01-01T00:00:00.000Z",
) {
  return (
    await service<Job>("select * from claim_due_push_deliveries($1,$2)", [
      claimId,
      startedAt,
    ])
  ).rows;
}
async function finish(job: Job, status: string, error: string | null = null) {
  return (
    await service<{ ok: boolean }>(
      "select finish_claim_push_delivery($1,$2,$3,$4,$5) ok",
      [job.claim_id, job.device_id, job.lease_id, status, error],
    )
  ).rows[0].ok;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema account_private;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create table auth.users(id uuid primary key,email text,deleted_at timestamptz,banned_until timestamptz);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,not_after timestamptz);
    create table profiles(id uuid primary key,app_role text,display_name text,phone text,birth_year integer,preferred_locale text,created_at timestamptz default now());
    create table account_private.onboarding(profile_id uuid,status text);
    create table cities(id uuid primary key,timezone text);
    create table venues(id uuid primary key,city_id uuid,name text,address text,slug text,discovery_vertical text,contact_phone text,website_url text);
    create table venue_claims(id uuid primary key,venue_id uuid,claimant_id uuid,evidence text,status text,claim_details jsonb default '{}',created_at timestamptz default now());
    grant usage on schema public,auth to authenticated,anon,service_role;
  `);
  await db.exec(
    readFileSync(
      "supabase/migrations/20261011010000_claim_submission_alerts.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261027001500_founder_push_claims.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("begin");
  for (let n = 1; n <= 10; n++) {
    await db.query("insert into auth.users(id) values($1)", [uid(n)]);
    await db.query(
      "insert into profiles(id,app_role,birth_year,preferred_locale) values($1,$2,1980,'es')",
      [uid(n), n === 4 ? "consumer" : n === 5 ? "moderator" : "administrator"],
    );
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [
      uid(100 + n),
      uid(n),
    ]);
    if (n !== 3)
      await db.query(
        "insert into admin_push_founders(user_id,active,adult_confirmed_at,confirmation_reference) values($1,true,now(),'synthetic-test-attestation')",
        [uid(n)],
      );
  }
  await db.exec(`
    insert into auth.sessions values('${uid(201)}','${uid(1)}',null);
    update profiles set birth_year=extract(year from now())::integer-17 where id='${uid(6)}';
    insert into account_private.onboarding values('${uid(7)}','underage');
    update auth.users set deleted_at=now() where id='${uid(8)}';
    update auth.users set banned_until=now()+interval '1 day' where id='${uid(9)}';
    update admin_push_founders set adult_confirmed_at=null where user_id='${uid(10)}';
    insert into venues(id,name,slug) values('${uid(301)}','Synthetic venue','synthetic-venue');
  `);
});
afterEach(async () => {
  await db.exec("reset role; rollback");
});

it("keeps both migration entrypoints identical after newline normalization", () => {
  const migration = "20261027001500_founder_push_claims.sql";
  const normalized = (path: string) =>
    readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  expect(normalized(`database/migrations/${migration}`)).toBe(
    normalized(`supabase/migrations/${migration}`),
  );
});

it("keeps all tokens, authorizations, audit and service RPCs inaccessible to browser roles", async () => {
  for (const role of ["anon", "authenticated"]) {
    for (const table of [
      "admin_push_devices",
      "claim_push_deliveries",
      "admin_push_founders",
      "admin_push_founder_audit",
    ]) {
      await db.exec(`set role ${role}; savepoint denied`);
      await expect(db.query(`select * from ${table}`)).rejects.toThrow(
        "permission denied",
      );
      await db.exec("rollback to savepoint denied; reset role");
    }
    for (const rpc of [
      "active_founder_push_eligible(null,null)",
      "register_founder_push_device(null,null,null)",
      "claim_due_push_deliveries()",
      "active_founder_push_device(null)",
      "reserve_founder_push_test(null,null,null)",
      "revoke_founder_push_device(null,null,null)",
    ]) {
      await db.exec(`set role ${role}; savepoint denied`);
      await expect(db.query(`select * from ${rpc}`)).rejects.toThrow(
        "permission denied",
      );
      await db.exec("rollback to savepoint denied; reset role");
    }
  }
  const rls = await db.query<{ enabled: boolean }>(
    "select bool_and(relrowsecurity) enabled from pg_class where relname in ('admin_push_devices','claim_push_deliveries','admin_push_founders','admin_push_founder_audit')",
  );
  expect(rls.rows[0].enabled).toBe(true);
});

it("requires an explicit founder grant, adult attestation, current admin and matching live session", async () => {
  for (const n of [3, 4, 5, 6, 7, 8, 9, 10]) {
    expect(
      (
        await service<{ ok: boolean }>(
          "select active_founder_push_eligible($1,$2) ok",
          [uid(n), uid(n + 100)],
        )
      ).rows[0].ok,
    ).toBe(false);
  }
  expect(
    (
      await service<{ ok: boolean }>(
        "select active_founder_push_eligible($1,$2) ok",
        [uid(1), uid(102)],
      )
    ).rows[0].ok,
  ).toBe(false);
  expect(
    (
      await service<{ ok: boolean }>(
        "select active_founder_push_eligible($1,$2) ok",
        [uid(1), uid(101)],
      )
    ).rows[0].ok,
  ).toBe(true);
  await db.exec("savepoint denied");
  await expect(register(3, 103)).rejects.toThrow("founder push unavailable");
  await db.exec("rollback to savepoint denied");
});

it("registers multiple devices idempotently with a bounded lease and no historical backfill", async () => {
  await claim();
  const first = await register();
  expect(await register()).toBe(first);
  expect(await register(1, 201, token(2))).not.toBe(first);
  expect(
    (await db.query("select * from admin_push_devices")).rows,
  ).toHaveLength(2);
  expect(await lease()).toHaveLength(0);
  const bound = await db.query<{ ok: boolean }>(
    "select bool_and(expires_at<=now()+interval '30 days') ok from admin_push_devices",
  );
  expect(bound.rows[0].ok).toBe(true);
});

it("queues one job per eligible device and retains the independent email fallback", async () => {
  await register();
  await register(1, 201, token(2));
  await register(2, 102, token(3));
  await claim();
  expect(
    (await db.query("select * from claim_push_deliveries")).rows,
  ).toHaveLength(3);
  expect(
    (await db.query("select * from claim_submission_alerts")).rows,
  ).toHaveLength(1);
  await db.exec(
    `update venue_claims set evidence='changed' where id='${uid(501)}'`,
  );
  expect(
    (await db.query("select * from claim_push_deliveries")).rows,
  ).toHaveLength(3);
  await claim(502, "approved");
  expect(
    (await db.query("select * from claim_push_deliveries")).rows,
  ).toHaveLength(3);
});

it("rebinds a token to a new account or session with a new identity and cancels old deliveries", async () => {
  const first = await register();
  await claim();
  const job = (await lease())[0];
  const second = await register(2, 102);
  expect(second).not.toBe(first);
  expect(
    (await db.query("select * from claim_push_deliveries")).rows,
  ).toHaveLength(0);
  expect(await finish(job, "sent")).toBe(false);
  const third = await register(1, 201);
  expect(third).not.toBe(second);
});

it("withdraws only the requested owner session and cannot revoke another founder", async () => {
  const first = await register();
  const other = await register(1, 201, token(2));
  expect(
    (
      await service<{ n: number }>(
        "select revoke_founder_push_device($1,$2,null) n",
        [uid(2), uid(101)],
      )
    ).rows[0].n,
  ).toBe(0);
  await db.exec(`update profiles set app_role='consumer' where id='${uid(1)}'`);
  expect(
    (
      await service<{ n: number }>(
        "select revoke_founder_push_device($1,$2,null) n",
        [uid(1), uid(101)],
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (await db.query<{ id: string }>("select id from admin_push_devices")).rows,
  ).toEqual([{ id: other }]);
  expect(first).not.toBe(other);
});

it("invalidates delivery after session expiry, deletion, demotion, age restriction or allowlist removal", async () => {
  const device = await register();
  for (const mutation of [
    `update auth.sessions set not_after=now() where id='${uid(101)}'`,
    `update profiles set app_role='consumer' where id='${uid(1)}'`,
    `update admin_push_founders set active=false where user_id='${uid(1)}'`,
    `update admin_push_founders set adult_confirmed_at=null where user_id='${uid(1)}'`,
    `update auth.users set banned_until=now()+interval '1 day' where id='${uid(1)}'`,
    `insert into account_private.onboarding values('${uid(1)}','underage')`,
    `update profiles set birth_year=extract(year from now())::integer-12 where id='${uid(1)}'`,
    `update admin_push_devices set expires_at=now() where id='${device}'`,
  ]) {
    await db.exec("savepoint invalidation");
    await claim();
    await db.exec(mutation);
    expect(
      (await service("select * from active_founder_push_device($1)", [device]))
        .rows,
    ).toHaveLength(0);
    expect(await lease()).toHaveLength(0);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from claim_push_deliveries",
        )
      ).rows[0].status,
    ).toBe("blocked");
    await db.exec("rollback to savepoint invalidation");
  }
  await claim();
  await db.exec(`delete from auth.sessions where id='${uid(101)}'`);
  expect(
    (await db.query("select * from admin_push_devices")).rows,
  ).toHaveLength(0);
  expect(await lease()).toHaveLength(0);
});

it("leases a claim once and acknowledges only its exact current lease", async () => {
  await register();
  await claim();
  await claim(502);
  const jobs = await lease(uid(501));
  expect(jobs).toHaveLength(1);
  expect(await lease(uid(501))).toHaveLength(0);
  expect(await lease(uid(502))).toHaveLength(1);
  expect(await finish({ ...jobs[0], lease_id: uid(999) }, "sent")).toBe(false);
  expect(await finish(jobs[0], "sent")).toBe(true);
  expect(await finish(jobs[0], "sent")).toBe(false);
  expect(await lease(uid(501))).toHaveLength(0);
});

it("backs off explicit retryable failures, caps attempts, and never retries ambiguous leases", async () => {
  await register();
  await claim();
  let job = (await lease())[0];
  await finish(job, "failed", "fcm_provider_503");
  expect(await lease()).toHaveLength(0);
  for (let attempt = 2; attempt <= 6; attempt++) {
    await db.exec("update claim_push_deliveries set available_at=now()");
    job = (await lease())[0];
    expect(job.attempts).toBe(attempt);
    await finish(job, "failed", "fcm_provider_503");
  }
  expect(
    (
      await db.query<{ status: string }>(
        "select status from claim_push_deliveries",
      )
    ).rows[0].status,
  ).toBe("blocked");
  await claim(502);
  const ambiguous = (await lease())[0];
  await db.exec(
    `update claim_push_deliveries set attempted_at=now()-interval '11 minutes' where claim_id='${uid(502)}'`,
  );
  expect(await lease()).toHaveLength(0);
  expect(await finish(ambiguous, "sent")).toBe(false);
});

it("blocks stale and resolved claims before leasing", async () => {
  await register();
  await claim();
  await claim(502);
  await db.exec(
    `update claim_push_deliveries set created_at=now()-interval '2 hours' where claim_id='${uid(501)}'; update venue_claims set status='approved' where id='${uid(502)}'`,
  );
  expect(await lease()).toHaveLength(0);
});

it("fails closed without a finite activation cutoff at or before the current time", async () => {
  await register();
  await claim();
  expect(
    (await service("select * from claim_due_push_deliveries()")).rows,
  ).toHaveLength(0);
  expect(
    (await service("select * from claim_due_push_deliveries(null,null)")).rows,
  ).toHaveLength(0);
  expect(
    (
      await service(
        "select * from claim_due_push_deliveries(null,now()+interval '1 second')",
      )
    ).rows,
  ).toHaveLength(0);
  for (const invalid of ["infinity", "-infinity"]) {
    expect(
      (
        await service("select * from claim_due_push_deliveries(null,$1)", [
          invalid,
        ])
      ).rows,
    ).toHaveLength(0);
  }
  expect(
    (
      await db.query<{ status: string; attempts: number }>(
        "select status,attempts from claim_push_deliveries",
      )
    ).rows,
  ).toEqual([{ status: "pending", attempts: 0 }]);
});

it("blocks claims and dark-launch jobs from before activation, including retries", async () => {
  await register();
  for (let n = 501; n <= 506; n++) await claim(n);
  const startedAt = (
    await db.query<{ started_at: string }>(
      "select (now()-interval '30 seconds')::text started_at",
    )
  ).rows[0].started_at;
  await db.exec(`
    update venue_claims set created_at=now()-interval '31 seconds' where id in ('${uid(501)}','${uid(504)}');
    update claim_push_deliveries set created_at=now()-interval '31 seconds' where claim_id in ('${uid(502)}','${uid(503)}');
    update claim_push_deliveries set status='failed',attempts=1 where claim_id in ('${uid(503)}','${uid(504)}');
    update venue_claims set created_at=now()-interval '30 seconds' where id='${uid(505)}';
    update claim_push_deliveries set created_at=now()-interval '30 seconds' where claim_id='${uid(505)}';
  `);
  expect((await lease(null, startedAt)).map((job) => job.claim_id)).toEqual([
    uid(505),
    uid(506),
  ]);
  expect(
    (
      await db.query<{ claim_id: string }>(
        "select claim_id from claim_push_deliveries where status='blocked' order by claim_id",
      )
    ).rows.map((job) => job.claim_id),
  ).toEqual([uid(501), uid(502), uid(503), uid(504)]);
});

it("reserves a rate-limited real-device test only for its exact owner session without creating claims", async () => {
  const device = await register();
  expect(
    (
      await service("select * from reserve_founder_push_test($1,$2,$3)", [
        uid(2),
        uid(102),
        device,
      ])
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await service("select * from reserve_founder_push_test($1,$2,$3)", [
        uid(1),
        uid(201),
        device,
      ])
    ).rows,
  ).toHaveLength(0);
  const result = await service<{
    test_id: string;
    session_id: string;
    locale: string;
  }>("select * from reserve_founder_push_test($1,$2,$3)", [
    uid(1),
    uid(101),
    device,
  ]);
  expect(result.rows[0]).toMatchObject({ session_id: uid(101), locale: "es" });
  expect(result.rows[0].test_id).toMatch(/^[a-f0-9-]{36}$/);
  expect(
    (
      await service("select * from reserve_founder_push_test($1,$2,$3)", [
        uid(1),
        uid(101),
        device,
      ])
    ).rows,
  ).toHaveLength(0);
  expect((await db.query("select * from venue_claims")).rows).toHaveLength(0);
});

it("opens the exact pending claim outside page one only for staff", async () => {
  for (let n = 501; n <= 525; n++) await claim(n);
  await db.exec(
    `set role authenticated; select set_config('test.uid','${uid(1)}',true)`,
  );
  const result = await db.query<{ id: string }>(
    "select * from staff_pending_venue_claim_by_id($1)",
    [uid(525)],
  );
  expect(result.rows[0].id).toBe(uid(525));
  await db.exec(
    `select set_config('test.uid','${uid(4)}',true); savepoint denied`,
  );
  await expect(
    db.query("select * from staff_pending_venue_claim_by_id($1)", [uid(525)]),
  ).rejects.toThrow("staff role required");
  await db.exec("rollback to savepoint denied; reset role");
});

it("audits founder authorization changes while denying service-role audit rewriting", async () => {
  await service(
    "update admin_push_founders set active=false where user_id=$1",
    [uid(1)],
  );
  const audit = await service<{ active: boolean }>(
    "select active from admin_push_founder_audit where user_id=$1 and operation='UPDATE'",
    [uid(1)],
  );
  expect(audit.rows).toEqual([{ active: false }]);
  await db.exec("savepoint denied");
  await expect(service("delete from admin_push_founder_audit")).rejects.toThrow(
    "permission denied",
  );
  await db.exec("rollback to savepoint denied");
});

it("wakes only a fixed first-party endpoint with claim metadata and survives wake failures", async () => {
  await db.exec(`
    create schema vault; create schema net;
    create table vault.decrypted_secrets(name text,decrypted_secret text);
    create table net.requests(url text,body jsonb,headers jsonb);
    create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds integer default 5000)
    returns bigint language plpgsql as $$ begin insert into net.requests values(url,body,headers); return 1; end $$;
  `);
  await register();
  await claim();
  expect((await db.query("select * from net.requests")).rows).toHaveLength(0);
  await db.exec(
    "insert into vault.decrypted_secrets values('akipasa_push_webhook_secret','synthetic-secret-at-least-32-characters')",
  );
  await claim(502);
  expect(
    (
      await db.query<{ url: string; body: unknown }>(
        "select url,body from net.requests",
      )
    ).rows,
  ).toEqual([
    {
      url: "https://akipasa.com/api/internal/founder-push/wake",
      body: { claim_id: uid(502) },
    },
  ]);
  await db.exec(
    "create or replace function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds integer default 5000) returns bigint language plpgsql as $$ begin raise exception 'synthetic failure'; end $$",
  );
  await claim(503);
  expect(
    (await db.query("select * from claim_submission_alerts")).rows,
  ).toHaveLength(3);
  expect(
    (await db.query("select * from claim_push_deliveries")).rows,
  ).toHaveLength(3);
});
