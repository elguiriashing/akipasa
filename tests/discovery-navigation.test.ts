import { describe, expect, it } from "vitest";
import { discoveryViewHref } from "@/lib/discovery-navigation";

describe("Discover and Map navigation", () => {
  it("preserves only discovery filters and clears view-specific paging", () => {
    const query = new URLSearchParams({
      locality: "madrid",
      locationName: "Madrid Centro",
      latitude: "40.4168",
      longitude: "-3.7038",
      radius: "15",
      time: "tonight",
      category: "music",
      price: "paid",
      minPrice: "5",
      maxPrice: "25",
      dateFrom: "2026-11-01",
      dateTo: "2026-11-02",
      accessible: "on",
      eventPage: "3",
      venuePage: "2",
      list: "1",
      unrelated: "discard-me",
    });

    const href = discoveryViewHref("en", "map", query);
    const url = new URL(href, "https://akipasa.com");
    expect(url.pathname).toBe("/en/map");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      locality: "madrid",
      locationName: "Madrid Centro",
      latitude: "40.4168",
      longitude: "-3.7038",
      radius: "15",
      time: "tonight",
      category: "music",
      price: "paid",
      minPrice: "5",
      maxPrice: "25",
      dateFrom: "2026-11-01",
      dateTo: "2026-11-02",
      accessible: "on",
    });
  });

  it("returns a clean localized path when no discovery filter is active", () => {
    expect(discoveryViewHref("es", "discover", {})).toBe("/es");
    expect(discoveryViewHref("es", "map", {})).toBe("/es/map");
  });

  it("bounds values copied from an untrusted URL", () => {
    const href = discoveryViewHref("en", "discover", {
      locationName: "x".repeat(500),
    });
    expect(
      new URL(href, "https://akipasa.com").searchParams.get("locationName"),
    ).toHaveLength(160);
  });
});
