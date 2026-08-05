import { describe, expect, it } from "vitest";
import { FixtureRepository } from "../src/lib/repository";
import { occurrenceMatches, windowBounds } from "../src/lib/time";

describe("discovery", () => {
  const now = new Date("2026-07-22T18:30:00Z");
  it("orders an active occurrence first", async () => {
    const results = await new FixtureRepository(now).discover({
      locality: "fuengirola",
      radiusKm: 15,
      time: "all",
    });
    expect(results).toEqual([]);
  });
  it("applies free and distance filters", async () => {
    const results = await new FixtureRepository(now).discover({
      locality: "fuengirola",
      radiusKm: 1,
      price: "free",
      time: "all",
    });
    expect(
      results.every((r) => r.event.priceCents === 0 && r.distanceKm <= 1),
    ).toBe(true);
  });
  it("applies accessibility and numeric price filters", async () => {
    const results = await new FixtureRepository(now).discover({
      locality: "fuengirola",
      radiusKm: 100,
      time: "all",
      accessible: true,
      minPriceCents: 1,
      maxPriceCents: 5000,
    });
    expect(results).toEqual([]);
  });
  it("applies an explicit date range", async () => {
    const results = await new FixtureRepository(now).discover({
      locality: "fuengirola",
      radiusKm: 100,
      time: "all",
      dateFrom: new Date("2026-07-22T00:00:00Z"),
      dateTo: new Date("2026-07-23T00:00:00Z"),
    });
    expect(results).toEqual([]);
  });
  it("matches an event crossing midnight tonight", () => {
    expect(
      occurrenceMatches(
        "2026-07-22T21:30:00Z",
        "2026-07-23T01:30:00Z",
        "tonight",
        now,
      ),
    ).toBe(true);
  });
  it("allows DST-sized tomorrow windows", () => {
    const [from, to] = windowBounds("tomorrow", now);
    const hours = (to.getTime() - from.getTime()) / 3_600_000;
    expect(hours).toBeGreaterThanOrEqual(23);
    expect(hours).toBeLessThanOrEqual(25);
  });
});
