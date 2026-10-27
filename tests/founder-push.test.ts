import { describe, expect, it } from "vitest";
import {
  claimPushUrl,
  founderPushEnabled,
  founderPushStartedAt,
  founderUserIds,
} from "../src/lib/founder-push";

const alex = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const andrew = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
describe("founder-only push authorization", () => {
  it("defaults off", () => expect(founderPushEnabled({})).toBe(false));
  it("rejects malformed founders and duplicates", () => {
    expect([
      ...founderUserIds("bad," + alex + "," + alex + "," + andrew),
    ]).toEqual([alex, andrew]);
  });
  it("requires the enable flag, configured founder UUID and activation cutoff", () => {
    expect(founderPushEnabled({ AKIPASA_PUSH_ENABLED: "true" })).toBe(false);
    expect(
      founderPushEnabled({
        AKIPASA_PUSH_ENABLED: "false",
        AKIPASA_PUSH_FOUNDER_IDS: alex,
      }),
    ).toBe(false);
    expect(
      founderPushEnabled({
        AKIPASA_PUSH_ENABLED: "true",
        AKIPASA_PUSH_FOUNDER_IDS: alex,
        AKIPASA_PUSH_STARTED_AT: "2026-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });
  it("fails closed for missing, ambiguous, impossible or future activation dates", () => {
    for (const value of [
      undefined,
      "",
      "2026-01-01",
      "2026-02-30T00:00:00Z",
      "infinity",
      "2999-01-01T00:00:00Z",
    ]) {
      expect(founderPushStartedAt(value)).toBeNull();
      expect(
        founderPushEnabled({
          AKIPASA_PUSH_ENABLED: "true",
          AKIPASA_PUSH_FOUNDER_IDS: alex,
          AKIPASA_PUSH_STARTED_AT: value,
        }),
      ).toBe(false);
    }
    expect(founderPushStartedAt("2026-01-01T00:00:00Z")).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(founderPushStartedAt("2026-01-01T00:00:00.123Z")).toBe(
      "2026-01-01T00:00:00.123Z",
    );
  });
  it("does not accept arbitrary notification link targets", () => {
    expect(claimPushUrl(alex)).toContain("queue=claims&claim=" + alex);
    expect(() => claimPushUrl("https://evil.test")).toThrow();
    expect(() => claimPushUrl("-".repeat(36))).toThrow();
  });
});
