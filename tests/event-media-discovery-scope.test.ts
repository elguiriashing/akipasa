import { expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { SupabaseDiscoveryRepository } from "../src/lib/repository";
import { createSupabasePublicClient } from "../src/lib/supabase/public";
vi.mock("../src/lib/supabase/public", () => ({
  createSupabasePublicClient: vi.fn(),
}));
const venueOne = "cc000000-0000-4000-8000-000000000001",
  venueTwo = "cc000000-0000-4000-8000-000000000002",
  eventOne = "cc000000-0000-4000-8000-000000000003",
  eventTwo = "cc000000-0000-4000-8000-000000000004";
const row = (event: string, venue: string) => ({
  id: event,
  venue_id: venue,
  slug: `event-${event}`,
  title_es: "Synthetic event",
  description_es: "Synthetic description",
  price_cents: 0,
  categories: { slug: "music" },
  event_occurrences: [
    {
      id: `occ-${event}`,
      starts_at: "2030-01-02T10:00:00Z",
      ends_at: "2030-01-02T11:00:00Z",
      status: "scheduled",
    },
  ],
  venues: {
    id: venue,
    slug: `venue-${venue}`,
    name: "Synthetic venue",
    address: "Synthetic address",
    location: { coordinates: [-4.42, 36.72] },
    cities: { slug: "malaga" },
    status: "published",
    discovery_enabled: true,
    venue_media: [],
  },
});
const placement = (
  venue: string,
  event: string,
  path: string,
  order: number,
) => ({
  venue_id: venue,
  target_key: event,
  placement: "event_banner",
  sort_order: order,
  media_id: path,
  venue_media: { id: path, storage_path: path, alt_es: "Selected artwork" },
});
it.each([true, false])(
  "ignores foreign venue artwork even when both venues are visible and legitimate artwork exists=%s",
  async (legitimate) => {
    const signed: string[] = [];
    const fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url,
        );
        const reply = (data: unknown) =>
          new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
          });
        if (url.pathname === "/rest/v1/events")
          return reply([row(eventOne, venueOne), row(eventTwo, venueTwo)]);
        if (url.pathname === "/rest/v1/feature_flags") return reply([]);
        if (url.pathname === "/rest/v1/venue_media_placements")
          return reply(
            url.searchParams.get("target_key")?.startsWith("in.")
              ? [
                  ...(legitimate
                    ? [placement(venueOne, eventOne, "legitimate.png", 0)]
                    : []),
                  placement(venueTwo, eventTwo, "second-event.png", 0),
                  placement(venueTwo, eventOne, "foreign-injected.png", 10000),
                ]
              : [],
          );
        if (url.pathname === "/storage/v1/object/sign/event-media") {
          const { paths } = JSON.parse(String(init?.body)) as {
            paths: string[];
          };
          signed.push(...paths);
          return reply(
            paths.map((path) => ({
              path,
              signedURL: `/object/sign/event-media/${path}?token=fixture`,
              error: null,
            })),
          );
        }
        throw new Error(`Unexpected fixture request ${url.pathname}`);
      },
    );
    const client = createClient("http://127.0.0.1:3999", "synthetic-anon-key", {
      global: { fetch },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    vi.mocked(createSupabasePublicClient).mockReturnValue(client);
    const results = await new SupabaseDiscoveryRepository().discover({
      latitude: 36.72,
      longitude: -4.42,
      radiusKm: 25,
      now: new Date("2030-01-01T10:00Z"),
    });
    expect(results).toHaveLength(2);
    expect(signed).not.toContain("foreign-injected.png");
    const selected = results.find((result) => result.event.id === eventOne)!;
    if (legitimate)
      expect(selected.event.bannerImage?.url).toContain("legitimate.png");
    else expect(selected.event.bannerImage).toBeUndefined();
    expect(
      results.find((result) => result.event.id === eventTwo)?.event.bannerImage
        ?.url,
    ).toContain("second-event.png");
  },
);
