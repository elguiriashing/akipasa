import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "../node_modules/@electric-sql/pglite/dist/index.js";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const tools = ["crm", "tasks", "calendar", "employees"];
const price = "price_1USgZRGfzDhsgsQZaZYnAjZC";
const scalar = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
const login = async (id = owner, role = "authenticated") => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`set role ${role}`);
};
const reserve = () =>
  scalar("select public.reserve_crm_operations_checkout($1,$2,$3,$4)", [
    "private-test",
    "basico",
    tools,
    price,
  ]);
before(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,deleted_at timestamptz);create table public.profiles(id uuid primary key,app_role text,display_name text,username text);
create table public.crm_workspaces(id text primary key,name text,slug text,owner_profile_id uuid,source_venue_id uuid,plan text,status text,seat_limit int);
create table public.crm_workspace_members(workspace_id text,profile_id uuid,status text,role text,role_template_id uuid,primary key(workspace_id,profile_id));create table public.crm_role_templates(id uuid primary key,workspace_id text);create table public.crm_role_template_tools(template_id uuid,tool_key text);create table public.crm_tool_catalog(tool_key text primary key,active boolean);create table public.crm_workspace_entitlements(workspace_id text,tool_key text,active boolean,source text check(source in ('plan','trial','purchase','manual','platform')),starts_at timestamptz,ends_at timestamptz,primary key(workspace_id,tool_key));create table public.billing_customers(profile_id uuid primary key,stripe_customer_id text unique);create table public.billing_subscriptions(stripe_subscription_id text primary key,profile_id uuid,stripe_customer_id text,plan_code text,status text,updated_at timestamptz);
create table public.private_operating_location_requests(profile_id uuid,request_id uuid,workspace_id text,requested_name text,primary key(profile_id,request_id));
create function public.has_active_entitlement(uuid,text) returns boolean language sql stable as $$select true$$;create function public.crm_can_access_workspace(text) returns boolean language sql stable as $$select true$$;create function public.crm_has_tool(text,text) returns boolean language sql stable as $$select true$$;create function public.reconcile_profile_entitlements(uuid) returns void language sql as $$select$$;
grant usage on schema public to anon,authenticated,service_role;`);
  for (const name of [
    "20261020170509_subscription_toolbox.sql",
    "20261020172801_operations_checkout_lifecycle.sql",
    "20261020180734_operations_first_invoice_recovery.sql",
    "20261020181726_toolbox_entitlement_source_compatibility.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
});
after(() => db.close());
beforeEach(async () => {
  await db.exec(
    "reset role;truncate akibusiness_private.operations_billing_events,akibusiness_private.operations_subscriptions,akibusiness_private.operations_checkouts,akibusiness_private.toolbox_notifications,akibusiness_private.toolbox_history,akibusiness_private.toolboxes,public.private_operating_location_requests,public.billing_subscriptions,public.billing_customers,public.crm_workspace_entitlements,public.crm_workspace_members,public.crm_workspaces,public.profiles,auth.users cascade;",
  );
  await db.query("insert into public.profiles(id) values($1),($2)", [
    owner,
    other,
  ]);
  await db.query(
    "insert into auth.users values($1,now(),null),($2,now(),null)",
    [owner, other],
  );
  await db.query(
    "insert into public.crm_workspaces values('private-test','Test','private-test',$1,null,'starter','active',4)",
    [owner],
  );
  await db.query(
    "insert into public.crm_workspace_members(workspace_id,profile_id,status,role) values('private-test',$1,'active','owner')",
    [owner],
  );
  await db.query("insert into public.billing_customers values($1,$2)", [
    owner,
    "cus_test",
  ]);
  await db.exec(
    "insert into public.crm_tool_catalog(tool_key,active) select unnest(akibusiness_private.catalogue()),true on conflict(tool_key) do update set active=true",
  );
  await login();
});
test("historical entitlement provenance constraint rejects unsupported source values", async () => {
  await db.exec("reset role");
  await assert.rejects(
    db.exec(
      "insert into public.crm_workspace_entitlements values('private-test','crm',true,'toolbox',now(),now()+interval '1 day')",
    ),
    /source_check|check constraint/,
  );
});
test("same checkout selection reuses durable reservation; another selection cannot race", async () => {
  const a = await reserve();
  const b = await reserve();
  assert.equal(a.token, b.token);
  await assert.rejects(
    scalar("select public.reserve_crm_operations_checkout($1,$2,$3,$4)", [
      "private-test",
      "basico",
      ["crm", "inbox", "tasks", "calendar"],
      price,
    ]),
    /reconciliation/,
  );
});
test("foreign owners and browser service calls denied; private tables remain inaccessible", async () => {
  await login(other);
  await assert.rejects(reserve(), /owner/);
  await assert.rejects(
    scalar("select public.crm_operations_binding($1,null)", ["sub_test"]),
    /permission denied/,
  );
  await assert.rejects(
    db.exec("select * from akibusiness_private.operations_checkouts"),
    /permission denied/,
  );
  await login(owner, "anon");
  await assert.rejects(reserve(), /permission denied/);
});
test("legacy business prevents duplicate subscription checkout", async () => {
  await db.exec("reset role");
  await db.query(
    "insert into public.billing_subscriptions values('sub_old',$1,'cus_test','business','active',now())",
    [owner],
  );
  await login();
  await assert.rejects(reserve(), /migration required/);
});
test("expired reservations are held pending authoritative Stripe reconciliation, never silently reused", async () => {
  await reserve();
  await db.exec(
    "reset role;update akibusiness_private.operations_checkouts set expires_at=now()-interval '1 second'",
  );
  await login();
  await assert.rejects(reserve(), /reconciliation/);
});
test("atomic paid application binds once, deduplicates replay and blocks workspace replacement", async () => {
  const c = await reserve();
  await login(owner, "service_role");
  const args = [
    "evt_paid",
    "sub_test",
    c.token,
    owner,
    "cus_test",
    "private-test",
    "basico",
    tools,
    new Date(Date.now() - 86400000).toISOString(),
    new Date(Date.now() + 86400000).toISOString(),
    "active",
    Date.now(),
    "stripe-invoice:in_paid",
  ];
  const sql =
    "select public.apply_crm_operations_billing(" +
    args.map((_, i) => "$" + (i + 1)).join(",") +
    ")";
  await scalar(sql, args);
  await scalar(sql, args);
  assert.equal(
    Number(
      await scalar(
        "select count(*) from akibusiness_private.operations_billing_events",
      ),
    ),
    1,
  );
  assert.equal(
    (await scalar("select public.crm_operations_binding('sub_test',null)"))
      .tier,
    "basico",
  );
  await db.exec("reset role");
  assert.equal(
    Number(
      await scalar(
        "select count(*) from public.crm_workspace_entitlements where workspace_id='private-test' and source='purchase' and active",
      ),
    ),
    12,
  );
  assert.equal(
    Number(
      await scalar(
        "select count(*) from public.crm_workspace_entitlements where source not in ('plan','trial','purchase','manual','platform')",
      ),
    ),
    0,
  );
  await login();
  await assert.rejects(reserve(), /Existing subscription/);
});
test("migration provisioning is private, explicit, idempotent and preserves personal Premium", async () => {
  await db.exec("reset role");
  await db.query(
    "insert into public.billing_subscriptions values('sub_old',$1,'cus_test','business_pro','active',now()),('sub_personal',$1,'cus_test','premium','active',now())",
    [owner],
  );
  await login(owner, "service_role");
  const args = [
    "sub_old",
    owner,
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "Private operating location",
    "sha256:reviewed-manifest-evidence",
  ];
  const sql =
    "select public.provision_crm_operations_migration($1,$2,$3,$4,$5)";
  const workspace = await scalar(sql, args);
  assert.equal(await scalar(sql, args), workspace);
  assert.match(workspace, /^private-/);
  await scalar("select public.bind_crm_operations_migration($1,$2,$3,$4)", [
    "sub_old",
    workspace,
    tools,
    "sha256:reviewed-manifest-evidence",
  ]);
  assert.equal(
    (await scalar("select public.crm_operations_binding('sub_old',null)"))
      .nextTier,
    "basico",
  );
  await assert.rejects(
    scalar(sql, ["sub_personal", owner, args[2], "Other location", args[4]]),
    /existing business/,
  );
});

test("owner can choose initial migration tools before activation; activation closes that path forever", async () => {
  await db.exec("reset role");
  await db.query(
    "insert into public.billing_subscriptions values('sub_old',$1,'cus_test','business','active',now())",
    [owner],
  );
  await login(owner, "service_role");
  await scalar("select public.bind_crm_operations_migration($1,$2,$3,$4)", [
    "sub_old",
    "private-test",
    tools,
    "sha256:reviewed-manifest-evidence",
  ]);
  const chosen = ["pos", "inventory", "crm", "calendar"];
  await login(other);
  await assert.rejects(
    scalar("select public.configure_crm_operations_initial($1,$2)", [
      "private-test",
      chosen,
    ]),
    /owner/,
  );
  await login();
  await scalar("select public.configure_crm_operations_initial($1,$2)", [
    "private-test",
    chosen,
  ]);
  assert.deepEqual(
    (await scalar("select public.crm_operations_initial_state('private-test')"))
      .tools,
    chosen,
  );
  await login(owner, "service_role");
  const now = Date.now();
  await scalar(
    "select public.apply_crm_operations_billing($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
    [
      "evt_paid_migration",
      "sub_old",
      null,
      owner,
      "cus_test",
      "private-test",
      "basico",
      chosen,
      new Date(now - 86400000).toISOString(),
      new Date(now + 86400000).toISOString(),
      "active",
      now,
      "stripe-invoice:in_new",
    ],
  );
  await login();
  assert.equal(
    await scalar("select public.crm_operations_initial_state('private-test')"),
    null,
  );
  await assert.rejects(
    scalar("select public.configure_crm_operations_initial($1,$2)", [
      "private-test",
      tools,
    ]),
    /already activated/,
  );
  await db.exec("reset role");
  assert.equal(
    await scalar(
      "select status from public.billing_subscriptions where stripe_subscription_id='sub_old'",
    ),
    "canceled",
  );
});

test("downgrade reservations keep one future change and block racing upgrade choices", async () => {
  const c = await reserve();
  await login(owner, "service_role");
  const all = [
    "crm",
    "inbox",
    "tasks",
    "calendar",
    "inventory",
    "pos",
    "sales",
    "marketing",
    "automation",
    "collaboration",
    "employees",
    "knowledge",
  ];
  const now = Date.now(),
    anchor = new Date(now - 86400000).toISOString(),
    until = new Date(now + 30 * 86400000).toISOString();
  const sql =
    "select public.apply_crm_operations_billing($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)";
  await scalar(sql, [
    "evt_basic",
    "sub_test",
    c.token,
    owner,
    "cus_test",
    "private-test",
    "basico",
    tools,
    anchor,
    until,
    "active",
    now,
    "stripe-invoice:in_basic",
  ]);
  await scalar(sql, [
    "evt_pro",
    "sub_test",
    c.token,
    owner,
    "cus_test",
    "private-test",
    "pro",
    all,
    anchor,
    until,
    "active",
    now + 1,
    "stripe-invoice:in_pro",
  ]);
  await login();
  const lower = await scalar(
    "select public.reserve_crm_operations_downgrade($1,$2,$3)",
    ["private-test", "basico", tools],
  );
  assert.equal(
    (
      await scalar("select public.reserve_crm_operations_downgrade($1,$2,$3)", [
        "private-test",
        "basico",
        tools,
      ])
    ).token,
    lower.token,
  );
  await assert.rejects(
    scalar("select public.set_crm_operations_next($1,$2,$3)", [
      "private-test",
      "pro",
      all,
    ]),
    /Scheduled change/,
  );
  await login(owner, "service_role");
  await scalar("select public.record_crm_operations_schedule($1,$2,$3,$4)", [
    lower.token,
    "sub_sched_test",
    true,
    until,
  ]);
  await login();
  assert.equal(
    (
      await scalar(
        "select public.crm_operations_scheduled_change('private-test')",
      )
    ).tier,
    "basico",
  );
  await assert.rejects(
    scalar("select public.reserve_crm_operations_downgrade($1,$2,$3)", [
      "private-test",
      "standard",
      all.slice(0, 8),
    ]),
    /Existing scheduled change/,
  );
});
test("central recovery sees migration binding before first toolbox and leases/retries it", async () => {
  await assert.rejects(
    scalar("select public.claim_crm_operations_recovery(5)"),
    /permission denied/,
  );
  await db.exec("reset role");
  await db.query(
    "insert into public.billing_subscriptions values('sub_missed',$1,'cus_test','business','active',now())",
    [owner],
  );
  await login(owner, "service_role");
  await scalar("select public.bind_crm_operations_migration($1,$2,$3,$4)", [
    "sub_missed",
    "private-test",
    tools,
    "sha256:reviewed-manifest-evidence",
  ]);
  assert.equal(
    await scalar("select count(*) from akibusiness_private.toolboxes"),
    0,
  );
  const queue = await scalar("select public.claim_crm_operations_recovery(5)");
  assert.equal(queue.length, 1);
  assert.equal(queue[0].subscription_id, "sub_missed");
  assert.deepEqual(
    await scalar("select public.claim_crm_operations_recovery(5)"),
    [],
  );
  await assert.rejects(
    scalar("select public.finish_crm_operations_recovery($1,$2,$3,$4)", [
      "subscription",
      "sub_missed",
      "00000000-0000-4000-8000-000000000000",
      true,
    ]),
    /lease changed/,
  );
  await scalar("select public.finish_crm_operations_recovery($1,$2,$3,$4)", [
    "subscription",
    "sub_missed",
    queue[0].lease,
    false,
  ]);
  assert.equal(
    await scalar(
      "select recovery_failures from akibusiness_private.operations_subscriptions",
    ),
    1,
  );
  assert.deepEqual(
    await scalar("select public.claim_crm_operations_recovery(5)"),
    [],
  );
  await db.exec(
    "update akibusiness_private.operations_subscriptions set recovery_after=now()-interval '1 minute'",
  );
  const retry = (
    await scalar("select public.claim_crm_operations_recovery(5)")
  )[0];
  assert.notEqual(retry.lease, queue[0].lease);
  await scalar("select public.finish_crm_operations_recovery($1,$2,$3,$4)", [
    "subscription",
    "sub_missed",
    retry.lease,
    true,
  ]);
  assert.equal(
    await scalar(
      "select recovery_failures from akibusiness_private.operations_subscriptions",
    ),
    0,
  );
  assert.equal(
    await scalar(
      "select recovery_after>now()+interval '29 minutes' from akibusiness_private.operations_subscriptions",
    ),
    true,
  );
});
test("central recovery sees reserved checkout session before any subscription binding", async () => {
  const c = await reserve();
  await login(owner, "service_role");
  assert.deepEqual(
    await scalar("select public.claim_crm_operations_recovery(5)"),
    [],
  );
  await scalar("select public.record_crm_operations_checkout_session($1,$2)", [
    c.token,
    "cs_test_paid",
  ]);
  const queue = await scalar("select public.claim_crm_operations_recovery(5)");
  assert.equal(queue.length, 1);
  assert.equal(queue[0].kind, "checkout");
  assert.equal(queue[0].session_id, "cs_test_paid");
  assert.equal(
    await scalar(
      "select count(*) from akibusiness_private.operations_subscriptions",
    ),
    0,
  );
  await db.exec(
    "update akibusiness_private.operations_checkouts set recovery_leased_until=now()-interval '1 minute'",
  );
  const retry = (
    await scalar("select public.claim_crm_operations_recovery(5)")
  )[0];
  assert.notEqual(retry.lease, queue[0].lease);
  await db.exec(
    "update akibusiness_private.operations_checkouts set state='completed',recovery_leased_until=null",
  );
  assert.deepEqual(
    await scalar("select public.claim_crm_operations_recovery(5)"),
    [],
  );
});
