import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { VenueRelevanceReview } from "@/components/VenueRelevanceReview";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <VenueRelevanceReview locale={locale} />;
}
