import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationPath =
  "database/migrations/20261014183842_restrict_stripe_webhook_claim_execution.sql";
const migration = readFileSync(migrationPath, "utf8");
let db: PGlite;

async function asRole(role: string, sql: string) {
  await db.exec(`set role ${role}`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
    create table public.stripe_webhook_events(
      event_id text primary key,
      event_type text not null,
      state text not null default 'processing',
      processing_started_at timestamptz not null default now(),
      error text,
      processed_at timestamptz
    );
    alter table public.stripe_webhook_events enable row level security;
  `);
  const source = readFileSync(
    "database/migrations/0082_free_venue_access_and_billing_repair.sql",
    "utf8",
  );
  const start = source.indexOf(
    "create or replace function public.claim_stripe_webhook_event",
  );
  const end = source.indexOf("-- Backfill", start);
  await db.exec(source.slice(start, end));
  await db.exec(`grant execute on function public.claim_stripe_webhook_event(text,text)
    to public, anon, authenticated, service_role;`);
  await db.exec(migration);
}, 30_000);

afterAll(async () => db?.close());

describe("service-only Stripe webhook lease", () => {
  it.each(["anon", "authenticated"])("denies %s", async (role) => {
    await expect(
      asRole(
        role,
        "select public.claim_stripe_webhook_event('evt_attack','created')",
      ),
    ).rejects.toThrow(/permission denied for function/);
  });

  it("retains service execution, empty search_path and mirrored SQL", async () => {
    expect(
      (
        await asRole(
          "service_role",
          "select public.claim_stripe_webhook_event('evt_service','created') as claimed",
        )
      ).rows,
    ).toEqual([{ claimed: true }]);
    expect(
      (
        await db.query(
          "select prosecdef, proconfig from pg_proc where proname='claim_stripe_webhook_event'",
        )
      ).rows,
    ).toEqual([{ prosecdef: true, proconfig: ['search_path=""'] }]);
    expect(
      readFileSync(
        "supabase/migrations/20261014183842_restrict_stripe_webhook_claim_execution.sql",
        "utf8",
      ),
    ).toBe(migration);
  });

  it("keeps signature verification before the service client", () => {
    const route = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
    const post = route.slice(route.indexOf("export async function POST"));
    expect(post.indexOf("verifyStripeSignature")).toBeLessThan(
      post.indexOf("createSupabaseServiceClient"),
    );
  });
});
