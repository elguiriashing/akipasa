import type { Metadata } from "next";
import { headers } from "next/headers";
import { AkiDuermo } from "@/components/AkiDuermo";
import { stayLocale } from "@/lib/akiduermo-i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = stayLocale((await headers()).get("x-akipasa-locale"));
  return {
    title: {
      absolute:
        locale === "es"
          ? "AkiDuermo · Un buen día merece una gran estancia"
          : "AkiDuermo · A good day deserves a great stay",
    },
    description:
      locale === "es"
        ? "Encuentra hoteles, casas rurales, apartamentos y alojamientos en toda España. Una vista previa de AkiPasa."
        : "Find hotels, rural escapes, apartments and places to stay across Spain. An early preview from AkiPasa.",
    robots: { index: false, follow: false },
    alternates: { canonical: "https://akiduermo.akipasa.com" },
  };
}
export default async function AkiDuermoPage() {
  const locale = stayLocale((await headers()).get("x-akipasa-locale"));
  return <AkiDuermo initialLocale={locale} />;
}
