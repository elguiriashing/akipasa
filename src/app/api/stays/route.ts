import { loadFeatureFlags } from "@/lib/feature-flags";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  cleanStayName,
  safePropertyWebsite,
  stayQuerySchema,
} from "@/lib/akiduermo";
import { staySearchFilters } from "@/lib/stay-filters";
import { z } from "zod";

const searchSchema = stayQuerySchema
  .extend({
    checkIn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    checkOut: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    guests: z.coerce.number().int().min(1).max(30).optional(),
  })
  .refine(
    (value) =>
      (!value.checkIn && !value.checkOut && value.guests === undefined) ||
      (Boolean(value.checkIn && value.checkOut && value.guests) &&
        value.checkOut! > value.checkIn! &&
        (Date.parse(value.checkOut!) - Date.parse(value.checkIn!)) /
          86_400_000 <=
          365),
  );

export async function GET(request: Request) {
  const parsed = searchSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Invalid search" }, { status: 400 });
  const { q, type, page, checkIn, checkOut, guests } = parsed.data;
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
  let availableIds: Set<string> | null = null;
  if (checkIn && checkOut && guests && data?.length) {
    const availability = await Promise.all(
      data.map((stay) =>
        supabase.rpc("accommodation_available_rooms", {
          p_venue: stay.id,
          p_in: checkIn,
          p_out: checkOut,
          p_guests: guests,
        }),
      ),
    );
    if (availability.some((result) => result.error))
      return Response.json(
        { error: "Availability is temporarily unavailable" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    availableIds = new Set(
      data
        .filter((_, index) =>
          Array.isArray(availability[index].data)
            ? availability[index].data.length > 0
            : false,
        )
        .map((stay) => stay.id),
    );
  }
  return Response.json(
    {
      rows: (data || [])
        .filter((row) => !availableIds || availableIds.has(row.id))
        .map((row) => ({
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
      availabilityChecked: Boolean(checkIn && checkOut && guests),
    },
    {
      headers: {
        "Cache-Control": checkIn
          ? "private, no-store"
          : "public, max-age=30, s-maxage=60",
      },
    },
  );
}
