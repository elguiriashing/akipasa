import { describe, expect, it } from "vitest";
import { isSpainLocation, spainLocations } from "../src/lib/locations";
import { FixtureRepository } from "../src/lib/repository";

describe("Spain-wide discovery", () => {
  it("covers every province through at least one search centre", () => {
    const provinces = new Set(
      Object.values(spainLocations).map((place) => place.province),
    );
    expect(provinces.size).toBeGreaterThanOrEqual(52);
    expect(isSpainLocation("madrid")).toBe(true);
    expect(isSpainLocation("las-palmas")).toBe(true);
    expect(isSpainLocation("ceuta")).toBe(true);
    expect(isSpainLocation("melilla")).toBe(true);
  });

  it("returns relevant national demo content around Madrid", async () => {
    const results = await new FixtureRepository(
      new Date("2026-07-23T12:00:00Z"),
    ).discover({ locality: "madrid", radiusKm: 25, time: "all" });
    expect(results.some((result) => result.venue.locality === "madrid")).toBe(
      true,
    );
    expect(results.every((result) => result.distanceKm <= 25)).toBe(true);
  });

  it("falls back safely for a forged locality", async () => {
    const results = await new FixtureRepository(
      new Date("2026-07-23T12:00:00Z"),
    ).discover({ locality: "not-real", radiusKm: 25, time: "all" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.distanceKm <= 25)).toBe(true);
  });
});
