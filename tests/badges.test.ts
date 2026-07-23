import { describe, expect, it } from "vitest";
import { badgeProgress } from "../src/lib/badges";

describe("XP badge progression", () => {
  it("shows the first target without awarding a badge early", () => {
    expect(badgeProgress(0)).toMatchObject({
      earned: [],
      remainingXp: 10,
    });
    expect(badgeProgress(9).next?.key).toBe("first_step");
  });

  it("awards deterministic cumulative badges at each threshold", () => {
    expect(badgeProgress(10).earned.map((badge) => badge.key)).toEqual([
      "first_step",
    ]);
    expect(badgeProgress(100).earned.map((badge) => badge.key)).toEqual([
      "first_step",
      "local_regular",
    ]);
    expect(badgeProgress(500)).toMatchObject({
      next: null,
      remainingXp: 0,
    });
  });

  it("normalises invalid negative and fractional progression", () => {
    expect(badgeProgress(-20).remainingXp).toBe(10);
    expect(badgeProgress(99.9).remainingXp).toBe(1);
  });
});
