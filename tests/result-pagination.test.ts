import { describe, expect, it, vi } from "vitest";
import {
  resultPage,
  resultPageHref,
  resultSlice,
} from "../src/lib/result-pagination";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/supabase/public", () => ({
  createSupabasePublicClient: () => ({ rpc }),
}));
import { nearbyVenuePage } from "../src/lib/unclaimed-venues";

describe("bounded discovery pages", () => {
  it("limits 100k results to twenty per page, without overlap", () => {
    const rows = Array.from({ length: 100000 }, (_, i) => i);
    expect(resultSlice(rows, 1).rows).toEqual(rows.slice(0, 20));
    expect(resultSlice(rows, 2).rows).toEqual(rows.slice(20, 40));
    expect(resultSlice(rows, 100000).page).toBe(5000);
    expect(resultSlice([], 1)).toEqual({ rows: [], page: 1, total: 0 });
  });
  it("normalizes malformed page values", () => {
    for (const value of [undefined, "0", "-1", "1.5", "NaN", ["2"]])
      expect(resultPage(value)).toBe(1);
    expect(resultPage("2")).toBe(2);
  });
  it("retains location, filters, locale and the other page", () => {
    const url = new URL(
      resultPageHref(
        "/es/map",
        {
          latitude: "36.5",
          longitude: "-4.6",
          radius: "15",
          category: "food",
          eventPage: "3",
          venuePage: "1",
        },
        "venuePage",
        2,
        "venue-results",
      ),
      "https://akipasa.com",
    );
    expect(url.pathname).toBe("/es/map");
    expect(url.searchParams.get("eventPage")).toBe("3");
    expect(url.searchParams.get("category")).toBe("food");
    expect(url.searchParams.get("latitude")).toBe("36.5");
    expect(url.searchParams.get("venuePage")).toBe("2");
    expect(url.hash).toBe("#venue-results");
  });
  it("requests one server page with radius and unclaimed filtering", async () => {
    rpc.mockResolvedValueOnce({
      data: { rows: [], total: 100000, page: 2 },
      error: null,
    });
    const page = await nearbyVenuePage({
      center: { latitude: 36.5, longitude: -4.6 },
      radiusKm: 15,
      page: 2,
      unclaimedOnly: true,
    });
    expect(page.total).toBe(100000);
    expect(rpc).toHaveBeenCalledWith("public_nearby_venue_page", {
      p_lat: 36.5,
      p_lng: -4.6,
      p_radius: 15,
      p_page: 2,
      p_unclaimed: true,
    });
  });
});
