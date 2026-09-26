import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
  stripeSubscriptionPeriodEnd,
  stripeProcessingError,
} from "../src/lib/stripe";

const owner = "10000000-0000-4000-8000-000000000001";
const stranger = "10000000-0000-4000-8000-000000000002";
const venue = "20000000-0000-4000-8000-000000000001";
const migration = (name: string) =>
  readFileSync(`database/migrations/${name}`, "utf8");
function extract(source: string, name: string) {
  const start = source.indexOf(`create or replace function ${name}(`);
  if (start < 0) throw new Error(`Missing fixture function ${name}`);
  return source.slice(start, source.indexOf("$$;", start) + 3);
}
let db: PGlite;
beforeAll(async () => {
  db = new PGlite({ extensions: { unaccent } });
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create type app_role as enum ('consumer','organiser','moderator','administrator');
    create table profiles(id uuid primary key,app_role app_role default 'consumer',business_plan_active boolean default false,business_tier text default 'none',updated_at timestamptz);
    create table venues(id uuid primary key,slug text,name text,address text,discovery_vertical text default 'activities',verified boolean default false,status text default 'published');
    create table venue_members(venue_id uuid references venues,profile_id uuid references profiles,role text,primary key(venue_id,profile_id));
    create table venue_claims(id uuid primary key default gen_random_uuid(),venue_id uuid,claimant_id uuid,status text default 'pending',decided_by uuid,decided_at timestamptz,decision_reason text);
    create table billing_subscriptions(stripe_subscription_id text primary key,profile_id uuid references profiles,stripe_customer_id text,plan_code text,billing_interval text,status text,current_period_end timestamptz,cancel_at_period_end boolean,updated_at timestamptz default now());
    create table staff_billing_grants(profile_id uuid,plan_code text,grant_kind text,active boolean,expires_at timestamptz,created_at timestamptz default now());
    create table business_applications(applicant_id uuid,state text,payment_state text,updated_at timestamptz);
    create table stripe_webhook_events(event_id text primary key,event_type text,state text default 'processing',error text,processed_at timestamptz);
    insert into profiles(id) values ('${owner}'),('${stranger}');
    insert into venues(id,slug,name,address) values('${venue}','casa-flores','CASA FLORES','CALLE REGALADO 9, Valladolid, 47002, España');
  `);
  const legacy = migration("0074_crm_multi_tenant_workspaces.sql");
  await db.exec(extract(legacy, "public.has_active_entitlement"));
  await db.exec(extract(legacy, "public.reconcile_profile_entitlements"));
  await db.exec(extract(legacy, "public.sync_stripe_subscription"));
  await db.exec(
    extract(
      migration("0033_premium_entitlements.sql"),
      "sync_profile_entitlements_from_billing",
    ),
  );
  await db.exec(migration("0082_free_venue_access_and_billing_repair.sql"));
  await db.exec(migration("0083_catalogue_venue_search.sql"));
}, 30000);
afterAll(async () => {
  await db?.close();
});

describe("ownership and paid subscription database contracts", () => {
  it("grants free access only after verification, revokes ownership access, and never grants Pro", async () => {
    await db.exec(
      `insert into venue_members values('${venue}','${owner}','owner');`,
    );
    expect(
      (
        await db.query(
          `select has_active_entitlement('${owner}','business') as active`,
        )
      ).rows,
    ).toEqual([{ active: false }]);
    await db.exec(`update venues set verified=true where id='${venue}';`);
    expect(
      (
        await db.query(
          `select app_role,business_plan_active,business_tier from profiles where id='${owner}'`,
        )
      ).rows,
    ).toEqual([
      {
        app_role: "organiser",
        business_plan_active: true,
        business_tier: "business",
      },
    ]);
    expect(
      (
        await db.query(
          `select has_active_entitlement('${owner}','business_pro') as pro,has_active_entitlement('${stranger}','business') as other`,
        )
      ).rows,
    ).toEqual([{ pro: false, other: false }]);
    await db.exec(`delete from venue_members where profile_id='${owner}';`);
    expect(
      (
        await db.query(
          `select business_plan_active from profiles where id='${owner}'`,
        )
      ).rows,
    ).toEqual([{ business_plan_active: false }]);
  });

  it("syncs a subscription, ignores old events, cancels paid access but preserves free ownership", async () => {
    const sync = (status: string, time: string) =>
      db.query(
        `select sync_stripe_subscription('sub_fixture','${owner}','cus_fixture','business','month',$1,now()+interval '30 days',false,$2::timestamptz)`,
        [status, time],
      );
    await sync("active", "2026-09-26T10:00:00Z");
    expect(
      (
        await db.query(
          `select business_plan_active from profiles where id='${owner}'`,
        )
      ).rows,
    ).toEqual([{ business_plan_active: true }]);
    await sync("canceled", "2026-09-26T09:00:00Z");
    expect(
      (await db.query(`select status from billing_subscriptions`)).rows,
    ).toEqual([{ status: "active" }]);
    await db.exec(
      `insert into venue_members values('${venue}','${owner}','owner');`,
    );
    await sync("canceled", "2026-09-26T11:00:00Z");
    expect(
      (
        await db.query(
          `select business_plan_active from profiles where id='${owner}'`,
        )
      ).rows,
    ).toEqual([{ business_plan_active: true }]);
    await db.exec(`delete from venue_members where profile_id='${owner}';`);
    expect(
      (
        await db.query(
          `select business_plan_active from profiles where id='${owner}'`,
        )
      ).rows,
    ).toEqual([{ business_plan_active: false }]);
  });

  it("lets a consumer submit only their own pending claim", async () => {
    await db.exec(
      `alter table venue_claims enable row level security; grant usage on schema public,auth to authenticated; grant insert on venue_claims to authenticated; set role authenticated; select set_config('test.uid','${stranger}',false);`,
    );
    await db.exec(
      `insert into venue_claims(venue_id,claimant_id) values('${venue}','${stranger}');`,
    );
    await expect(
      db.exec(
        `insert into venue_claims(venue_id,claimant_id,status) values('${venue}','${stranger}','approved');`,
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.exec(
        `insert into venue_claims(venue_id,claimant_id) values('${venue}','${owner}');`,
      ),
    ).rejects.toThrow(/row-level security/);
    await db.exec("reset role;");
  });

  it("retries failed and stale webhooks without acknowledging in-flight work", async () => {
    await db.query(
      `select claim_stripe_webhook_event('evt_fixture','customer.subscription.created')`,
    );
    await expect(
      db.query(
        `select claim_stripe_webhook_event('evt_fixture','customer.subscription.created')`,
      ),
    ).rejects.toThrow(/in progress/);
    await db.exec(
      `update stripe_webhook_events set processing_started_at=now()-interval '6 minutes';`,
    );
    expect(
      (
        await db.query(
          `select claim_stripe_webhook_event('evt_fixture','customer.subscription.created') as claimed`,
        )
      ).rows,
    ).toEqual([{ claimed: true }]);
    await db.exec(`update stripe_webhook_events set state='failed';`);
    expect(
      (
        await db.query(
          `select claim_stripe_webhook_event('evt_fixture','customer.subscription.created') as claimed`,
        )
      ).rows,
    ).toEqual([{ claimed: true }]);
    await db.exec(`update stripe_webhook_events set state='processed';`);
    expect(
      (
        await db.query(
          `select claim_stripe_webhook_event('evt_fixture','customer.subscription.created') as claimed`,
        )
      ).rows,
    ).toEqual([{ claimed: false }]);
  });
});

describe("full catalogue search", () => {
  it("finds exact, city, accented and address queries beyond a large candidate pool", async () => {
    await db.exec(`insert into venues(id,slug,name,address) select gen_random_uuid(),'casa-'||n,'Casa A '||n,'Málaga, España' from generate_series(1,300) n;
      insert into venues(id,slug,name,address,discovery_vertical) values(gen_random_uuid(),'stay-fixture','Casa Zeta','Sevilla','accommodation');
      insert into venues(id,slug,name,address,status) values(gen_random_uuid(),'hidden','Casa Hidden','Valladolid','pending');`);
    for (const query of [
      "Casa Flores",
      "Casa Flores, Valladolid",
      "Calle Regalado 9 Valladolid 47002",
    ]) {
      const result = await db.query<{ slug: string }>(
        `select slug from search_public_venues($1,0,25)`,
        [query],
      );
      expect(result.rows.map((row) => row.slug)).toEqual(["casa-flores"]);
    }
    expect(
      (await db.query(`select * from search_public_venues('Casa Malaga',0,25)`))
        .rows,
    ).toHaveLength(25);
    await db.exec(
      `update venues set name='Café Niño' where slug='stay-fixture';`,
    );
    expect(
      (
        await db.query<{ slug: string }>(
          `select slug from search_public_venues('cafe nino',0,25)`,
        )
      ).rows,
    ).toEqual([{ slug: "stay-fixture" }]);
  });
  it("paginates every match once, including accommodation, and excludes unpublished rows", async () => {
    await db.exec(
      `update venues set name='Casa Zeta' where slug='stay-fixture';`,
    );
    const ids: string[] = [];
    for (let offset = 0; offset < 302; offset += 25) {
      const result = await db.query<{ id: string; total: number }>(
        `select * from search_public_venues('Casa', $1,25)`,
        [offset],
      );
      expect(Number(result.rows[0].total)).toBe(302);
      ids.push(...result.rows.map((row) => row.id));
    }
    expect(ids).toHaveLength(302);
    expect(new Set(ids).size).toBe(302);
    expect(ids).toContain(venue);
    await db.exec(
      `alter table venues enable row level security; create policy published on venues for select using(status='published'); grant select on venues to anon; set role anon;`,
    );
    expect(
      (await db.query(`select * from search_public_venues('Casa Hidden',0,25)`))
        .rows,
    ).toHaveLength(0);
    await db.exec("reset role;");
  });
});

it("reads current and legacy Stripe renewal dates and preserves database error messages", () => {
  const date = 1800000000;
  expect(
    stripeSubscriptionPeriodEnd({
      items: { data: [{ current_period_end: date }] },
    }),
  ).toBe(new Date(date * 1000).toISOString());
  expect(stripeSubscriptionPeriodEnd({ current_period_end: date })).toBe(
    new Date(date * 1000).toISOString(),
  );
  expect(() => stripeSubscriptionPeriodEnd({})).toThrow(/missing/);
  expect(stripeProcessingError({ message: "column does not exist" })).toBe(
    "column does not exist",
  );
});
