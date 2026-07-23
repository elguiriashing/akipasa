import "./globals.css";
import type { Metadata } from "next";
import { config } from "@/lib/config";
import { PwaRegistration } from "@/components/PwaRegistration";
import { ThemeManager } from "@/components/ThemeModeControls";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <PwaRegistration />
        <ThemeManager />
        {children}
      </body>
    </html>
  );
}
