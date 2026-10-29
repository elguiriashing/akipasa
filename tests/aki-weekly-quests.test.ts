import { describe, expect, it } from "vitest";
import {
  currentMadridQuestWeek,
  weeklyCredentialQuestProgress,
  type VenueCredentialVisit,
} from "../src/lib/aki-weekly-quests";

const now = new Date("2026-10-29T19:00:00Z");

function accepted(
  venue: string,
  at = "2026-10-29T17:00:00Z",
): VenueCredentialVisit {
  return {
    venue_id: venue,
    state: "accepted",
    credential_id: "venue-credential",
    created_at: at,
  };
}

describe("AkiPassport optional weekly venue milestones", () => {
  it("uses civil Madrid Mondays after the October clock change", () => {
    const week = currentMadridQuestWeek(now);
    expect(week.start.toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(week.end.toISOString()).toBe("2026-11-01T23:00:00.000Z");
  });

  it("does not assume a 168-hour week at the spring clock change", () => {
    const week = currentMadridQuestWeek(new Date("2026-03-27T12:00:00Z"));
    expect(week.start.toISOString()).toBe("2026-03-22T23:00:00.000Z");
    expect(week.end.toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect(
      (week.end.getTime() - week.start.getTime()) / 3_600_000,
    ).toBe(167);
  });

  it("counts one accepted credential-backed visit per distinct venue", () => {
    const progress = weeklyCredentialQuestProgress(
      [
        accepted("venue-a"),
        accepted("venue-a"),
        accepted("venue-b"),
        accepted("venue-c", "2026-10-20T20:00:00Z"),
      ],
      now,
    );
    expect(progress.distinctVerifiedVenues).toBe(2);
    expect(progress.milestones.map((entry) => entry.achieved)).toEqual([
      true,
      true,
    ]);
  });

  it("rejects GPS-only acceptance, duplicates, cooldowns and future timestamps", () => {
    const progress = weeklyCredentialQuestProgress(
      [
        { ...accepted("gps"), credential_id: null },
        { ...accepted("dupe"), state: "duplicate" },
        { ...accepted("cooldown"), state: "cooldown" },
        accepted("future", "2026-10-30T23:00:00Z"),
        accepted("invalid", "not-a-date"),
        { ...accepted("none"), venue_id: null },
        accepted("real"),
      ],
      now,
    );
    expect(progress.distinctVerifiedVenues).toBe(1);
    expect(progress.milestones).toEqual([
      {
        id: "first-venue",
        target: 1,
        completed: 1,
        achieved: true,
      },
      {
        id: "two-venues",
        target: 2,
        completed: 1,
        achieved: false,
      },
    ]);
  });

  it("does not manufacture XP, tokens or rewards", () => {
    const progress = weeklyCredentialQuestProgress([], now);
    expect(progress.distinctVerifiedVenues).toBe(0);
    expect(progress.milestones.every((entry) => !entry.achieved)).toBe(true);
    expect(Object.keys(progress).sort()).toEqual([
      "distinctVerifiedVenues",
      "milestones",
    ]);
  });
});
