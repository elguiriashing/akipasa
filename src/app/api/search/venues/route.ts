import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  escapeVenueSearchPattern,
  normalizeVenueSearch,
  rankVenueSearchResults,
} from "@/lib/venue-search";

const querySchema = z.object({
  q: z.string().max(120).optional().default(""),
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Invalid search" }, { status: 400 });

  const query = normalizeVenueSearch(parsed.data.q);
  if (query.length < 2) return Response.json({ rows: [] });

  const pattern = `%${escapeVenueSearchPattern(query)}%`;
  const { data, error } = await createSupabasePublicClient()
    .from("venues")
    .select("id,slug,name,address")
    .eq("status", "published")
    .ilike("name", pattern)
    .limit(24);

  if (error)
    return Response.json(
      { error: "Venue search temporarily unavailable" },
      { status: 503 },
    );

  return Response.json(
    { rows: rankVenueSearchResults(data || [], query) },
    {
      headers: {
        "Cache-Control": "public, max-age=20, s-maxage=60",
      },
    },
  );
}
