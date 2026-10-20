import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "../node_modules/@electric-sql/pglite/dist/index.js";
import { evaluateOperationsSubscription } from "../src/lib/operations-billing/operations-lifecycle.mjs";
const name = "20261020185200_operations_identity_deletion_compatibility.sql";
const migration = await readFile(
  new URL("../supabase/migrations/" + name, import.meta.url),
  "utf8",
);
const profile = "11111111-1111-4111-8111-111111111111";
test("mirrored additive migration remains identical", async () =>
  assert.equal(
    migration,
    await readFile(
      new URL("../database/migrations/" + name, import.meta.url),
      "utf8",
    ),
  ));
test("actual identity deletion detaches financial references, clears delegation and preserves business data", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create schema akibusiness_private;create schema akisuite_listing_private;
 create table auth.users(id uuid primary key);
 create table public.profiles(id uuid primary key references auth.users(id) on delete cascade);
 create table akisuite_listing_private.upload_reservations(actor uuid not null references public.profiles(id));
 create table public.crm_workspaces(id text primary key,owner_profile_id uuid references public.profiles(id) on delete set null);
 create table public.crm_workspace_members(workspace_id text references public.crm_workspaces(id),profile_id uuid references public.profiles(id) on delete cascade,primary key(workspace_id,profile_id));
 create table akibusiness_private.member_tool_limits(workspace_id text,profile_id uuid,tools text[],foreign key(workspace_id,profile_id) references public.crm_workspace_members(workspace_id,profile_id));
 create table akibusiness_private.operations_checkouts(workspace_id text primary key,profile_id uuid not null references public.profiles(id),customer_id text,token uuid,state text,session_id text,tier text,tools text[],recovery_after timestamptz default now(),recovery_leased_until timestamptz,recovery_lease uuid);
 create table akibusiness_private.operations_subscriptions(subscription_id text primary key,workspace_id text,profile_id uuid not null references public.profiles(id),customer_id text,next_tier text,next_tools text[],recovery_after timestamptz default now(),recovery_leased_until timestamptz,recovery_lease uuid);
 create table akibusiness_private.operations_billing_events(event_id text,subscription_id text,evidence text);
 create table akibusiness_private.toolboxes(workspace_id text);
 insert into auth.users values('${profile}');insert into public.profiles values('${profile}');
 insert into akisuite_listing_private.upload_reservations values('${profile}');
 insert into public.crm_workspaces values('ws','${profile}');insert into public.crm_workspace_members values('ws','${profile}');
 insert into akibusiness_private.member_tool_limits values('ws','${profile}',array['crm']);
 insert into akibusiness_private.operations_checkouts(workspace_id,profile_id,customer_id,token,state,session_id) values('ws','${profile}','cus_kept','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','reserved','cs_kept');
 insert into akibusiness_private.operations_subscriptions(subscription_id,workspace_id,profile_id,customer_id) values('sub_kept','ws','${profile}','cus_kept');
 insert into akibusiness_private.operations_billing_events values('evt_kept','sub_kept','stripe-invoice:in_kept');`);
    await assert.rejects(
      db.exec(`delete from auth.users where id='${profile}'`),
      /foreign key constraint/,
    );
    await db.exec(migration);
    // This fixture transaction is rolled back: no live account deletion is performed.
    await db.exec("begin");
    await db.exec(`delete from auth.users where id='${profile}'`);
    assert.deepEqual(
      (
        await db.query(
          "select profile_id,customer_id from akibusiness_private.operations_subscriptions",
        )
      ).rows,
      [{ profile_id: null, customer_id: "cus_kept" }],
    );
    assert.equal(
      (
        await db.query(
          "select profile_id from akibusiness_private.operations_checkouts",
        )
      ).rows[0].profile_id,
      null,
    );
    assert.equal(
      (await db.query("select owner_profile_id from public.crm_workspaces"))
        .rows[0].owner_profile_id,
      null,
    );
    assert.equal(
      (await db.query("select * from akibusiness_private.member_tool_limits"))
        .rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from akisuite_listing_private.upload_reservations",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from akibusiness_private.operations_billing_events",
        )
      ).rows.length,
      1,
    );
    assert.deepEqual(
      (await db.query("select public.claim_crm_operations_recovery(5) as jobs"))
        .rows[0].jobs,
      [],
    );
    await db.exec(
      `savepoint replay;insert into auth.users values('22222222-2222-4222-8222-222222222222');insert into public.profiles(id) values('22222222-2222-4222-8222-222222222222');update public.crm_workspaces set owner_profile_id='22222222-2222-4222-8222-222222222222' where id='ws'`,
    );
    await assert.rejects(
      db.query(
        "select public.apply_crm_operations_billing('evt_rebound','sub_kept',null,'22222222-2222-4222-8222-222222222222','cus_kept','ws','basico',array['crm'],now(),now(),'active',1,'evidence')",
      ),
      /Subscription binding mismatch/,
    );
    await db.exec("rollback to savepoint replay");
    await assert.rejects(
      db.query(
        "select public.apply_crm_operations_billing('evt_detached','sub_kept',null,null,'cus_kept','ws','basico',array['crm'],now(),now(),'active',1,'evidence')",
      ),
      /Detached operating identity/,
    );
    await db.exec("rollback");
    assert.equal((await db.query("select * from auth.users")).rows.length, 1);
    assert.equal(
      (await db.query("select * from akibusiness_private.member_tool_limits"))
        .rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
test("detached billing is terminal and metadata cannot reattach an identity", () => {
  const binding = {
    subscriptionId: "sub_kept",
    customerId: "cus_kept",
    workspaceId: "ws",
    profileId: null,
  };
  const subscription = {
    id: "sub_kept",
    customer: "cus_kept",
    items: { data: [{}] },
    metadata: { workspace_id: "ws", profile_id: profile },
  };
  assert.deepEqual(evaluateOperationsSubscription(subscription, binding), {
    action: "detached",
    subscriptionId: "sub_kept",
  });
  assert.throws(
    () =>
      evaluateOperationsSubscription(
        { ...subscription, customer: "cus_attack" },
        binding,
      ),
    /binding mismatch/,
  );
  assert.throws(
    () =>
      evaluateOperationsSubscription(
        { ...subscription, metadata: { workspace_id: "attacker" } },
        binding,
      ),
    /scope metadata mismatch/,
  );
});
