import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/pals/world/venues/route";
import { previewAccess } from "@/lib/pals/server";
import { nearbyVenuePage } from "@/lib/unclaimed-venues";

vi.mock("@/lib/pals/server", () => ({
  previewAccess: vi.fn(),
  privateHeaders: { "Cache-Control": "private, no-store" },
}));
vi.mock("@/lib/unclaimed-venues", () => ({
  nearbyVenuePage: vi.fn(),
}));

const route = (lat = "36.54", lng = "-4.62") =>
  new Request("https://akipasa.com/pals/world/venues?lat=" + lat + "&lng=" + lng);

describe("AkiPals World server boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(previewAccess).mockResolvedValue({
      user: { id: "approved-test-user" },
      allowed: true,
    } as never);
    vi.mocked(nearbyVenuePage).mockResolvedValue({
      rows: [],
      total: 0,
      page: 1,
    });
  });

  it("rejects unauthenticated visitors before accessing public venue data", async () => {
    vi.mocked(previewAccess).mockResolvedValue({ user: null, allowed: false } as never);
    expect((await GET(route())).status).toBe(401);
    expect(nearbyVenuePage).not.toHaveBeenCalled();
  });

  it("does not disclose the preview to an unauthorized signed-in account", async () => {
    vi.mocked(previewAccess).mockResolvedValue({ user: { id: "other" }, allowed: false } as never);
    expect((await GET(route())).status).toBe(404);
    expect(nearbyVenuePage).not.toHaveBeenCalled();
  });

  it("rejects overly detailed location and does not query the database", async () => {
    expect((await GET(route("36.54345", "-4.62"))).status).toBe(400);
    expect(nearbyVenuePage).not.toHaveBeenCalled();
  });

  it("returns genuine existing published venue records only, with no rewards or tracking", async () => {
    vi.mocked(nearbyVenuePage).mockResolvedValue({
      rows: [
        { id: "v1", slug: "real-venue", name: "Real venue", address: "Test", latitude: 36.55, longitude: -4.62, distanceKm: 0.2, claimStatus: "claimed" },
      ],
      total: 1,
      page: 1,
    });
    const response = await GET(route());
    const result = await response.json() as { venues: Array<Record<string, unknown>> };
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(nearbyVenuePage).toHaveBeenCalledWith({
      center: { latitude: 36.54, longitude: -4.62 },
      radiusKm: 8,
      page: 1,
    });
    expect(result.venues).toEqual([{
      id: "v1", slug: "real-venue", name: "Real venue", latitude: 36.55, longitude: -4.62, claimStatus: "claimed",
    }]);
    expect(JSON.stringify(result)).not.toMatch(/xp|reward|check.in|presence|user_id|address/i);
  });

  it("fails closed when venue lookup becomes unavailable", async () => {
    vi.mocked(nearbyVenuePage).mockRejectedValue(new Error("service offline"));
    expect((await GET(route())).status).toBe(503);
  });
});
