import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { msg } from "@/lib/messages";
import { recommendDiscovery } from "@/lib/personalisation/server";
import { translated } from "@/lib/domain";
import { config } from "@/lib/config";
import { ProductionMap } from "@/components/ProductionMap";

export const dynamic = "force-dynamic";
import { EventCard } from "@/components/EventCard";

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const m = msg(locale);
  const recommendations = await recommendDiscovery({
    query: { radiusKm: 15, time: "all" },
    surface: "map",
  });
  const results = recommendations.items.map((item) => item.result);
  const mapPoints = results.map((result) => ({
    id: result.event.id,
    latitude: result.venue.latitude,
    longitude: result.venue.longitude,
    title: translated(result.event.title, locale),
    venue: result.venue.name,
    href: `/${locale}/events/${result.event.slug}`,
  }));
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">{m.map}</div>
        <h1>{m.map}</h1>
        {!config.mapStyleUrl && <p className="notice">{m.listFallback}</p>}
      </section>
      {config.mapStyleUrl && (
        <ProductionMap
          locale={locale}
          points={mapPoints}
          styleUrl={config.mapStyleUrl}
        />
      )}
      <div className="grid">
        {recommendations.items.map((item, position) => (
          <EventCard
            key={item.result.occurrence.id}
            result={item.result}
            locale={locale}
            position={position}
            recommendationRequestId={recommendations.requestId}
            reasonCodes={item.reasonCodes}
            surface="map"
          />
        ))}
      </div>
    </main>
  );
}
