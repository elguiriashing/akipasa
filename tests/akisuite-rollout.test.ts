import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/public", () => ({
  createSupabasePublicClient: () => ({
    from: (table: string) => {
      if (table !== "feature_flags") throw new Error("Unexpected table");
      return {
        select: (columns: string) => {
          if (columns !== "enabled") throw new Error("Unexpected columns");
          return {
            eq: (key: string, value: string) => {
              if (key !== "key" || value !== "personal_premium_unlocked")
                throw new Error("Unexpected rollout flag");
              return { maybeSingle: mocked.maybeSingle };
            },
          };
        },
      };
    },
  }),
}));

import { personalPremiumVisible } from "../src/lib/akisuite-rollout";

describe("personal Premium adoption milestone", () => {
  beforeEach(() => mocked.maybeSingle.mockReset());

  it("stays hidden while Excel threshold configuration is absent", async () => {
    mocked.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await personalPremiumVisible()).toBe(false);
  });
  it("stays hidden on a disabled feature flag", async () => {
    mocked.maybeSingle.mockResolvedValue({ data: { enabled: false }, error: null });
    expect(await personalPremiumVisible()).toBe(false);
  });
  it("only appears after the authoritative flag is enabled", async () => {
    mocked.maybeSingle.mockResolvedValue({ data: { enabled: true }, error: null });
    expect(await personalPremiumVisible()).toBe(true);
  });
  it("fails closed on database error or network interruption", async () => {
    mocked.maybeSingle.mockResolvedValueOnce({ data: { enabled: true }, error: { message: "Database unavailable" } });
    expect(await personalPremiumVisible()).toBe(false);
    mocked.maybeSingle.mockRejectedValueOnce(new Error("Offline"));
    expect(await personalPremiumVisible()).toBe(false);
  });
});
