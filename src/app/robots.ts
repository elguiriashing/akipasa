import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteOrigin } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  if (host === "akiconduzco.akipasa.com") {
    const origin = "https://akiconduzco.akipasa.com";
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/account", "/bookings", "/en/auth/", "/es/auth/"],
      },
      sitemap: `${origin}/sitemap.xml`,
      host: origin,
    };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Let crawlers read noindex on private/auth pages. Authentication remains
      // their access boundary; robots.txt is not a privacy mechanism.
      disallow: ["/api/"],
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  };
}
