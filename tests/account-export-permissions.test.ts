import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
let db: PGlite;

async function readAs(user: string, table: string) {
  await db.exec(`begin; set local role authenticated;
    set local request.jwt.claim.sub='${user}';`);
  try {
    return (await db.query(`select * from public.${table}`)).rows;
  } finally {
    await db.exec("rollback");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,service_role;
    create table public.suite_email_preferences(
      profile_id uuid primary key,
      event_reminders boolean not null default false,
      stay_reminders boolean not null default false
    );
    create table public.claim_submission_alerts(
      claim_id uuid primary key,
      claimant_id uuid not null,
      payload jsonb not null
    );
    alter table public.suite_email_preferences enable row level security;
    alter table public.claim_submission_alerts enable row level security;
    revoke all on public.suite_email_preferences, public.claim_submission_alerts
      from authenticated;
    grant all on public.suite_email_preferences, public.claim_submission_alerts
      to service_role;
    insert into public.suite_email_preferences(profile_id) values
      ('${owner}'),('${other}');
    insert into public.claim_submission_alerts values
      ('10000000-0000-4000-8000-000000000001','${owner}','{}'),
      ('10000000-0000-4000-8000-000000000002','${other}','{}');
  `);
  await db.exec(
    readFileSync(
      "database/migrations/20261019231000_account_export_owner_reads.sql",
      "utf8",
    ),
  );
});

afterAll(async () => db?.close());

describe("account export owner projections", () => {
  it.each([
    ["suite_email_preferences", "profile_id"],
    ["claim_submission_alerts", "claimant_id"],
  ])("shows only caller rows from %s", async (table, ownerColumn) => {
    const rows = await readAs(owner, table);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ [ownerColumn]: owner });
  });

  it("does not grant write access", async () => {
    await db.exec(`begin; set local role authenticated;
      set local request.jwt.claim.sub='${owner}';`);
    try {
      await expect(
        db.exec(
          `update public.suite_email_preferences set event_reminders=true`,
        ),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("rollback");
    }
  });

  it("keeps mirrored migrations identical", () => {
    expect(
      readFileSync(
        "supabase/migrations/20261019231000_account_export_owner_reads.sql",
        "utf8",
      ),
    ).toBe(
      readFileSync(
        "database/migrations/20261019231000_account_export_owner_reads.sql",
        "utf8",
      ),
    );
  });
});
