import { spainLocations } from "./locations";

export const config = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || "AkiPasa",
  wordmark: "AkiPasa",
  handle: "akipasa",
  domain: "akipasa.com",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://akipasa.com",
  crmUrl: process.env.NEXT_PUBLIC_CRM_URL || "https://crm.akipasa.com",
  businessUrl:
    process.env.NEXT_PUBLIC_BUSINESS_URL || "https://business.akipasa.com",
  tagline: { es: "Sal. Explora. Disfruta.", en: "Go out. Explore. Enjoy." },
  dataProvider: process.env.NEXT_PUBLIC_DATA_PROVIDER || "fixtures",
  mapStyleUrl:
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
    "https://tiles.openfreemap.org/styles/liberty",
  googleAuthEnabled: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
  currentTermsVersion: "2026-07-23",
  defaultLocale: "es" as const,
  locales: ["es", "en"] as const,
  timeZone: "Europe/Madrid",
  localities: spainLocations,
};

export type Locale = (typeof config.locales)[number];
export function isLocale(value: string): value is Locale {
  return config.locales.includes(value as Locale);
}
