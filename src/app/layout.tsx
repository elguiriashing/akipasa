import { RouteBoundaryProvider } from "@/components/RouteBoundaryContext";
import { optionalUser } from "@/lib/auth";
import { accountTrackingAllowed } from "@/lib/account-onboarding-server";
import "./globals.css";
import "./compact-app.css";
import "./brand.css";
import "./appearance.css";
import "./tablet-responsive.css";
import "./portal-unity.css";
import "@/components/pasa-finished-public.css";
import type { Metadata, Viewport } from "next";
import { ConsentAnalytics } from "@/components/ConsentAnalytics";
import { PersonalisationConsent } from "@/components/PersonalisationConsent";
import { config } from "@/lib/config";
import { PwaRegistration } from "@/components/PwaRegistration";
import { ThemeManager } from "@/components/ThemeModeControls";
import { headers } from "next/headers";
import { isLocale } from "@/lib/config";
import { serializeJsonLd, siteOrigin } from "@/lib/seo";

export async function generateViewport(): Promise<Viewport> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  return {
    themeColor: host === "akiconduzco.akipasa.com" ? "#FF3047" : "#14213D",
  };
}

const sharedMetadata: Metadata = {
  metadataBase: new URL("https://akipasa.com"),
  title: {
    default: `${config.productName} — Todo lo que pasa cerca de ti`,
    template: `%s · ${config.productName}`,
  },
  description:
    "Todo lo que pasa cerca de ti. Discover events, venues and plans across Spain.",
  applicationName: config.productName,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: config.productName,
    title: "AkiPasa — Todo lo que pasa cerca de ti",
    description: "Descubre eventos, locales y planes en toda España.",
    url: "https://akipasa.com",
    locale: "es_ES",
    alternateLocale: "en_GB",
  },
  twitter: {
    card: "summary",
    title: "AkiPasa",
    description: "Todo lo que pasa cerca de ti.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/brand/v3/pasa-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/v3/pasa-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/brand/v3/pasa-180.png",
    shortcut: "/icon.svg",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  const brand =
    host === "business.akipasa.com"
      ? "business"
      : host === "akiduermo.akipasa.com"
        ? "duermo"
        : host === "akiconduzco.akipasa.com"
          ? "conduzco"
          : "akipasa";
  const name =
    brand === "business"
      ? "AkiBusiness"
      : brand === "duermo"
        ? "AkiDuermo"
        : brand === "conduzco"
          ? "AkiConduzco"
          : config.productName;
  return {
    ...sharedMetadata,
    applicationName: name,
    title:
      brand === "akipasa"
        ? sharedMetadata.title
        : { default: name, template: `%s · ${name}` },
    icons: {
      icon: [
        {
          url:
            brand === "conduzco"
              ? "/brand/v3/coches.svg"
              : `/pwa/${brand}-192.png`,
          type: brand === "conduzco" ? "image/svg+xml" : "image/png",
          sizes: "192x192",
        },
      ],
      apple:
        brand === "conduzco" ? "/brand/v3/coches.svg" : `/pwa/${brand}-192.png`,
      shortcut:
        brand === "conduzco" ? "/brand/v3/coches.svg" : `/pwa/${brand}-192.png`,
    },
    ...(brand === "conduzco"
      ? {
          description:
            "Discover local rental cars for your events, stays and trips across Spain.",
          openGraph: {
            type: "website" as const,
            siteName: "AkiConduzco",
            title: "AkiConduzco · Find your way there",
            url: "https://akiconduzco.akipasa.com",
            description: "Discover local rental cars for your trip.",
            locale: "en_GB",
            alternateLocale: "es_ES",
          },
        }
      : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let trackingAllowed = true;
  try {
    const { supabase, user } = await optionalUser();
    if (user) trackingAllowed = await accountTrackingAllowed(supabase, user.id);
  } catch {
    trackingAllowed = false;
  }
  const requestHeaders = await headers();
  const isAndroidApp = /\bAkiPasaAndroid\//.test(
    requestHeaders.get("user-agent") ?? "",
  );
  const product = requestHeaders.get("x-akipasa-product");
  const isAkiDuermo = product === "akiduermo";
  const isAkiBusiness = product === "akibusiness";
  const isAkiConduzco = product === "akiconduzco";
  const requestLocale = requestHeaders.get("x-akipasa-locale");
  const locale =
    requestLocale && isLocale(requestLocale) ? requestLocale : "es";
  return (
    <html lang={locale}>
      <body
        data-android-app={isAndroidApp ? "true" : undefined}
        data-product={
          isAkiDuermo
            ? "akiduermo"
            : isAkiBusiness
              ? "akibusiness"
              : isAkiConduzco
                ? "akiconduzco"
                : undefined
        }
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${siteOrigin}/#website`,
              name: isAkiConduzco
                ? "AkiConduzco"
                : isAkiDuermo
                  ? "AkiDuermo"
                  : isAkiBusiness
                    ? "AkiBusiness"
                    : "AkiPasa",
              url: isAkiConduzco
                ? "https://akiconduzco.akipasa.com"
                : isAkiDuermo
                  ? "https://akiduermo.akipasa.com"
                  : isAkiBusiness
                    ? "https://business.akipasa.com"
                    : siteOrigin,
              inLanguage: ["es", "en"],
            }),
          }}
        />
        <PwaRegistration />
        <ThemeManager />
        <RouteBoundaryProvider locale={locale} product={product}>
          {children}
        </RouteBoundaryProvider>
        <ConsentAnalytics trackingAllowed={trackingAllowed} />
        <PersonalisationConsent locale={locale} />
      </body>
    </html>
  );
}
