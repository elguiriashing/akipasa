import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AkiSuite additive webhook migration contract", () => {
  const webhook = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
  const migration = readFileSync(
    "database/migrations/20261012180000_akisuite_subscription_entitlements.sql",
    "utf8",
  );

  it("routes recognised new prices separately while keeping legacy sync", () => {
    expect(webhook).toContain("matchConfiguredAkiSuitePriceId(priceId)");
    expect(webhook).toContain('"sync_akisuite_subscription"');
    expect(webhook).toContain('"sync_stripe_subscription"');
    expect(webhook).toContain('["premium", "business", "business_pro"]');
    expect(webhook).toContain("if (!pricePlan && !akiSuitePricePlan) return;");
  });

  it("derives ownership from known subscription/customer before metadata", () => {
    expect(
      webhook.indexOf("existingAkiSuiteSubscription?.profile_id"),
    ).toBeLessThan(webhook.indexOf("stringValue(metadata.profile_id)"));
    expect(webhook).toContain("AkiSuite subscription customer mismatch");
  });

  it("uses a separate table with RLS and chronological webhook protections", () => {
    expect(migration).toContain(
      "create table public.akisuite_billing_subscriptions",
    );
    expect(migration).toContain("enable row level security");
    expect(migration).toContain(
      "excluded.stripe_event_created_at >= public.akisuite_billing_subscriptions.stripe_event_created_at",
    );
    expect(migration).toContain("AkiSuite subscription ownership mismatch");
    expect(migration).toContain("to service_role");
    expect(migration).toContain(
      "public.reconcile_profile_entitlements(p_profile)",
    );
  });

  it("preserves free venue ownership while adding pro-equivalent access", () => {
    expect(migration).toContain("public.has_free_business_access(p_profile)");
    expect(migration).toContain(
      "akisuite_private.plan_active(p_profile,null,'akipasa_premium')",
    );
    expect(migration).toContain(
      "akisuite_private.plan_active(p_profile,null,'akipasa_premium')",
    );
  });
});
