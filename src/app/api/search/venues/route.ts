import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  escapeVenueSearchPattern,
  normalizeVenueSearch,
  rankVenueSearchResults,
  venueSearchProbes,
} from "@/lib/venue-search";

const querySchema = z.object({
  q: z.string().max(160).optional().default(""),
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Invalid search" }, { status: 400 });

  const query = normalizeVenueSearch(parsed.data.q);
  if (query.length < 2) return Response.json({ rows: [] });

  const probes = venueSearchProbes(query);
  if (probes.length === 0) return Response.json({ rows: [] });

  const filters = probes
    .flatMap((probe) => {
      const pattern = `%${escapeVenueSearchPattern(probe)}%`;
      return [`name.ilike.${pattern}`, `address.ilike.${pattern}`];
    })
    .join(",");

  const { data, error } = await createSupabasePublicClient()
    .from("venues")
    .select("id,slug,name,address,cities(slug)")
    .eq("status", "published")
    .or(filters)
    .limit(120);

  if (error)
    return Response.json(
      { error: "Venue search temporarily unavailable" },
      { status: 503 },
    );

  const rows = (data || []).map((row) => {
    const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      address: row.address,
      locality: city?.slug || null,
    };
  });

  return Response.json(
    { rows: rankVenueSearchResults(rows, query) },
    {
      headers: {
        "Cache-Control": "public, max-age=20, s-maxage=60",
      },
    },
  );
}
