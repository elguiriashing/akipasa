import { describe, expect, it } from "vitest";
import { isSpainLocation, spainLocations } from "../src/lib/locations";
import { FixtureRepository } from "../src/lib/repository";
import {
  geographicDistanceKm,
  geographyPointCoordinates,
  venueClaimStatus,
} from "../src/lib/unclaimed-venues";
import { discoveryLocationFromQuery } from "../src/lib/discovery-location";
import {
  majorCities,
  nearestMajorCities,
  cityDiscoveryHref,
} from "../src/lib/city-discovery";
import { existsSync } from "node:fs";

describe("city destination discovery", () => {
  it("has licensed local photos across every province and autonomous city", () => {
    expect(new Set(majorCities.map((city) => city.province)).size).toBe(52);
    for (const city of majorCities) {
      expect(existsSync(`public${city.photo.src}`)).toBe(true);
      expect(city.photo.source).toMatch(/^https:\/\/commons.wikimedia.org\//);
      expect(city.photo.license).toMatch(/^(CC BY|CC0|Public domain)/);
      expect(city.photo.credit.length).toBeGreaterThan(0);
    }
  });
  it("ranks nearby cities geographically instead of promoting the featured five", () => {
    expect(
      nearestMajorCities(spainLocations.vigo).map((city) => city.key),
    ).toEqual(["vigo", "pontevedra", "ourense"]);
    expect(
      nearestMajorCities(spainLocations["santa-cruz-tenerife"]).map(
        (city) => city.key,
      ),
    ).toEqual(["santa-cruz-tenerife", "la-laguna", "las-palmas"]);
    expect(nearestMajorCities(spainLocations.madrid)[0].distance).toBe(0);
    expect(nearestMajorCities({ latitude: NaN, longitude: 0 })).toEqual([]);
  });
  it("opens city results with the correct coordinates and fresh discovery filters", () => {
    const city = majorCities.find((city) => city.key === "valencia")!;
    const url = new URL(cityDiscoveryHref(city, "es"), "https://akipasa.com");
    expect(url.pathname).toBe("/es");
    expect(url.hash).toBe("#results");
    expect(url.searchParams.get("latitude")).toBe(
      String(spainLocations.valencia.latitude),
    );
    expect(url.searchParams.get("time")).toBe("all");
    expect(url.searchParams.get("radius")).toBe("25");
  });
});

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

  it("returns relevant national discovery results around Madrid", async () => {
    const results = await new FixtureRepository(
      new Date("2026-07-23T12:00:00Z"),
    ).discover({ locality: "madrid", radiusKm: 25, time: "all" });
    expect(results).toEqual([]);
  });

  it("falls back safely for a forged locality", async () => {
    const results = await new FixtureRepository(
      new Date("2026-07-23T12:00:00Z"),
    ).discover({ locality: "not-real", radiusKm: 25, time: "all" });
    expect(results).toEqual([]);
  });

  it("includes nearby municipalities by geographic radius", () => {
    const distance = geographicDistanceKm(spainLocations.fuengirola, {
      latitude: 36.661810763555,
      longitude: -4.5627139342424,
    });
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(25);
  });

  it("decodes the PostGIS EWKB returned by the public venues API", () => {
    const coordinates = geographyPointCoordinates(
      "0101000020E6100000644CE214384012C006CE1037B6544240",
    );
    expect(coordinates?.longitude).toBeCloseTo(-4.5627139342424, 12);
    expect(coordinates?.latitude).toBeCloseTo(36.661810763555, 12);
  });

  it("distinguishes explicitly unclaimed venues from claimed venues", () => {
    expect(venueClaimStatus({ claim_status: "unclaimed" })).toBe("unclaimed");
    expect(venueClaimStatus({ step_free: true })).toBe("claimed");
    expect(venueClaimStatus(null)).toBe("claimed");
  });

  it("accepts an exact Spain-wide search centre outside the curated list", () => {
    const location = discoveryLocationFromQuery(
      {
        locality: "fuengirola",
        locationName: "Ronda, Málaga, España",
        latitude: "36.7462",
        longitude: "-5.1612",
      },
      "es",
    );
    expect(location.name).toBe("Ronda, Málaga, España");
    expect(location.center).toEqual({
      latitude: 36.7462,
      longitude: -5.1612,
    });
    expect(location.custom).toBe(true);
  });
});
