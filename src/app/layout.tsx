import "./globals.css";
import type { Metadata } from "next";
import { config } from "@/lib/config";
import { PwaRegistration } from "@/components/PwaRegistration";
import { ThemeManager } from "@/components/ThemeModeControls";
import { headers } from "next/headers";
import { isLocale } from "@/lib/config";
import { serializeJsonLd, siteOrigin } from "@/lib/seo";
import Script from "next/script";

export const metadata: Metadata = {
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestLocale = (await headers()).get("x-akipasa-locale");
  const locale =
    requestLocale && isLocale(requestLocale) ? requestLocale : "es";
  return (
    <html lang={locale}>
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PW8547QDGD"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-PW8547QDGD');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${siteOrigin}/#website`,
              name: "AkiPasa",
              url: siteOrigin,
              inLanguage: ["es", "en"],
            }),
          }}
        />
        <PwaRegistration />
        <ThemeManager />
        {children}
      </body>
    </html>
  );
}
