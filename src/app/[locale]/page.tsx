import { ResultPagination } from "@/components/ResultPagination";
import { resultPage, resultSlice } from "@/lib/result-pagination";
import { publicPageMetadata } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/lib/config";
import { msg } from "@/lib/messages";
import { recommendDiscovery } from "@/lib/personalisation/server";
import type { TimeWindow } from "@/lib/domain";
import { CityDiscovery } from "@/components/CityDiscovery";
import { EventCard } from "@/components/EventCard";
import { DiscoveryIntentSignal } from "@/components/DiscoveryIntentSignal";
import { nearbyVenuePage } from "@/lib/unclaimed-venues";
import { discoveryLocationFromQuery } from "@/lib/discovery-location";

export const dynamic = "force-dynamic";

export const generateMetadata = publicPageMetadata("");

export default async function DiscoverPage({
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

  const selectedLocation = discoveryLocationFromQuery(query, locale);
  const {
    locality,
    center: searchCenter,
    name: localityName,
  } = selectedLocation;
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

  const parsePrice = (value: string | string[] | undefined) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0
      ? Math.round(amount * 100)
      : undefined;
  };

  const minPriceCents = parsePrice(query.minPrice);
  const maxPriceCents = parsePrice(query.maxPrice);
  const parseDate = (value: string | string[] | undefined, end = false) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return undefined;
    const date = new Date(
      `${value}T${end ? "23:59:59.999" : "00:00:00"}+02:00`,
    );
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  const dateFrom = parseDate(query.dateFrom);
  const dateTo = parseDate(query.dateTo, true);
  const accessible = query.accessible === "on";
  const formatTimeFilterUrl = (nextTime: TimeWindow) => {
    const params = new URLSearchParams();
    params.set("locality", locality);
    params.set("locationName", localityName);
    params.set("latitude", String(searchCenter.latitude));
    params.set("longitude", String(searchCenter.longitude));
    params.set("radius", String(radius));
    params.set("time", nextTime);
    if (category) params.set("category", category);
    if (price) params.set("price", price);
    if (minPriceCents !== undefined)
      params.set("minPrice", String(minPriceCents / 100));
    if (maxPriceCents !== undefined)
      params.set("maxPrice", String(maxPriceCents / 100));
    if (typeof query.dateFrom === "string")
      params.set("dateFrom", query.dateFrom);
    if (typeof query.dateTo === "string") params.set("dateTo", query.dateTo);
    if (accessible) params.set("accessible", "on");
    return `/${locale}?${params}`;
  };
  const recommendations = await recommendDiscovery({
    query: {
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
    },
    surface: "discover",
  });
  const results = recommendations.items.map((item) => item.result);
  const eventPage = resultSlice(
    recommendations.items,
    resultPage(query.eventPage),
  );
  const venuePage = await nearbyVenuePage({
    page: resultPage(query.venuePage),
    unclaimedOnly: true,
    center: searchCenter,
    radiusKm: radius,
  });

  const resultText =
    results.length === 1
      ? locale === "es"
        ? "evento encontrado"
        : "event found"
      : locale === "es"
        ? "eventos encontrados"
        : "events found";

  return (
    <main className="shell discover-page">
      <DiscoveryIntentSignal
        active={Object.keys(query).length > 0}
        metadata={{
          locality,
          latitude: searchCenter.latitude,
          longitude: searchCenter.longitude,
          radius_km: radius,
          time,
          category: category || "any",
          price: price || "any",
          accessible,
        }}
      />
      <CityDiscovery locale={locale} />

      <section id="results">
        <div className="section-head">
          <h2>{m.discover}</h2>
          <span className="count">{results.length}</span>
        </div>
        <p className="result-caption">
          {locale === "es"
            ? `${results.length} ${resultText} en ${localityName}.`
            : `${results.length} ${resultText} in ${localityName}.`}
        </p>
      </section>

      {results.length ? (
        <div className="grid">
          {eventPage.rows.map((item, position) => (
            <EventCard
              key={item.result.occurrence.id}
              result={item.result}
              locale={locale}
              position={(eventPage.page - 1) * 20 + position}
              recommendationRequestId={recommendations.requestId}
              reasonCodes={item.reasonCodes}
            />
          ))}
        </div>
      ) : (
        <section className="discovery-empty" aria-labelledby="empty-title">
          <div>
            <span className="discovery-empty-mark" aria-hidden="true">
              A
            </span>
            <h3 id="empty-title">
              {locale === "es"
                ? "No hay planes cerca de ti"
                : "No plans nearby yet"}
            </h3>
            <p>{m.noResults}</p>
          </div>
          <div className="discovery-empty-actions">
            <Link
              className="button button-strong"
              href={formatTimeFilterUrl("all").replace(
                `radius=${radius}`,
                `radius=${Math.min(100, radius < 25 ? 25 : radius < 50 ? 50 : 100)}`,
              )}
            >
              {locale === "es" ? "Ampliar radio" : "Expand radius"}
            </Link>
            <Link
              className="button button-ghost"
              href={formatTimeFilterUrl("tomorrow")}
            >
              {locale === "es" ? "Ver mañana" : "See tomorrow"}
            </Link>
            <Link
              className="button button-ghost"
              href={`/${locale}/map?locality=${encodeURIComponent(locality)}&locationName=${encodeURIComponent(localityName)}&latitude=${searchCenter.latitude}&longitude=${searchCenter.longitude}&radius=${radius}&time=${time}`}
            >
              {locale === "es" ? "Explorar mapa" : "Explore map"}
            </Link>
          </div>
        </section>
      )}

      <ResultPagination
        locale={locale}
        path={`/${locale}`}
        query={query}
        pageKey="eventPage"
        anchor="results"
        page={eventPage.page}
        total={eventPage.total}
      />

      {venuePage.total ? (
        <section id="venue-results" aria-labelledby="nearby-venues-title">
          <div className="section-head">
            <h2 id="nearby-venues-title">
              {locale === "es" ? "Negocios cerca de ti" : "Businesses near you"}
            </h2>
            <span className="count">{venuePage.total}</span>
          </div>
          <p className="result-caption">
            {locale === "es"
              ? "Negocios publicados como no reclamados mientras sus propietarios completan la verificación."
              : "Businesses published as unclaimed while their owners complete verification."}
          </p>
          <div className="grid">
            {venuePage.rows.map((venue) => (
              <Link
                key={venue.id}
                className="card venue-card"
                href={`/${locale}/venues/${venue.slug}`}
              >
                <div className="card-media">
                  <div className="card-media-fallback" aria-hidden>
                    <span>{venue.name.slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="card-media-scrim" aria-hidden />
                  <div className="card-media-badges">
                    <span className="pill card-pill-date">
                      {locale === "es" ? "No reclamado" : "Unclaimed"}
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
            path={`/${locale}`}
            query={query}
            pageKey="venuePage"
            anchor="venue-results"
            page={venuePage.page}
            total={venuePage.total}
          />
        </section>
      ) : null}

      <p className="owner-nudge">
        <span>
          {locale === "es" ? "¿Tienes un negocio?" : "Run a business?"}
        </span>
        <Link href={`/${locale}/business/apply`}>
          {locale === "es" ? "Añádelo a AkiPasa" : "List it on AkiPasa"}
          <span aria-hidden="true"> →</span>
        </Link>
      </p>
    </main>
  );
}
