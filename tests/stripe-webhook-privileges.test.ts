import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const name = readdirSync("database/migrations").find((file) =>
  file.endsWith("_restrict_stripe_webhook_claim_execution.sql"),
)!;
const migration = readFileSync(`database/migrations/${name}`, "utf8");
let db: PGlite;

async function asRole(role: string, query: string) {
  await db.exec(`set role ${role}`);
  try {
    return await db.query(query);
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
      event_id text primary key, event_type text not null,
      state text not null default 'processing',
      processing_started_at timestamptz not null default now(),
      error text, processed_at timestamptz
    );
    alter table public.stripe_webhook_events enable row level security;
  `);
  const existing = readFileSync(
    "database/migrations/0082_free_venue_access_and_billing_repair.sql",
    "utf8",
  );
  const start = existing.indexOf(
    "create or replace function public.claim_stripe_webhook_event",
  );
  const end = existing.indexOf("-- Backfill", start);
  await db.exec(existing.slice(start, end));
  // Reproduce the observed expanded grants, including independent direct grants.
  await db.exec(`grant execute on function public.claim_stripe_webhook_event(text,text)
    to public, anon, authenticated, service_role;`);
  expect(
    (
      await asRole(
        "anon",
        "select public.claim_stripe_webhook_event('evt_before','created') as claimed",
      )
    ).rows,
  ).toEqual([{ claimed: true }]);
  await db.exec("delete from public.stripe_webhook_events;");
  await db.exec(migration);
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("service-only Stripe webhook deduplication", () => {
  it.each(["anon", "authenticated"])(
    "denies %s before ledger mutation",
    async (role) => {
      for (const id of ["evt_attack", "  evt_whitespace  "]) {
        await expect(
          asRole(
            role,
            `select public.claim_stripe_webhook_event('${id}','customer.subscription.updated')`,
          ),
        ).rejects.toThrow(/permission denied for function/);
      }
      expect(
        (
          await db.query(
            "select count(*)::int as total from public.stripe_webhook_events",
          )
        ).rows,
      ).toEqual([{ total: 0 }]);
    },
  );

  it("preserves signed service processing, retry and duplicate lifecycle", async () => {
    const claim = () =>
      asRole(
        "service_role",
        "select public.claim_stripe_webhook_event('evt_service','customer.subscription.updated') as claimed",
      );
    expect((await claim()).rows).toEqual([{ claimed: true }]);
    await expect(claim()).rejects.toThrow(/in progress/);
    await db.exec(
      "update public.stripe_webhook_events set processing_started_at=now()-interval '6 minutes'",
    );
    expect((await claim()).rows).toEqual([{ claimed: true }]);
    await db.exec("update public.stripe_webhook_events set state='failed'");
    expect((await claim()).rows).toEqual([{ claimed: true }]);
    await db.exec("update public.stripe_webhook_events set state='processed'");
    expect((await claim()).rows).toEqual([{ claimed: false }]);
  });

  it("is idempotent and preserves definer/search-path and service grant", async () => {
    await db.exec(migration);
    expect(
      (
        await db.query(`select has_function_privilege('anon','public.claim_stripe_webhook_event(text,text)','execute') as anon,
      has_function_privilege('authenticated','public.claim_stripe_webhook_event(text,text)','execute') as authenticated,
      has_function_privilege('service_role','public.claim_stripe_webhook_event(text,text)','execute') as service`)
      ).rows,
    ).toEqual([{ anon: false, authenticated: false, service: true }]);
    expect(
      (
        await db.query(
          "select prosecdef, proconfig from pg_proc where proname='claim_stripe_webhook_event'",
        )
      ).rows,
    ).toEqual([{ prosecdef: true, proconfig: ['search_path=""'] }]);
  });

  it("mirrors operational migrations and retains signature-before-service caller", () => {
    expect(readFileSync(`supabase/migrations/${name}`, "utf8")).toBe(migration);
    const route = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
    const post = route.slice(route.indexOf("export async function POST"));
    expect(post.indexOf("verifyStripeSignature")).toBeLessThan(
      post.indexOf("createSupabaseServiceClient"),
    );
  });
});
