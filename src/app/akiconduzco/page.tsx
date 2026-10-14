import type { Metadata } from "next";
import { headers } from "next/headers";
import { AkiConduzco } from "@/components/AkiConduzco";
import { conduzcoLocale } from "@/lib/akiconduzco-i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = conduzcoLocale((await headers()).get("x-akipasa-locale"));
  const title =
    locale === "es"
      ? "Alquiler de coches en España"
      : "Car hire for your trip in Spain";
  return {
    title: { absolute: `${title} · AkiConduzco` },
    description:
      locale === "es"
        ? "Descubre coches de alquiler locales para tus viajes, eventos y estancias en España."
        : "Discover local rental cars for your events, stays and trips across Spain.",
    alternates: { canonical: "https://akiconduzco.akipasa.com/" },
    openGraph: {
      title: `${title} · AkiConduzco`,
      url: "https://akiconduzco.akipasa.com/",
      siteName: "AkiConduzco",
      type: "website",
    },
  };
}

export default async function AkiConduzcoPage() {
  return (
    <AkiConduzco
      locale={conduzcoLocale((await headers()).get("x-akipasa-locale"))}
    />
  );
}
