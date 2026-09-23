import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { loadStayDetail } from "@/lib/stay-detail";
import { stayLocale } from "@/lib/akiduermo-i18n";
import { stayHref } from "@/lib/akiduermo-routing";
import { StayProperty } from "@/components/StayProperty";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stay = await loadStayDetail((await params).slug);
  const locale = stayLocale((await headers()).get("x-akipasa-locale"));
  return {
    title: {
      absolute: `${stay?.name || (locale === "es" ? "Alojamiento no disponible" : "Stay unavailable")} · AkiDuermo`,
    },
    robots: { index: false, follow: false },
    ...(stay ? { alternates: { canonical: stayHref(stay.slug, locale) } } : {}),
  };
}
export default async function StayPage({ params }: Props) {
  const stay = await loadStayDetail((await params).slug);
  if (!stay) notFound();
  return (
    <StayProperty
      stay={stay}
      initialLocale={stayLocale((await headers()).get("x-akipasa-locale"))}
    />
  );
}
