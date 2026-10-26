import { accountTrackingAllowed } from "../src/lib/account-onboarding-server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { accountAgeVerified } from "../src/lib/age-assurance-server";
import {
  reviewEligibility,
  reviewWindowMs,
  optionalTrackingAllowed,
  adultContentAllowed,
  checkInAllowed,
  type AgeAssurance,
  type ExperienceEvidence,
} from "../src/lib/verified-review-policy";
const now = Date.parse("2026-10-26T12:00:00Z");
const evidence: ExperienceEvidence = {
  profileId: "self",
  listingId: "listing",
  product: "pasa",
  kind: "visit",
  status: "accepted",
  occurredAt: new Date(now - 1000).toISOString(),
  revoked: false,
};
function eligible(
  overrides: Partial<Parameters<typeof reviewEligibility>[0]> = {},
) {
  return reviewEligibility({
    profileId: "self",
    listingId: "listing",
    product: "pasa",
    age: "verified_adult",
    accountAllowed: true,
    profileComplete: true,
    conflictOfInterest: false,
    evidence,
    now,
    ...overrides,
  });
}
afterEach(() => vi.unstubAllEnvs());
describe("shared review and privacy eligibility", () => {
  it.each(["unknown", "declared_underage"] as AgeAssurance[])(
    "protects %s regardless of consent/profile",
    (age) => {
      expect(optionalTrackingAllowed(age, true)).toBe(false);
      expect(adultContentAllowed(age)).toBe(false);
      expect(checkInAllowed(age, true)).toBe(false);
      expect(eligible({ age })).toBe("verification_required");
    },
  );
  it("verification never grants optional consent or bypasses an account restriction", () => {
    expect(optionalTrackingAllowed("verified_adult", false)).toBe(false);
    expect(optionalTrackingAllowed("verified_adult", true)).toBe(true);
    expect(adultContentAllowed("verified_adult")).toBe(true);
    expect(checkInAllowed("verified_adult", false)).toBe(false);
    expect(eligible({ accountAllowed: false })).toBe("verification_required");
  });
  it("requires profile completion and excludes known conflicts", () => {
    expect(eligible({ profileComplete: false })).toBe("profile_required");
    expect(eligible({ conflictOfInterest: true })).toBe("conflict_of_interest");
  });
  it("accepts exactly matched recent evidence", () =>
    expect(eligible()).toBe("eligible"));
  it.each([
    { profileId: "someone_else" },
    { listingId: "competitor" },
    { product: "duermo" },
    { kind: "stay" },
    { status: "pending" },
    { status: "cancelled" },
    { revoked: true },
    { occurredAt: "invalid" },
    { occurredAt: new Date(now + 1).toISOString() },
  ] as Partial<ExperienceEvidence>[])(
    "rejects unusable evidence %j",
    (patch) => {
      expect(eligible({ evidence: { ...evidence, ...patch } })).toBe(
        "experience_required",
      );
    },
  );
  it("rejects absent evidence and nonfinite evaluation time", () => {
    expect(eligible({ evidence: null })).toBe("experience_required");
    expect(eligible({ now: NaN })).toBe("experience_required");
  });
  it("uses an exact seven-day window without trusting a future timestamp", () => {
    expect(
      eligible({
        evidence: {
          ...evidence,
          occurredAt: new Date(now - reviewWindowMs + 1).toISOString(),
        },
      }),
    ).toBe("eligible");
    expect(
      eligible({
        evidence: {
          ...evidence,
          occurredAt: new Date(now - reviewWindowMs).toISOString(),
        },
      }),
    ).toBe("experience_expired");
  });
  it.each([
    ["duermo", "stay"],
    ["coches", "rental"],
  ] as const)(
    "requires a completed %s experience, not office/lobby presence",
    (product, kind) => {
      expect(eligible({ product, evidence: { ...evidence, product } })).toBe(
        "experience_required",
      );
      expect(
        eligible({
          product,
          evidence: { ...evidence, product, kind, status: "completed" },
        }),
      ).toBe("eligible");
    },
  );
});
describe("authoritative age reader", () => {
  it("does not query an uninstalled schema or infer age from a profile", async () => {
    vi.stubEnv("AKISUITE_AGE_ASSURANCE_SCHEMA_READY", "false");
    const rpc = vi.fn();
    expect(await accountAgeVerified({ rpc } as unknown as SupabaseClient)).toBe(
      false,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    null,
    {},
    { adult_verified: false },
    { adult_verified: "true" },
    { adult_verified: 1 },
    { status: "complete" },
    { user_metadata: { adult_verified: true } },
  ])("rejects missing or forged proof %j", async (data) => {
    vi.stubEnv("AKISUITE_AGE_ASSURANCE_SCHEMA_READY", "true");
    expect(
      await accountAgeVerified({
        rpc: async () => ({ data, error: null }),
      } as unknown as SupabaseClient),
    ).toBe(false);
  });
  it("reads only the authenticated caller with no arbitrary profile argument", async () => {
    vi.stubEnv("AKISUITE_AGE_ASSURANCE_SCHEMA_READY", "true");
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { adult_verified: true }, error: null });
    expect(await accountAgeVerified({ rpc } as unknown as SupabaseClient)).toBe(
      true,
    );
    expect(rpc).toHaveBeenCalledWith("my_age_assurance");
  });
  it("fails closed for RPC and transport failures even with an affirmative payload", async () => {
    vi.stubEnv("AKISUITE_AGE_ASSURANCE_SCHEMA_READY", "true");
    for (const rpc of [
      async () => ({
        data: { adult_verified: true },
        error: { message: "down" },
      }),
      async () => {
        throw new Error("offline");
      },
    ]) {
      expect(
        await accountAgeVerified({ rpc } as unknown as SupabaseClient),
      ).toBe(false);
    }
  });
});

describe("staged tracking enforcement", () => {
  it.each([false, true])(
    "uses authoritative proof=%s, not a legacy adult birth year",
    async (adult_verified) => {
      vi.stubEnv("AKISUITE_ONBOARDING_SCHEMA_READY", "false");
      vi.stubEnv("AKISUITE_AGE_ASSURANCE_ENFORCED", "true");
      vi.stubEnv("AKISUITE_AGE_ASSURANCE_SCHEMA_READY", "true");
      const from = vi.fn(),
        rpc = vi
          .fn()
          .mockResolvedValue({ data: { adult_verified }, error: null });
      expect(
        await accountTrackingAllowed(
          { from, rpc } as unknown as SupabaseClient,
          "self",
        ),
      ).toBe(adult_verified);
      expect(from).not.toHaveBeenCalled();
    },
  );
  it("does not turn enforcement into implicit schema readiness", async () => {
    vi.stubEnv("AKISUITE_ONBOARDING_SCHEMA_READY", "false");
    vi.stubEnv("AKISUITE_AGE_ASSURANCE_ENFORCED", "true");
    vi.stubEnv("AKISUITE_AGE_ASSURANCE_SCHEMA_READY", "false");
    const rpc = vi.fn();
    expect(
      await accountTrackingAllowed(
        { rpc } as unknown as SupabaseClient,
        "self",
      ),
    ).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
