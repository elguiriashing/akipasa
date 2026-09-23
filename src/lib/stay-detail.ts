import { cache } from "react";
import { createSupabasePublicClient } from "./supabase/public";
import { safePropertyWebsite, type Stay } from "./akiduermo";
import { normalizeAddressLabel } from "./maps";
export type StayDetail = Stay & {
  descriptionEs: string;
  descriptionEn: string;
  photos: { url: string; altEs: string; altEn: string }[];
};
export const loadStayDetail = cache(
  async (slug: string): Promise<StayDetail | null> => {
    if (!slug || slug.length > 300) return null;
    const client = createSupabasePublicClient();
    const { data, error } = await client
      .from("venues")
      .select(
        "id,slug,name,address,description_es,description_en,accommodation_type,website_url,cities(name_es)",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .eq("discovery_vertical", "accommodation")
      .maybeSingle();
    if (error) throw new Error("Accommodation is temporarily unavailable");
    if (!data) return null;
    const { data: media } = await client
      .from("venue_media")
      .select("storage_path,alt_es,alt_en")
      .eq("venue_id", data.id)
      .order("sort_order")
      .limit(5);
    const photos = (
      await Promise.all(
        (media || []).map(async (photo) => {
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
      id: data.id,
      slug: data.slug,
      name: data.name,
      address: normalizeAddressLabel(data.address || ""),
      accommodationType: data.accommodation_type || "hotel",
      website: safePropertyWebsite(data.website_url),
      city:
        (Array.isArray(data.cities) ? data.cities[0] : data.cities)?.name_es ||
        "España",
      descriptionEs: data.description_es || "",
      descriptionEn: data.description_en || "",
      photos,
    };
  },
);
