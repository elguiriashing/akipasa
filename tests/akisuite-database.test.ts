import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const owner = "10000000-0000-4000-8000-000000000001";
const member = "10000000-0000-4000-8000-000000000002";
const outsider = "10000000-0000-4000-8000-000000000003";
let db: PGlite;
async function value(sql: string) {
  return (await db.query<{ value: boolean }>(sql)).rows[0]?.value;
}
async function asUser(id: string, sql: string) {
  await db.exec(
    `set role authenticated; select set_config('test.uid','${id}',false)`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
async function sync(
  id: string,
  plan: string,
  status = "active",
  workspace: string | null = "ws_one",
  timestamp = "2030-01-01",
) {
  return db.query(
    "select public.sync_akisuite_subscription($1,$2,'cus_owner',$3,'month',$4,'2040-01-01',false,$5,$6) as value",
    [id, owner, plan, status, timestamp, workspace],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    grant usage on schema auth to authenticated,service_role;
    create table public.profiles(id uuid primary key,app_role text,membership_tier text default 'free');
    create table public.crm_workspaces(id text primary key,owner_profile_id uuid,status text);
    create table public.crm_workspace_members(workspace_id text,profile_id uuid,status text);
    create table public.billing_customers(profile_id uuid,stripe_customer_id text);
    create table public.billing_subscriptions(profile_id uuid,plan_code text,status text,current_period_end timestamptz);
    create table public.staff_billing_grants(profile_id uuid,plan_code text,active boolean,starts_at timestamptz,expires_at timestamptz);
    create function public.has_free_business_access(p_profile uuid) returns boolean language sql as $$ select p_profile='${member}'::uuid $$;
    create function public.reconcile_profile_entitlements(p_profile uuid) returns void language plpgsql as $$ begin update public.profiles set membership_tier=case when public.has_active_entitlement(p_profile,'premium') then 'premium' else 'free' end where id=p_profile; end $$;
    insert into public.profiles(id,app_role) values ('${owner}','consumer'),('${member}','consumer'),('${outsider}','consumer');
    insert into public.crm_workspaces values ('ws_one','${owner}','active'),('ws_two','${outsider}','active');
    insert into public.crm_workspace_members values ('ws_one','${owner}','active'),('ws_one','${member}','active'),('ws_two','${outsider}','active');
    insert into public.billing_customers values ('${owner}','cus_owner');
  `);
  await db.exec(
    readFileSync(
      "database/migrations/20261012180000_akisuite_subscription_entitlements.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});

describe("AkiSuite disposable PostgreSQL ledger and RLS", () => {
  it("requires a workspace for every business plan", async () => {
    await expect(
      sync("sub_noscope", "akihq_pro", "active", null),
    ).rejects.toThrow("akisuite_billing_scope");
  });
  it("rejects missing plan and invalid ownership", async () => {
    await expect(sync("sub_null", null as unknown as string)).rejects.toThrow(
      "invalid AkiSuite",
    );
    await expect(
      sync("sub_wrong", "akihq_pro", "active", "ws_two"),
    ).rejects.toThrow("workspace owner required");
  });
  it("gives Enterprise to its workspace without elevating the payer everywhere", async () => {
    await sync("sub_enterprise", "aki_enterprise");
    for (const plan of [
      "akibusiness_premium",
      "akiduermo_premium",
      "akihq_pro",
      "akihq_standard",
    ]) {
      const own = await asUser(
        member,
        `select public.has_akisuite_workspace_plan('ws_one','${plan}') as value`,
      );
      expect(own.rows[0]).toEqual({ value: true });
      const foreign = await asUser(
        member,
        `select public.has_akisuite_workspace_plan('ws_two','${plan}') as value`,
      );
      expect(foreign.rows[0]).toEqual({ value: false });
    }
    expect(
      await value(
        `select public.has_active_entitlement('${owner}','business_pro') as value`,
      ),
    ).toBe(false);
    expect(
      await value(
        `select public.has_active_entitlement('${owner}','premium') as value`,
      ),
    ).toBe(true);
    expect(
      (
        await asUser(
          member,
          `select public.has_akisuite_plan('${owner}','akipasa_premium') as value`,
        )
      ).rows[0],
    ).toEqual({ value: false });
  });
  it("only allows the payer to read billing details", async () => {
    expect(
      (
        await asUser(
          owner,
          "select * from public.akisuite_billing_subscriptions",
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(
          member,
          "select * from public.akisuite_billing_subscriptions",
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      asUser(owner, "delete from public.akisuite_billing_subscriptions"),
    ).rejects.toThrow("permission denied");
    await expect(
      asUser(
        owner,
        `select public.sync_akisuite_subscription('sub_forged','${owner}','cus_owner','aki_enterprise','month','active','2040-01-01',false,'2030-01-01','ws_one')`,
      ),
    ).rejects.toThrow("permission denied");
    await db.exec("set role anon");
    try {
      await expect(
        db.query("select * from public.akisuite_billing_subscriptions"),
      ).rejects.toThrow("permission denied");
    } finally {
      await db.exec("reset role");
    }
  });
  it("allows service-role webhook synchronization", async () => {
    await db.exec("set role service_role");
    try {
      expect((await sync("sub_service", "akiduermo_premium")).rows[0]).toEqual({
        value: true,
      });
    } finally {
      await db.exec("reset role");
    }
  });
  it("does not change immutable billing ownership", async () => {
    await expect(
      db.query(
        `select public.sync_akisuite_subscription('sub_enterprise','${outsider}','cus_other','aki_enterprise','month','active','2040-01-01',false,'2030-01-02','ws_two')`,
      ),
    ).rejects.toThrow("ownership mismatch");
  });
  it("ignores older events and prevents cancellation resurrection", async () => {
    await sync(
      "sub_enterprise",
      "aki_enterprise",
      "canceled",
      "ws_one",
      "2030-01-03",
    );
    expect(
      (
        await sync(
          "sub_enterprise",
          "aki_enterprise",
          "active",
          "ws_one",
          "2030-01-02",
        )
      ).rows[0],
    ).toEqual({ value: false });
    expect(
      (
        await sync(
          "sub_enterprise",
          "aki_enterprise",
          "active",
          "ws_one",
          "2030-01-03",
        )
      ).rows[0],
    ).toEqual({ value: false });
    expect(
      await value(
        `select public.has_active_entitlement('${owner}','premium') as value`,
      ),
    ).toBe(false);
  });
  it("keeps free venue access and legacy staff benefits", async () => {
    expect(
      await value(
        `select public.has_active_entitlement('${member}','business') as value`,
      ),
    ).toBe(true);
    await db.exec(
      `insert into public.staff_billing_grants values('${owner}','business_pro',true,'2020-01-01',null)`,
    );
    expect(
      await value(
        `select public.has_active_entitlement('${owner}','business_pro') as value`,
      ),
    ).toBe(true);
    expect(
      (
        await asUser(
          member,
          "select public.has_akisuite_workspace_plan('ws_one','akibusiness_premium') as value",
        )
      ).rows[0],
    ).toEqual({ value: true });
  });
  it("does not activate a discounted addon after Pro has ended", async () => {
    await db.exec("delete from public.staff_billing_grants");
    await sync("sub_addon", "akihq_business_addon");
    expect(
      (
        await asUser(
          member,
          "select public.has_akisuite_workspace_plan('ws_one','akibusiness_premium') as value",
        )
      ).rows[0],
    ).toEqual({ value: false });
    await sync("sub_pro", "akihq_pro");
    expect(
      (
        await asUser(
          member,
          "select public.has_akisuite_workspace_plan('ws_one','akibusiness_premium') as value",
        )
      ).rows[0],
    ).toEqual({ value: true });
    await sync("sub_pro", "akihq_pro", "past_due", "ws_one", "2030-01-02");
    expect(
      (
        await asUser(
          member,
          "select public.has_akisuite_workspace_plan('ws_one','akibusiness_premium') as value",
        )
      ).rows[0],
    ).toEqual({ value: false });
  });
});
