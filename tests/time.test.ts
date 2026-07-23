import { describe, expect, it } from "vitest";
import { madridLocalDateTimeSchema } from "../src/lib/time";

describe("Madrid local date/time parsing", () => {
  it("preserves Spanish wall-clock time across daylight saving", () => {
    expect(
      madridLocalDateTimeSchema.parse("2026-01-23T20:00").toISOString(),
    ).toBe("2026-01-23T19:00:00.000Z");
    expect(
      madridLocalDateTimeSchema.parse("2026-07-23T20:00").toISOString(),
    ).toBe("2026-07-23T18:00:00.000Z");
  });

  it("rejects a wall-clock time skipped by the DST transition", () => {
    expect(
      madridLocalDateTimeSchema.safeParse("2026-03-29T02:30").success,
    ).toBe(false);
  });
});
