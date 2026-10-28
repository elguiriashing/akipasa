import { describe, expect, it } from "vitest";
import { madridLocalDateTimeSchema } from "../src/lib/time";
import { madridToday, planShortcutHref } from "../src/lib/plans-first";

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

describe("plans-first Costa discovery shortcuts", () => {
  const location = {
    locality: "fuengirola",
    name: "Fuengirola",
    latitude: 36.539,
    longitude: -4.624,
    radius: 25,
  };

  it("uses Madrid calendar dates for today, including after midnight and DST", () => {
    expect(madridToday(new Date("2026-10-27T23:30:00Z"))).toBe("2026-10-28");
    expect(madridToday(new Date("2026-07-31T22:30:00Z"))).toBe("2026-08-01");
    const href = planShortcutHref(
      "es",
      location,
      "today",
      new Date("2026-10-27T23:30:00Z"),
    );
    const query = new URL(href, "https://akipasa.com").searchParams;
    expect(query.get("dateFrom")).toBe("2026-10-28");
    expect(query.get("dateTo")).toBe("2026-10-28");
    expect(query.get("time")).toBe("all");
  });

  it("uses existing supported filters without asking for location or authentication", () => {
    for (const shortcut of ["tonight", "weekend", "free"] as const) {
      const url = new URL(
        planShortcutHref("en", location, shortcut),
        "https://akipasa.com",
      );
      expect(url.pathname).toBe("/en");
      expect(url.searchParams.get("locality")).toBe("fuengirola");
      expect(url.hash).toBe("#results");
      if (shortcut === "free") expect(url.searchParams.get("price")).toBe("free");
      else expect(url.searchParams.get("time")).toBe(shortcut);
    }
  });
});
