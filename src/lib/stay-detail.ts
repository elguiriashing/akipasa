import { parseDatabasePoint } from "./repository";
import { cache } from "react";
import { createSupabasePublicClient } from "./supabase/public";
import { cleanStayName, safePropertyWebsite, type Stay } from "./akiduermo";
import { normalizeAddressLabel } from "./maps";
export type StayDetail = Stay & {
  latitude?: number;
  longitude?: number;
  descriptionEs: string;
  descriptionEn: string;
  photos: { url: string; altEs: string; altEn: string }[];
  bookingMode?: "disabled" | "external" | "request";
  bookingUrl?: string;
};
export const loadStayDetail = cache(
  async (slug: string): Promise<StayDetail | null> => {
    if (!slug || slug.length > 300) return null;
    const client = createSupabasePublicClient();
    const { data, error } = await client
      .from("venues")
      .select(
        "id,slug,name,address,location,description_es,description_en,accommodation_type,website_url,cities(name_es)",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .eq("discovery_vertical", "accommodation")
      .maybeSingle();
    if (error) throw new Error("Accommodation is temporarily unavailable");
    if (!data) return null;
    const { data: booking } = await client.rpc(
      "accommodation_public_settings",
      { p_venue: data.id },
    );
    // Only images explicitly assigned to the accommodation header are public.
    // The private management bin and five surface selections are independent.
    const { data: headerPlacements, error: placementError } = await client
      .from("venue_media_placements")
      .select("media_id,sort_order")
      .eq("venue_id", data.id)
      .eq("placement", "venue_gallery")
      .eq("target_key", "stay_header")
      .order("sort_order")
      .limit(12);
    if (placementError) throw new Error("Accommodation photos are temporarily unavailable");
    const orderedIds = (headerPlacements || []).map((item) => item.media_id);
    const { data: media, error: mediaError } = orderedIds.length
      ? await client
          .from("venue_media")
          .select("id,storage_path,alt_es,alt_en")
          .eq("venue_id", data.id)
          .in("id", orderedIds)
      : { data: [], error: null };
    if (mediaError) throw new Error("Accommodation photos are temporarily unavailable");
    const mediaById = new Map((media || []).map((item) => [item.id, item]));
    const photos = (
      await Promise.all(
        orderedIds.map(async (id) => {
          const photo = mediaById.get(id);
          if (!photo) return null;
          const { data: signed } = await client.storage
            .from("event-media")
            .createSignedUrl(photo.storage_path, 3600);
          return signed?.signedUrl
            ? {
                url: signed.signedUrl,
                altEs: photo.alt_es || data.name,
                altEn: photo.alt_en || photo.alt_es || data.name,
              }
            : null;
        }),
      )
    ).filter((photo): photo is NonNullable<typeof photo> => photo !== null);
    return {
      ...parseDatabasePoint(data.location),
      id: data.id,
      slug: data.slug,
      name: cleanStayName(data.name),
      address: normalizeAddressLabel(data.address || ""),
      accommodationType: data.accommodation_type || "hotel",
      website: safePropertyWebsite(data.website_url),
      city:
        (Array.isArray(data.cities) ? data.cities[0] : data.cities)?.name_es ||
        "España",
      descriptionEs: data.description_es || "",
      descriptionEn: data.description_en || "",
      photos,
      bookingMode: booking?.mode || "disabled",
      bookingUrl: safePropertyWebsite(booking?.external_url) || undefined,
    };
  },
);
