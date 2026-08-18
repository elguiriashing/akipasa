import { spainLocations } from "./locations";

export const config = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || "AkiPasa",
  wordmark: "AKIPASA",
  handle: "akipasa",
  domain: "akipasa.com",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://akipasa.com",
  crmUrl: process.env.NEXT_PUBLIC_CRM_URL || "https://crm.akipasa.com",
  tagline: { es: "Todo lo que pasa cerca de ti.", en: "Where things happen." },
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
