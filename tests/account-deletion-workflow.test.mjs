import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL(
    "../supabase/migrations/20261025144929_account_deletion_review.sql",
    import.meta.url,
  ),
  "utf8",
);
const actor = "11111111-1111-4111-8111-111111111111",
  target = "22222222-2222-4222-8222-222222222222",
  request = "33333333-3333-4333-8333-333333333333";
const checks = {
  identityVerified: true,
  sessionsReviewed: true,
  storageCleared: true,
  providersResolved: true,
  businessContinuityResolved: true,
  retentionRecorded: true,
  confirmationContactVerified: true,
};

test("cancelled reviewed requests receive a bounded evidence expiry without deleting the identity", async () => {
  const db = await fixture();
  try {
    await review(db);
    await db.exec(
      `update account_deletion_requests set state='cancelled' where id='${request}'`,
    );
    assert.ok(
      (
        await db.query(
          "select evidence_until from account_privacy_private.reviews",
        )
      ).rows[0].evidence_until,
    );
    await db.exec(
      "update account_privacy_private.reviews set evidence_until=now()-interval '1 day';update account_privacy_private.settings set retention_enabled=true;select purge_account_deletion_evidence()",
    );
    assert.equal(
      (await db.query("select * from account_deletion_requests")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from account_privacy_private.reviews")).rows
        .length,
      0,
    );
    assert.equal((await db.query("select * from profiles")).rows.length, 2);
  } finally {
    await db.close();
  }
});

test("real restrictive FK preflight reports metadata only and blocks the lease without deleting retained records", async () => {
  const db = await fixture();
  try {
    await db.exec(
      `create table synthetic_retained_finance(id text primary key,actor uuid references profiles(id),private_text text);insert into synthetic_retained_finance values('invoice','${target}','must not appear in dependency output')`,
    );
    await review(db);
    const report = (
      await db.query("select account_deletion_dependencies($1) report", [
        request,
      ])
    ).rows[0].report;
    assert.ok(
      report.some(
        (row) => row.table === "synthetic_retained_finance" && row.blocking,
      ),
    );
    assert.ok(!JSON.stringify(report).includes("must not appear"));
    await assert.rejects(
      begin(db),
      /dependencies require scoped manual resolution/,
    );
    assert.equal(
      (await db.query("select private_text from synthetic_retained_finance"))
        .rows[0].private_text,
      "must not appear in dependency output",
    );
    assert.equal((await db.query("select * from profiles")).rows.length, 2);
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select account_deletion_dependencies($1)", [request]),
      /permission denied/,
    );
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});

test("interrupted Auth success reconciles by original reviewer and UUID without repeating deletion", async () => {
  const db = await fixture();
  try {
    await review(db);
    const grant = await begin(db);
    await db.exec(`delete from auth.users where id='${target}'`);
    await assert.rejects(
      db.query("select finish_account_deletion($1,$2,false)", [
        request,
        grant.lease,
      ]),
      /identity absent; reconcile/,
    );
    assert.equal(
      (await db.query("select lease from account_privacy_private.reviews"))
        .rows[0].lease,
      grant.lease,
    );
    await assert.rejects(
      db.query("select reconcile_account_deletion($1,$2)", [request, actor]),
      /original exact account/,
    );
    await db.query("select reconcile_account_deletion($1,$2)", [
      request,
      target,
    ]);
    assert.ok(
      (
        await db.query(
          "select finished_at from account_privacy_private.reviews",
        )
      ).rows[0].finished_at,
    );
    assert.equal(
      (await db.query("select state from account_deletion_requests")).rows[0]
        .state,
      "processing",
    );
    await assert.rejects(
      db.query("select reconcile_account_deletion($1,$2)", [request, target]),
      /original exact account/,
    );
  } finally {
    await db.close();
  }
});

test("missing public profile does not prove Auth identity deletion", async () => {
  const db = await fixture();
  try {
    await review(db);
    const grant = await begin(db);
    await db.exec(`delete from profiles where id='${target}'`);
    await assert.rejects(
      db.query("select finish_account_deletion($1,$2,true)", [
        request,
        grant.lease,
      ]),
      /identity still exists/,
    );
    await assert.rejects(
      db.query("select reconcile_account_deletion($1,$2)", [request, target]),
      /identity still exists/,
    );
    assert.equal((await db.query("select * from auth.users")).rows.length, 2);
  } finally {
    await db.close();
  }
});
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create type app_role as enum ('consumer','administrator');
 create type deletion_request_state as enum ('requested','processing','completed','cancelled');
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
 create function public.has_platform_role(app_role[]) returns boolean language sql as $$ select coalesce(current_setting('test.admin',true),'false')='true' $$;
 create table auth.users(id uuid primary key);
 create table profiles(id uuid primary key references auth.users(id) on delete cascade);
 create table account_deletion_requests(id uuid primary key,profile_id uuid references profiles(id) on delete set null,state deletion_request_state default 'requested',requested_at timestamptz default now(),completed_at timestamptz,updated_at timestamptz,updated_by uuid,resolution text);
 insert into auth.users values('${actor}'),('${target}');
 insert into profiles values('${actor}'),('${target}');
 insert into account_deletion_requests(id,profile_id) values('${request}','${target}');
 select set_config('test.uid','${actor}',false),set_config('test.admin','true',false);`);
  await db.exec(migration);
  return db;
}
async function review(db, hold = false, supplied = checks) {
  await db.query("select review_account_deletion($1,$2,$3,$4,$5)", [
    request,
    target,
    JSON.stringify(supplied),
    hold,
    "Internal synthetic review reference; no customer data",
  ]);
}
async function begin(db) {
  return (
    await db.query("select begin_account_deletion($1,$2) as grant", [
      request,
      target,
    ])
  ).rows[0].grant;
}

test("mirrored migration identical", async () =>
  assert.equal(
    migration,
    await readFile(
      new URL(
        "../database/migrations/20261025144929_account_deletion_review.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  ));

test("private evidence ACLs, authenticated non-admin, self target and wrong lease deny", async () => {
  const db = await fixture();
  try {
    for (const role of ["anon", "authenticated", "service_role"]) {
      await db.exec(`set role ${role}`);
      for (const table of ["reviews", "events", "settings"]) {
        await assert.rejects(
          db.exec(`select * from account_privacy_private.${table}`),
          /permission denied/,
        );
        await assert.rejects(
          db.exec(`delete from account_privacy_private.${table}`),
          /permission denied/,
        );
      }
      await db.exec("reset role");
    }
    await db.exec(
      "select set_config('test.admin','false',false); set role authenticated",
    );
    await assert.rejects(review(db), /administrator required/);
    await db.exec("reset role;select set_config('test.admin','true',false)");
    await db.exec(
      `update account_deletion_requests set profile_id='${actor}' where id='${request}'`,
    );
    await assert.rejects(
      db.query("select review_account_deletion($1,$2,$3,false,$4)", [
        request,
        actor,
        JSON.stringify(checks),
        "Synthetic self deletion must be rejected",
      ]),
      /invalid target/,
    );
    await db.exec(
      `update account_deletion_requests set profile_id='${target}' where id='${request}'`,
    );
    await review(db);
    await begin(db);
    await assert.rejects(
      db.query("select finish_account_deletion($1,$2,false)", [request, actor]),
      /invalid execution lease/,
    );
  } finally {
    await db.close();
  }
});

test("13-month completed request and identifying evidence purge together, holds preserve them, business/profile survive", async () => {
  const db = await fixture();
  try {
    await db.exec(
      "create table synthetic_business(id text primary key,payload text);insert into synthetic_business values('retained','business data must survive')",
    );
    await review(db);
    const grant = await begin(db);
    await db.exec(`delete from auth.users where id='${target}'`);
    await db.query("select finish_account_deletion($1,$2,true)", [
      request,
      grant.lease,
    ]);
    await db.query("select confirm_account_deletion_reply($1,$2)", [
      request,
      "Synthetic manually written email reference",
    ]);
    await db.exec(
      "update account_privacy_private.reviews set evidence_until=now()-interval '1 month'; update account_privacy_private.events set created_at=now()-interval '13 months';update account_privacy_private.settings set retention_enabled=true",
    );
    await db.query("select hold_account_deletion($1,true)", [request]);
    await db.exec("select purge_account_deletion_evidence()");
    assert.equal(
      (await db.query("select * from account_deletion_requests")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from account_privacy_private.reviews")).rows
        .length,
      1,
    );
    assert.ok(
      (await db.query("select * from account_privacy_private.events")).rows
        .length > 0,
    );
    await db.query("select hold_account_deletion($1,false)", [request]);
    await db.exec("select purge_account_deletion_evidence()");
    for (const table of [
      "account_deletion_requests",
      "account_privacy_private.reviews",
      "account_privacy_private.events",
    ])
      assert.equal((await db.query(`select * from ${table}`)).rows.length, 0);
    assert.equal((await db.query("select id from profiles")).rows[0].id, actor);
    assert.equal(
      (await db.query("select payload from synthetic_business")).rows[0]
        .payload,
      "business data must survive",
    );
  } finally {
    await db.close();
  }
});
test("requires real admin, exact target, every check, no hold and fresh review", async () => {
  const db = await fixture();
  try {
    await db.exec("select set_config('test.admin','false',false)");
    await assert.rejects(review(db), /administrator/);
    await db.exec("select set_config('test.admin','true',false)");
    await assert.rejects(begin(db), /review incomplete/);
    await review(db, true);
    await assert.rejects(begin(db), /blocked/);
    await review(db, false, { ...checks, providersResolved: false });
    await assert.rejects(begin(db), /incomplete/);
    await review(db);
    await db.exec(
      "update account_privacy_private.reviews set reviewed_at=now()-interval '25 hours'",
    );
    await assert.rejects(begin(db), /stale/);
    await review(db);
    await assert.rejects(
      db.query("select begin_account_deletion($1,$2)", [request, actor]),
      /target/,
    );
    await db.exec("set role anon");
    await assert.rejects(begin(db), /permission denied/);
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
test("lease prevents repeats and changed review; identity must disappear; manual confirmation closes", async () => {
  const db = await fixture();
  try {
    await review(db);
    const grant = await begin(db);
    assert.equal(grant.profile, target);
    await assert.rejects(
      db.exec(
        `update account_deletion_requests set state='cancelled' where id='${request}'`,
      ),
      /reconciled before cancellation/,
    );
    await assert.rejects(begin(db), /blocked/);
    await assert.rejects(review(db), /progress/);
    await assert.rejects(
      db.query("select finish_account_deletion($1,$2,true)", [
        request,
        grant.lease,
      ]),
      /identity still exists/,
    );
    await assert.rejects(
      db.exec(
        `update account_deletion_requests set state='completed' where id='${request}'`,
      ),
      /reviewed identity/,
    );
    await db.exec(`delete from auth.users where id='${target}'`);
    await db.query("select finish_account_deletion($1,$2,true)", [
      request,
      grant.lease,
    ]);
    await assert.rejects(
      db.exec(
        `update account_deletion_requests set state='cancelled' where id='${request}'`,
      ),
      /reconciled before cancellation/,
    );
    assert.equal(
      (await db.query("select state from account_deletion_requests")).rows[0]
        .state,
      "processing",
    );
    await assert.rejects(
      db.exec(
        `update account_deletion_requests set state='completed' where id='${request}'`,
      ),
      /manual confirmation/,
    );
    await db.query("select confirm_account_deletion_reply($1,$2)", [
      request,
      "Manual confirmation sent, synthetic ref 12:30 UTC",
    ]);
    assert.equal(
      (await db.query("select state from account_deletion_requests")).rows[0]
        .state,
      "completed",
    );
    await assert.rejects(
      db.query("select finish_account_deletion($1,$2,true)", [
        request,
        grant.lease,
      ]),
      /invalid execution/,
    );
  } finally {
    await db.close();
  }
});
test("failure invalidates checks, deadline does not reset; purge disabled and respects holds", async () => {
  const db = await fixture();
  try {
    await review(db);
    const due = (await db.query("select due_at from account_deletion_requests"))
      .rows[0].due_at;
    const grant = await begin(db);
    await db.query("select finish_account_deletion($1,$2,false)", [
      request,
      grant.lease,
    ]);
    await assert.rejects(
      db.exec(
        `update account_deletion_requests set state='cancelled' where id='${request}'`,
      ),
      /reconciled before cancellation/,
    );
    await assert.rejects(begin(db), /incomplete/);
    await review(db);
    assert.equal(
      String(
        (await db.query("select due_at from account_deletion_requests")).rows[0]
          .due_at,
      ),
      String(due),
    );
    await db.exec(
      "update account_privacy_private.events set created_at=now()-interval '91 days'",
    );
    await db.exec("select purge_account_deletion_evidence()");
    assert.ok(
      (await db.query("select * from account_privacy_private.events")).rows
        .length > 0,
    );
    await db.exec(
      "update account_privacy_private.settings set retention_enabled=true",
    );
    await db.query("select hold_account_deletion($1,true)", [request]);
    await db.exec("select purge_account_deletion_evidence()");
    assert.ok(
      (await db.query("select * from account_privacy_private.events")).rows
        .length > 0,
    );
    await db.query("select hold_account_deletion($1,false)", [request]);
    await db.exec("select purge_account_deletion_evidence()");
    assert.equal(
      (await db.query("select * from account_privacy_private.events")).rows
        .length,
      0,
    );
    assert.equal((await db.query("select * from profiles")).rows.length, 2);
  } finally {
    await db.close();
  }
});
