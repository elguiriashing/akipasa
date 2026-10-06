import { MapCompanion } from "@/components/pals/MapCompanion";
import { mapPreviewPortrait } from "@/lib/pals/server";
import { ResultPagination } from "@/components/ResultPagination";
import { resultPage, resultSlice } from "@/lib/result-pagination";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import { ProductionMap } from "@/components/ProductionMap";
import { MapResultsDrawer } from "@/components/MapResultsDrawer";
import { config, isLocale } from "@/lib/config";
import type { TimeWindow } from "@/lib/domain";
import { translated } from "@/lib/domain";
import { discoveryLocationFromQuery } from "@/lib/discovery-location";
import { msg } from "@/lib/messages";
import { recommendDiscovery } from "@/lib/personalisation/server";
import { repository } from "@/lib/repository";
import { nearbyVenuePage } from "@/lib/unclaimed-venues";

export const dynamic = "force-dynamic";

function parsePrice(value: string | string[] | undefined) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100)
    : undefined;
}

function parseDate(value: string | string[] | undefined, end = false) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}+02:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function MapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const m = msg(locale);
  const companion = await mapPreviewPortrait();

  const selectedLocation = discoveryLocationFromQuery(query, locale);
  const { locality, center: searchCenter } = selectedLocation;
  const requestedRadius = Number(
    typeof query.radius === "string" ? query.radius : 25,
  );
  const radius = [5, 15, 25, 50, 100].includes(requestedRadius)
    ? requestedRadius
    : 25;
  const requestedTime = typeof query.time === "string" ? query.time : "all";
  const time: TimeWindow = [
    "now",
    "tonight",
    "tomorrow",
    "weekend",
    "all",
  ].includes(requestedTime)
    ? (requestedTime as TimeWindow)
    : "all";
  const category =
    typeof query.category === "string" && query.category !== "any"
      ? query.category
      : undefined;
  const price =
    typeof query.price === "string" && query.price !== "any"
      ? (query.price as "free" | "paid")
      : undefined;
  const minPriceCents = parsePrice(query.minPrice);
  const maxPriceCents = parsePrice(query.maxPrice);
  const dateFrom = parseDate(query.dateFrom);
  const dateTo = parseDate(query.dateTo, true);
  const accessible = query.accessible === "on";
  const discoveryQuery = {
    locality,
    latitude: searchCenter.latitude,
    longitude: searchCenter.longitude,
    radiusKm: radius,
    time,
    category,
    price,
    minPriceCents,
    maxPriceCents,
    dateFrom,
    dateTo,
    accessible,
  };
  const recommendations = await recommendDiscovery({
    query: discoveryQuery,
    surface: "map",
  });
  const results = recommendations.items.map((item) => item.result);
  const eventPage = resultSlice(
    recommendations.items,
    resultPage(query.eventPage),
  );
  const [nationwideEvents, venuePage] = await Promise.all([
    repository.discover({
      locality,
      latitude: searchCenter.latitude,
      longitude: searchCenter.longitude,
      radiusKm: 5000,
      time: "all",
    }),
    nearbyVenuePage({
      center: searchCenter,
      radiusKm: radius,
      page: resultPage(query.venuePage),
    }),
  ]);
  const eventPoints = nationwideEvents.map((result) => ({
    id: result.event.id,
    latitude: result.event.location?.latitude ?? result.venue.latitude,
    longitude: result.event.location?.longitude ?? result.venue.longitude,
    title: translated(result.event.title, locale),
    venue: result.event.location
      ? translated(result.event.location.name, locale)
      : result.venue.name,
    href: `/${locale}/events/${result.event.slug}`,
    category: result.event.category,
    startsAt: result.occurrence.startsAt,
    priceLabel:
      result.event.priceCents === 0
        ? m.free
        : `${(result.event.priceCents / 100).toFixed(0)}\u20ac`,
    source: result.event.source,
  }));
  const mapPoints = eventPoints;

  return (
    <main className="shell discover-page map-page">
      {companion && <MapCompanion portrait={companion} />}
      <ProductionMap
        fullScreen
        locale={locale}
        points={mapPoints}
        styleUrl={config.mapStyleUrl}
        center={searchCenter}
      />

      <MapResultsDrawer
        locale={locale}
        locality={selectedLocation.name}
        initialCenter={searchCenter}
      >
        <section id="results" aria-labelledby="map-results-title">
          <div className="section-head">
            <h2 id="map-results-title">
              {locale === "es" ? "Planes cerca de ti" : "Plans near you"}
            </h2>
            <span className="count">{results.length}</span>
          </div>
          {recommendations.items.length ? (
            <div className="grid">
              {eventPage.rows.map((item, position) => (
                <EventCard
                  key={item.result.occurrence.id}
                  result={item.result}
                  locale={locale}
                  position={(eventPage.page - 1) * 20 + position}
                  recommendationRequestId={recommendations.requestId}
                  reasonCodes={item.reasonCodes}
                  surface="map"
                />
              ))}
            </div>
          ) : (
            <p className="notice">{m.noResults}</p>
          )}
        </section>

        <ResultPagination
          locale={locale}
          path={`/${locale}/map`}
          query={query}
          pageKey="eventPage"
          anchor="results"
          page={eventPage.page}
          total={eventPage.total}
        />

        {venuePage.total ? (
          <section id="venue-results" aria-labelledby="map-venues-title">
            <div className="section-head">
              <h2 id="map-venues-title">
                {locale === "es"
                  ? "Negocios cerca de ti"
                  : "Businesses near you"}
              </h2>
              <span className="count">{venuePage.total}</span>
            </div>
            <p className="result-caption">
              {locale === "es"
                ? "Locales publicados cerca de la ubicación seleccionada."
                : "Published venues near the selected location."}
            </p>
            <div className="grid">
              {venuePage.rows.map((venue) => (
                <Link
                  key={venue.id}
                  className="card"
                  href={`/${locale}/venues/${venue.slug}`}
                >
                  <div className="card-media">
                    <div className="card-media-fallback" aria-hidden>
                      <span>{venue.name.slice(0, 1).toUpperCase()}</span>
                    </div>
                    <div className="card-media-scrim" aria-hidden />
                    <div className="card-media-badges">
                      <span className="pill card-pill-date">
                        {venue.claimStatus === "claimed"
                          ? locale === "es"
                            ? "Local"
                            : "Venue"
                          : locale === "es"
                            ? "Sin reclamar"
                            : "Unclaimed"}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <h3>{venue.name}</h3>
                    <p className="card-venue">{venue.address}</p>
                    <p className="card-distance">
                      {`${venue.distanceKm.toFixed(1)} km`}
                    </p>
                    <div className="card-footer">
                      <span className="card-arrow">
                        {locale === "es" ? "Ver negocio" : "View business"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <ResultPagination
              locale={locale}
              path={`/${locale}/map`}
              query={query}
              pageKey="venuePage"
              anchor="venue-results"
              page={venuePage.page}
              total={venuePage.total}
            />
          </section>
        ) : null}
      </MapResultsDrawer>
    </main>
  );
}
import { publicPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = publicPageMetadata("/map");
