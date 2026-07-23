import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/es/account",
        "/en/account",
        "/es/admin",
        "/en/admin",
        "/es/business",
        "/en/business",
        "/es/moderation",
        "/en/moderation",
      ],
    },
    sitemap: "https://akipasa.com/sitemap.xml",
    host: "https://akipasa.com",
  };
}
