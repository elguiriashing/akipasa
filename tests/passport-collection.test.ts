import { describe, it, expect } from "vitest";
import {
  familyProgress,
  cardFinish,
  type PassportFamily,
} from "../src/lib/passport-collection";
const family = (
  natural: number,
  manual: number,
  count: number,
): PassportFamily => ({
  family_key: "stamp/fuengirola/cafe",
  city_key: "fuengirola",
  category_key: "cafe",
  archived: false,
  current_count: count,
  available: 12,
  remaining: 12 - count,
  milestones: [1, 5, 10, 25, 50].map((n, i) => ({
    key: "k" + n,
    tier: i + 1,
    target: n,
    title_en: "Cafe",
    title_es: "Café",
    unlocked_at: i + 1 <= natural ? "2026-10-03" : null,
    manual_at: i + 1 === manual ? "2026-10-03" : null,
  })),
});
describe("passport progression", () => {
  it("keeps manual appearance separate from real activity", () => {
    const p = familyProgress(family(0, 2, 0));
    expect(p.tier).toBe(2);
    expect(p.count).toBe(0);
    expect(p.next?.target).toBe(10);
    expect(p.admin).toBe(true);
  });
  it("never downgrades natural awards on lower grants or revocation", () => {
    expect(familyProgress(family(3, 2, 10)).tier).toBe(3);
    expect(familyProgress(family(3, 0, 10)).tier).toBe(3);
  });
  it("does not promise unattainable next tier", () => {
    expect(familyProgress(family(3, 0, 10)).attainable).toBe(false);
  });
  it("maps only the three distinct earned finishes", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(cardFinish)).toEqual([
      "plain",
      "satin",
      "satin",
      "holographic",
      "holographic",
      "prismatic",
      "prismatic",
    ]);
  });
  it("keeps earned highest tier after classification count changes", () => {
    expect(familyProgress(family(5, 0, 4)).tier).toBe(5);
    expect(familyProgress(family(5, 0, 4)).next).toBeUndefined();
  });
});
