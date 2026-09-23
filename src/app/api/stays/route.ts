import { createSupabasePublicClient } from "@/lib/supabase/public";
import { safePropertyWebsite, stayQuerySchema } from "@/lib/akiduermo";
import {
  escapeVenueSearchPattern,
  venueSearchProbes,
  comparableVenueSearch,
} from "@/lib/venue-search";

export async function GET(request: Request) {
  const parsed = stayQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Invalid search" }, { status: 400 });
  const { q, type, page } = parsed.data;
  let query = createSupabasePublicClient()
    .from("venues")
    .select(
      "id,slug,name,address,accommodation_type,website_url,cities(name_es)",
      { count: "exact" },
    )
    .eq("status", "published")
    .eq("discovery_vertical", "accommodation");
  if (type !== "all") query = query.eq("accommodation_type", type);
  // Strip PostgREST grammar characters before constructing its OR expression.
  const search = q
    .replace(/[(),.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (search) {
    const probes = venueSearchProbes(search).filter(
      (probe) => comparableVenueSearch(probe) === comparableVenueSearch(search),
    );
    const filters = [...new Set([search, ...probes])].flatMap((probe) => {
      const pattern = escapeVenueSearchPattern(probe);
      return [`name.ilike.%${pattern}%`, `address.ilike.%${pattern}%`];
    });
    query = query.or(filters.join(","));
  }
  const { data, error, count } = await query
    .order("name")
    .order("id")
    .range((page - 1) * 12, page * 12 - 1);
  if (error)
    return Response.json(
      { error: "Accommodation search is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(
    {
      rows: (data || []).map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        address: row.address,
        accommodationType: row.accommodation_type,
        website: safePropertyWebsite(row.website_url),
        city:
          (Array.isArray(row.cities) ? row.cities[0] : row.cities)?.name_es ||
          "Spain",
      })),
      total: count || 0,
      page,
    },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
  );
}
