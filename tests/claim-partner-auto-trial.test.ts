import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

let db: PGlite;
const uuid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const applicant = uuid(1);
const stranger = uuid(2);
const venue = uuid(3);
const claim = uuid(4);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema akisuite_listing_private;
    create schema akisuite_private;
    create function auth.uid() returns uuid language sql as
      $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create table public.profiles(id uuid primary key,app_role text);
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz);
    create table public.venues(id uuid primary key,discovery_vertical text);
    create table public.venue_claims(id uuid primary key,venue_id uuid references public.venues(id),
      claimant_id uuid references public.profiles(id),status text);
    create table public.venue_members(venue_id uuid,profile_id uuid,role text,
      primary key(venue_id,profile_id));
    create table public.crm_workspaces(id text primary key,status text,owner_profile_id uuid,source_venue_id uuid);
    create table public.crm_workspace_venues(workspace_id text,venue_id uuid);
    create table public.billing_subscriptions(profile_id uuid,plan_code text,status text,current_period_end timestamptz);
    create table public.staff_billing_grants(profile_id uuid,plan_code text,active boolean,starts_at timestamptz,expires_at timestamptz);
    create function public.account_features_allowed() returns boolean language sql stable as
      $$select auth.uid() is not null$$;
    create function akisuite_listing_private.listing_premium(p_venue uuid)
      returns boolean language sql stable as $$select false$$;
    grant usage on schema auth, public to authenticated,anon,service_role;
    grant select on public.venue_claims to authenticated;
    insert into public.profiles values ('${applicant}','consumer'),('${stranger}','consumer');
    insert into auth.users values ('${applicant}','person@example.test',now(),null),
       ('${stranger}','other@example.test',now(),null);
    insert into public.venues values ('${venue}','venue');
  `);
  await db.exec(
    readFileSync(
      "database/migrations/20261027031500_claim_early_partner_feedback.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "database/migrations/20261027081500_claim_partner_auto_trial.sql",
      "utf8",
    ),
  );
}, 30000);

beforeEach(async () => {
  await db.exec(`
    reset role;
    select set_config('test.uid','',false);
    delete from public.claim_partner_rewards;
    delete from public.claim_owner_feedback;
    delete from public.venue_claims;
    delete from public.venue_members;
    delete from public.billing_subscriptions;
    delete from public.staff_billing_grants;
    update public.claim_partner_campaign set enabled=true,max_grants=25;
    update auth.users set email_confirmed_at=now(),deleted_at=null;
    insert into public.venue_claims values ('${claim}','${venue}','${applicant}','approved');
    insert into public.venue_members values ('${venue}','${applicant}','owner');
  `);
});

afterAll(async () => {
  await db?.close();
});

async function feedback(actor = applicant) {
  await db.exec(
    `set role authenticated; select set_config('test.uid','${actor}',false)`,
  );
  try {
    return await db.query(
      `insert into public.claim_owner_feedback
       (claim_id,claimant_id,discovery_source,priority_need,comments)
       values ($1,$2,'google_search','events','Would love event repeats')
       on conflict (claim_id) do update set comments=excluded.comments`,
      [claim, actor],
    );
  } finally {
    await db.exec("reset role; select set_config('test.uid','',false)");
  }
}

async function status() {
  const { rows } = await db.query<{ state: string; expires_at: string | null }>(
    "select state,expires_at from public.claim_partner_rewards where claim_id=$1",
    [claim],
  );
  return rows[0] || null;
}

it("grants exactly three months to the verified approved venue owner, without Stripe writes", async () => {
  await feedback();
  expect((await status())?.state).toBe("granted");
  const { rows } = await db.query<{ days: number }>(
    `select extract(epoch from(expires_at-granted_at))/86400 as days
       from public.claim_partner_rewards where claim_id=$1`,
    [claim],
  );
  expect(Number(rows[0].days)).toBeGreaterThan(88);
  expect(Number(rows[0].days)).toBeLessThan(94);
  expect(
    (await db.query("select * from public.billing_subscriptions")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select * from public.staff_billing_grants")).rows,
  ).toHaveLength(0);
  await feedback();
  expect(
    (await db.query("select * from public.claim_partner_rewards")).rows,
  ).toHaveLength(1);
});

it("requires approved ownership and never grants to a different authenticated user", async () => {
  await db.exec("update public.venue_claims set status='pending'");
  await expect(feedback()).rejects.toThrow();
  await db.exec("update public.venue_claims set status='approved'");
  await expect(feedback(stranger)).rejects.toThrow();
  expect(
    (await db.query("select * from public.claim_partner_rewards")).rows,
  ).toHaveLength(0);
});

it("fails closed when email is unverified and can grant after verification and feedback retry", async () => {
  await db.exec(
    `update auth.users set email_confirmed_at=null where id='${applicant}'`,
  );
  await feedback();
  expect((await status())?.state).toBe("pending");
  await db.exec(
    `update auth.users set email_confirmed_at=now() where id='${applicant}'`,
  );
  await feedback();
  expect((await status())?.state).toBe("granted");
});

it("does not replace existing paid Premium, and expires independently", async () => {
  await db.exec(
    `insert into public.billing_subscriptions values ('${applicant}','business','active',now()+interval '60 days')`,
  );
  await feedback();
  expect((await status())?.state).toBe("pending");
  await db.exec(`delete from public.billing_subscriptions`);
  await feedback();
  expect((await status())?.state).toBe("granted");
  await db.exec(
    `update public.claim_partner_rewards set expires_at=now()-interval '1 day' where claim_id='${claim}'`,
  );
  await db.exec(`select set_config('test.uid','${applicant}',false)`);
  const { rows } = await db.query<{ premium: boolean }>(
    "select akisuite_listing_private.listing_premium($1) premium",
    [venue],
  );
  expect(rows[0].premium).toBe(false);
});

it("obeys campaign capacity without silently activating a paid plan", async () => {
  await db.exec("update public.claim_partner_campaign set max_grants=0");
  await feedback();
  expect((await status())?.state).toBe("pending");
  await db.exec("update public.claim_partner_campaign set max_grants=1");
  await feedback();
  expect((await status())?.state).toBe("granted");
});

it("does not expose the raw rewards table and scopes status by signed-in claimant", async () => {
  await feedback();
  await db.exec(
    `set role authenticated; select set_config('test.uid','${stranger}',false)`,
  );
  try {
    await expect(
      db.query("select * from public.claim_partner_rewards"),
    ).rejects.toThrow();
    const { rows } = await db.query<{ result: Record<string, string> | null }>(
      "select public.claim_partner_reward_status($1) result",
      [claim],
    );
    expect(rows[0].result).toBe(null);
  } finally {
    await db.exec("reset role; select set_config('test.uid','',false)");
  }
});
