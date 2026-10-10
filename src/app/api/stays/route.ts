import { loadFeatureFlags } from "@/lib/feature-flags";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";
import {
  cleanStayName,
  safePropertyWebsite,
  stayQuerySchema,
} from "@/lib/akiduermo";
import { staySearchFilters } from "@/lib/stay-filters";
import { comparableVenueSearch } from "@/lib/venue-search";
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
  const hasSession = hasSupabaseAuthCookie(
    (request.headers.get("cookie") || "")
      .split(";")
      .map((part) => ({ name: part.trim().split("=")[0] })),
  );
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
  // A manager may test a hidden property by city or name without publishing
  // the fictional fixture to anonymous discovery. Membership is read with the
  // caller's session and checked again after the join; no service role is used.
  const ownerPreviews: Array<(typeof data)[number] & { ownerPreview: true }> =
    [];
  if (hasSession && q && page === 1) {
    const ownerDb = await createSupabaseServerClient();
    const { data: auth } = await ownerDb.auth.getUser();
    if (auth.user) {
      const { data: memberships } = await ownerDb
        .from("venue_members")
        .select(
          "role,venues(id,slug,name,address,accommodation_type,website_url,cities(name_es),status,discovery_vertical,discovery_enabled)",
        )
        .eq("profile_id", auth.user.id)
        .in("role", ["owner", "manager"])
        .limit(100);
      const term = comparableVenueSearch(q);
      for (const member of memberships || []) {
        if (member.role !== "owner" && member.role !== "manager") continue;
        const venue = Array.isArray(member.venues)
          ? member.venues[0]
          : member.venues;
        if (
          !venue ||
          venue.status !== "published" ||
          venue.discovery_vertical !== "accommodation" ||
          venue.discovery_enabled ||
          (type !== "all" && venue.accommodation_type !== type) ||
          !comparableVenueSearch(
            `${venue.name} ${venue.address || ""}`,
          ).includes(term)
        )
          continue;
        ownerPreviews.push({ ...venue, ownerPreview: true });
      }
    }
  }
  const candidates = [...ownerPreviews, ...(data || [])];
  let availableIds: Set<string> | null = null;
  if (checkIn && checkOut && guests && candidates.length) {
    const availability = await Promise.all(
      candidates.map((stay) =>
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
      candidates
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
      rows: candidates
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
          ownerPreview: "ownerPreview" in row,
        })),
      total: count || 0,
      page,
      availabilityChecked: Boolean(checkIn && checkOut && guests),
    },
    {
      headers: {
        "Cache-Control":
          checkIn || hasSession
            ? "private, no-store"
            : "public, max-age=30, s-maxage=60",
      },
    },
  );
}
