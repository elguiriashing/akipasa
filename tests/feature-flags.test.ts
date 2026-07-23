import { describe, expect, it } from "vitest";
import {
  defaultFeatureFlags,
  resolveFeatureFlags,
} from "../src/lib/feature-flags";

describe("operational feature flags", () => {
  it("uses availability-safe defaults when rows are missing", () => {
    expect(resolveFeatureFlags(undefined)).toEqual(defaultFeatureFlags);
  });

  it("applies known database switches and ignores unknown keys", () => {
    expect(
      resolveFeatureFlags([
        { key: "community_submissions", enabled: false },
        { key: "loyalty_check_ins", enabled: false },
        { key: "unknown_future_flag", enabled: false },
      ]),
    ).toEqual({
      community_submissions: false,
      loyalty_check_ins: false,
      promotion_requests: true,
    });
  });
});
