import { loadFeatureFlags } from "@/lib/feature-flags";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  cleanStayName,
  safePropertyWebsite,
  stayQuerySchema,
} from "@/lib/akiduermo";
import { staySearchFilters } from "@/lib/stay-filters";

export async function GET(request: Request) {
  const parsed = stayQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Invalid search" }, { status: 400 });
  const { q, type, page } = parsed.data;
  const supabase = createSupabasePublicClient();
  const flags = await loadFeatureFlags(supabase);
  let query = supabase
    .from("venues")
    .select(
      "id,slug,name,address,accommodation_type,website_url,cities(name_es)",
      { count: "exact" },
    )
    .eq("status", "published")
    .eq("discovery_vertical", "accommodation");
  if (flags.venue_relevance) query = query.eq("discovery_enabled", true);
  if (type !== "all") query = query.eq("accommodation_type", type);
  const search = staySearchFilters(q);
  if (search) query = query.or(search);
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
        name: cleanStayName(row.name),
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
