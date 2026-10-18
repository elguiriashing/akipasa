import { afterEach, describe, expect, it } from "vitest";
import { personalPremiumLaunchOpen } from "../src/lib/akisuite-premium-launch";

const keys = [
  "AKISUITE_PERSONAL_PREMIUM_ENABLED",
  "AKISUITE_PERSONAL_PREMIUM_FORCE_OFF",
  "AKISUITE_ADOPTION_EARNED_POINTS",
  "AKISUITE_ADOPTION_UNLOCK_THRESHOLD",
] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("personal Premium rollout gate", () => {
  it("fails closed when not configured", () => {
    for (const key of keys) delete process.env[key];
    expect(personalPremiumLaunchOpen()).toBe(false);
  });
  it("requires activation and the adoption threshold", () => {
    process.env.AKISUITE_PERSONAL_PREMIUM_ENABLED = "true";
    process.env.AKISUITE_ADOPTION_EARNED_POINTS = "7499";
    process.env.AKISUITE_ADOPTION_UNLOCK_THRESHOLD = "7500";
    expect(personalPremiumLaunchOpen()).toBe(false);
    process.env.AKISUITE_ADOPTION_EARNED_POINTS = "7500";
    expect(personalPremiumLaunchOpen()).toBe(true);
    process.env.AKISUITE_PERSONAL_PREMIUM_FORCE_OFF = "true";
    expect(personalPremiumLaunchOpen()).toBe(false);
  });
  it("rejects invalid, missing, and zero thresholds", () => {
    process.env.AKISUITE_PERSONAL_PREMIUM_ENABLED = "true";
    process.env.AKISUITE_ADOPTION_EARNED_POINTS = "9999";
    for (const value of ["", "0", "not-a-number", "-3"]) {
      process.env.AKISUITE_ADOPTION_UNLOCK_THRESHOLD = value;
      expect(personalPremiumLaunchOpen()).toBe(false);
    }
  });
});
