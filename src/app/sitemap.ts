import type { MetadataRoute } from "next";
import { fixtureEvents, venues } from "@/lib/fixtures";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://akipasa.com";
  return ["es", "en"].flatMap((locale) => [
    {
      url: `${base}/${locale}`,
      changeFrequency: "daily" as const,
      priority: 1,
    },
    ...["map", "passports", "privacy", "terms"].map((path) => ({
      url: `${base}/${locale}/${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "map" ? 0.8 : 0.5,
    })),
    ...fixtureEvents().map((e) => ({
      url: `${base}/${locale}/events/${e.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...venues.map((v) => ({
      url: `${base}/${locale}/venues/${v.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ]);
}
