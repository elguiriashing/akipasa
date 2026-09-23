import { createSupabasePublicClient } from "@/lib/supabase/public";
import { stayQuerySchema } from "@/lib/akiduermo";
import { staySearchFilters } from "@/lib/stay-filters";
export async function GET(request: Request) {
  const parsed = stayQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success || parsed.data.page > 100)
    return Response.json({ error: "Invalid stay filters" }, { status: 400 });
  const { q, type, page } = parsed.data;
  let query = createSupabasePublicClient()
    .from("venues")
    .select("id", { count: "exact" })
    .eq("status", "published")
    .eq("discovery_vertical", "accommodation");
  if (type !== "all") query = query.eq("accommodation_type", type);
  const search = staySearchFilters(q);
  if (search) query = query.or(search);
  const { data, error, count } = await query
    .order("id")
    .range((page - 1) * 1000, page * 1000 - 1);
  if (error)
    return Response.json(
      { error: "Stay filters temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(
    { ids: (data || []).map((row) => row.id), total: count || 0 },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
  );
}
