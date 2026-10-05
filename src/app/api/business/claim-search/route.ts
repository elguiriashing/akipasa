import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { normalizeVenueSearch } from "@/lib/venue-search";

const querySchema = z.object({
  q: z.string().trim().min(2).max(160),
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ rows: [] }, { status: 400 });

  const query = normalizeVenueSearch(parsed.data.q);
  const supabase = createSupabasePublicClient();
  const { data: matches, error } = await supabase.rpc("search_public_venues", {
    p_query: query,
    p_offset: 0,
    p_limit: 24,
  });
  if (error)
    return Response.json(
      { error: "Venue search temporarily unavailable" },
      { status: 503 },
    );

  const ids: string[] = (matches || []).map((row: { id: string }) => row.id);
  if (!ids.length) return Response.json({ rows: [] });

  const { data: venues, error: venueError } = await supabase
    .from("venues")
    .select("id,slug,name,address,latitude,longitude,locality,accessibility")
    .in("id", ids)
    .eq("status", "published");

  if (venueError)
    return Response.json(
      { error: "Venue search temporarily unavailable" },
      { status: 503 },
    );

  const byId = new Map((venues || []).map((venue) => [venue.id, venue]));
  const rows = ids.flatMap((id) => {
    const venue = byId.get(id);
    if (!venue) return [];
    const accessibility =
      venue.accessibility && typeof venue.accessibility === "object"
        ? (venue.accessibility as Record<string, unknown>)
        : {};
    if (accessibility.claim_status !== "unclaimed") return [];
    if (
      typeof venue.latitude !== "number" ||
      typeof venue.longitude !== "number"
    )
      return [];
    return [
      {
        id: venue.id,
        slug: venue.slug,
        name: venue.name,
        address: venue.address,
        locality: venue.locality,
        latitude: venue.latitude,
        longitude: venue.longitude,
      },
    ];
  });

  return Response.json(
    { rows },
    { headers: { "Cache-Control": "public, max-age=15, s-maxage=30" } },
  );
}
