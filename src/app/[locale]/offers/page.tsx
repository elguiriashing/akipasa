import { notFound } from "next/navigation";
import { config, isLocale } from "@/lib/config";
import { TargetOfferCatalogue } from "@/components/TargetOfferCatalogue";
import "./offers.css";

export const metadata = { robots: { index: false, follow: false } };
export default async function OffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !config.roleSwap) notFound();
  return (
    <main className="shell target-offers-page">
      <h1>
        {locale === "es"
          ? "Productos y ofertas previstas"
          : "Products and planned offers"}
      </h1>
      <TargetOfferCatalogue locale={locale} />
    </main>
  );
}
