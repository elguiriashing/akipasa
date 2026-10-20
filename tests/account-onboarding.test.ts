import { afterEach, describe, expect, it, vi } from "vitest";
import {
  onboardingDestination,
  onboardingSchema,
  onboardingUrl,
} from "../src/lib/account-onboarding";
import { readOnboardingStatus } from "../src/lib/account-onboarding-server";
import type { SupabaseClient } from "@supabase/supabase-js";
afterEach(() => vi.unstubAllEnvs());
describe("onboarding flow contract", () => {
  it.each(["en", "es"] as const)(
    "retains safe %s task and rejects loops and redirects",
    (locale) => {
      expect(
        onboardingDestination(
          locale,
          `/${locale}/account/subscription?from=akipasa`,
        ),
      ).toBe(`/${locale}/account/subscription?from=akipasa`);
      for (const path of [
        "https://evil.test",
        "//evil.test",
        `/${locale}/onboarding?next=x`,
        `/${locale}/auth/recover`,
        `/${locale}/\\evil.test`,
      ])
        expect(onboardingDestination(locale, path)).toBe(`/${locale}/account`);
      expect(onboardingUrl(locale, `/${locale}/account`)).toContain(
        `/${locale}/onboarding?next=`,
      );
    },
  );
  it("requires only username, affirmative declaration and terms", () => {
    expect(
      onboardingSchema.safeParse({
        username: "alex_123",
        adult: "yes",
        acceptTerms: "accepted",
      }).success,
    ).toBe(true);
    expect(
      onboardingSchema.safeParse({
        username: "alex_123",
        adult: "no",
        acceptTerms: "accepted",
      }).success,
    ).toBe(false);
  });
  it("does not query absent schema before readiness activation", async () => {
    vi.stubEnv("AKISUITE_ONBOARDING_SCHEMA_READY", "false");
    const rpc = vi.fn();
    expect(
      await readOnboardingStatus({ rpc } as unknown as SupabaseClient),
    ).toBe("exempt");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("fails closed on unavailable or malformed authoritative state", async () => {
    vi.stubEnv("AKISUITE_ONBOARDING_SCHEMA_READY", "true");
    for (const value of [
      { data: null, error: { message: "down" } },
      { data: { status: "adult" }, error: null },
    ])
      await expect(
        readOnboardingStatus({
          rpc: vi.fn().mockResolvedValue(value),
        } as unknown as SupabaseClient),
      ).rejects.toThrow(/unavailable/);
  });
});
