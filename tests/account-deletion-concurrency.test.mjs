import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const url = process.env.TEST_DELETION_DATABASE_URL;
const enabled = Boolean(url);
if (
  url &&
  !["127.0.0.1", "localhost", "::1", "[::1]"].includes(new URL(url).hostname)
)
  throw new Error("Disposable loopback database only");
test(
  "real PostgreSQL: committed hold serializes ahead of purge; repeatable-read purge denied",
  { skip: !enabled },
  async () => {
    const sql = postgres(url, { max: 4 });
    const actor = "11111111-1111-4111-8111-111111111111",
      target = "22222222-2222-4222-8222-222222222222",
      request = "33333333-3333-4333-8333-333333333333";
    try {
      await sql.unsafe(`create role anon;create role authenticated;create role service_role;create schema auth;
   create type app_role as enum ('consumer','administrator');create type deletion_request_state as enum ('requested','processing','completed','cancelled');
   create function auth.uid() returns uuid language sql as $$ select '${actor}'::uuid $$;
   create function has_platform_role(app_role[]) returns boolean language sql as $$ select true $$;
   create table auth.users(id uuid primary key);create table profiles(id uuid primary key references auth.users(id) on delete cascade);
   create table account_deletion_requests(id uuid primary key,profile_id uuid references profiles(id) on delete set null,state deletion_request_state default 'requested',requested_at timestamptz default now(),completed_at timestamptz,updated_at timestamptz,updated_by uuid,resolution text);
   insert into auth.users values('${actor}'),('${target}');insert into profiles values('${actor}'),('${target}');insert into account_deletion_requests(id,profile_id) values('${request}','${target}');`);
      await sql.unsafe(
        await readFile(
          new URL(
            "../supabase/migrations/20261025144929_account_deletion_review.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      await sql`select review_account_deletion(${request},${target},${sql.json({ identityVerified: true, sessionsReviewed: true, storageCleared: true, providersResolved: true, businessContinuityResolved: true, retentionRecorded: true, confirmationContactVerified: true })},false,'Synthetic reviewed request with no customer data')`;
      const [grant] =
        await sql`select begin_account_deletion(${request},${target}) value`;
      await sql`delete from auth.users where id=${target}`;
      await sql`select finish_account_deletion(${request},${grant.value.lease},true)`;
      await sql`select confirm_account_deletion_reply(${request},'Synthetic manual support confirmation')`;
      await sql`update account_privacy_private.reviews set evidence_until=now()-interval '1 day'`;
      await sql`update account_privacy_private.events set created_at=now()-interval '91 days'`;
      await sql`update account_privacy_private.settings set retention_enabled=true`;
      let release, held;
      const releaseHold = new Promise((resolve) => {
          release = resolve;
        }),
        holdReady = new Promise((resolve) => {
          held = resolve;
        });
      const holding = sql.begin(async (tx) => {
        await tx`select hold_account_deletion(${request},true)`;
        held();
        await releaseHold;
      });
      await holdReady;
      let purged = false;
      const purging = sql.begin(async (tx) => {
        await tx`select purge_account_deletion_evidence()`;
        purged = true;
      });
      try {
        await new Promise((resolve) => setTimeout(resolve, 150));
        assert.equal(purged, false, "purge must wait for hold transaction");
      } finally {
        release();
      }
      await Promise.all([holding, purging]);
      assert.equal(
        (await sql`select * from account_deletion_requests`).length,
        1,
      );
      assert.equal(
        (await sql`select * from account_privacy_private.reviews`).length,
        1,
      );
      assert.ok(
        (await sql`select * from account_privacy_private.events`).length > 0,
      );
      await assert.rejects(
        sql.begin(
          "isolation level repeatable read",
          (tx) => tx`select purge_account_deletion_evidence()`,
        ),
        /read committed/,
      );
    } finally {
      await sql.end();
    }
  },
);
