import "./globals.css";
import "./compact-app.css";
import "./brand.css";
import "./appearance.css";
import "./tablet-responsive.css";
import "./portal-unity.css";
import type { Metadata, Viewport } from "next";
import { ConsentAnalytics } from "@/components/ConsentAnalytics";
import { PersonalisationConsent } from "@/components/PersonalisationConsent";
import { config } from "@/lib/config";
import { PwaRegistration } from "@/components/PwaRegistration";
import { ThemeManager } from "@/components/ThemeModeControls";
import { headers } from "next/headers";
import { isLocale } from "@/lib/config";
import { serializeJsonLd, siteOrigin } from "@/lib/seo";

export const viewport: Viewport = { themeColor: "#14213D" };

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
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icon-180.png",
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
        : "akipasa";
  const name =
    brand === "business"
      ? "AkiBusiness"
      : brand === "duermo"
        ? "AkiDuermo"
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
        { url: `/pwa/${brand}-192.png`, type: "image/png", sizes: "192x192" },
      ],
      apple: `/pwa/${brand}-192.png`,
      shortcut: `/pwa/${brand}-192.png`,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const product = requestHeaders.get("x-akipasa-product");
  const isAkiDuermo = product === "akiduermo";
  const isAkiBusiness = product === "akibusiness";
  const requestLocale = requestHeaders.get("x-akipasa-locale");
  const locale =
    requestLocale && isLocale(requestLocale) ? requestLocale : "es";
  return (
    <html lang={locale}>
      <body
        data-product={
          isAkiDuermo ? "akiduermo" : isAkiBusiness ? "akibusiness" : undefined
        }
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${siteOrigin}/#website`,
              name: isAkiDuermo
                ? "AkiDuermo"
                : isAkiBusiness
                  ? "AkiBusiness"
                  : "AkiPasa",
              url: isAkiDuermo
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
        {children}
        <ConsentAnalytics />
        <PersonalisationConsent locale={locale} />
      </body>
    </html>
  );
}
