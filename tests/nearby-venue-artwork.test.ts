import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { nearbyVenuePage } from "../src/lib/unclaimed-venues";
import { createSupabasePublicClient } from "../src/lib/supabase/public";

vi.mock("../src/lib/supabase/public", () => ({
  createSupabasePublicClient: vi.fn(),
}));

const claimedId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unclaimedId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const rows = [
  {
    id: claimedId,
    slug: "test-venue",
    name: "Test Venue",
    address: "Calle Test 1",
    claimStatus: "claimed",
    distanceKm: 0.1,
    latitude: 36.54,
    longitude: -4.62,
  },
  {
    id: unclaimedId,
    slug: "unclaimed-venue",
    name: "Unclaimed Venue",
    address: "Calle Test 2",
    claimStatus: "unclaimed",
    distanceKm: 0.2,
    latitude: 36.54,
    longitude: -4.62,
  },
];

function fakeClient({
  unclaimedPhoto = false,
  selectedDenied = false,
}: { unclaimedPhoto?: boolean; selectedDenied?: boolean } = {}) {
  const requestedPaths: string[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const response = (data: unknown) =>
      new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    if (url.pathname === "/rest/v1/rpc/public_nearby_venue_page")
      return response({ rows, total: 2, page: 1 });
    if (url.pathname === "/rest/v1/venue_media_placements")
      return response([
        {
          venue_id: claimedId,
          placement: "venue_cover",
          venue_media: { id: "cover", storage_path: "test/cover.jpg" },
        },
        {
          venue_id: claimedId,
          placement: "venue_explore",
          venue_media: { id: "explore", storage_path: "test/explore.jpg" },
        },
      ]);
    if (url.pathname === "/rest/v1/venue_media")
      return response(
        unclaimedPhoto
          ? [{ venue_id: unclaimedId, storage_path: "other/first.jpg" }]
          : [],
      );
    if (url.pathname === "/storage/v1/object/sign/event-media") {
      const body = JSON.parse(String(init?.body)) as { paths: string[] };
      requestedPaths.push(...body.paths);
      return response(
        body.paths.map((path) => ({
          path,
          signedURL: "/object/sign/event-media/" + path + "?token=fixture",
          error:
            selectedDenied && path === "test/explore.jpg"
              ? "Access denied"
              : null,
        })),
      );
    }
    throw new Error("Unexpected request: " + url.pathname);
  });
  const client = createClient("http://127.0.0.1:3999", "synthetic-key", {
    global: { fetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  vi.mocked(createSupabasePublicClient).mockReturnValue(client);
  return { requestedPaths };
}

describe("Home/Map nearby card artwork", () => {
  it("uses the assigned AkiHQ Explore image over Cover, without claiming an unclaimed photo", async () => {
    const { requestedPaths } = fakeClient();
    const result = await nearbyVenuePage({
      center: { latitude: 36.54, longitude: -4.62 },
      radiusKm: 25,
    });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].imageUrl).toContain("test/explore.jpg");
    expect(result.rows[1].imageUrl).toBeUndefined();
    expect(requestedPaths).toEqual(["test/explore.jpg"]);
  });

  it("preserves genuine unclaimed photography and never invents an image", async () => {
    fakeClient({ unclaimedPhoto: true });
    const result = await nearbyVenuePage({
      center: { latitude: 36.54, longitude: -4.62 },
      radiusKm: 25,
    });
    expect(result.rows[1].imageUrl).toContain("other/first.jpg");
  });

  it("does not expose storage paths when signing denies access", async () => {
    fakeClient({ selectedDenied: true });
    const result = await nearbyVenuePage({
      center: { latitude: 36.54, longitude: -4.62 },
      radiusKm: 25,
    });
    expect(result.rows[0].imageUrl).toBeUndefined();
    expect(result.rows).toHaveLength(2);
  });
});
