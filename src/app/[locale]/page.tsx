import { madridLocalDateTimeSchema } from "@/lib/time";
import { ResultPagination } from "@/components/ResultPagination";
import { Icon } from "@/components/Icons";
import homeVenues from "./home-venues.module.css";
import { resultPage, resultSlice } from "@/lib/result-pagination";
import { publicPageMetadata } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/lib/config";
import { msg } from "@/lib/messages";
import { recommendDiscovery } from "@/lib/personalisation/server";
import type { TimeWindow } from "@/lib/domain";
import { CityDiscovery } from "@/components/CityDiscovery";
import { PlansFirstHero } from "@/components/PlansFirstHero";
import { EventCard } from "@/components/EventCard";
import { DiscoveryIntentSignal } from "@/components/DiscoveryIntentSignal";
import { nearbyVenuePage } from "@/lib/unclaimed-venues";
import { discoveryLocationFromQuery } from "@/lib/discovery-location";
import { discoveryViewHref } from "@/lib/discovery-navigation";

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
    const parsed = madridLocalDateTimeSchema.safeParse(
      `${value}T${end ? "23:59" : "00:00"}`,
    );
    return parsed.success
      ? new Date(parsed.data.getTime() + (end ? 59999 : 0))
      : undefined;
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
    center: searchCenter,
    radiusKm: radius,
  })
    .then((page) => ({ ...page, unavailable: false }))
    .catch((error: unknown) => {
      console.error("Discover nearby venues unavailable", error);
      return { rows: [], total: 0, page: 1, unavailable: true };
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
      <PlansFirstHero
        locale={locale}
        imageUrl={
          results[0]?.event.exploreImage?.url ||
          results[0]?.venue.exploreImage?.url
        }
        location={{
          locality,
          name: localityName,
          latitude: searchCenter.latitude,
          longitude: searchCenter.longitude,
          radius,
        }}
      />

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
            <p>
              {locale === "es"
                ? "Estamos preparando el lanzamiento en la Costa del Sol y ampliaremos la cobertura según crezca la comunidad. Si tu ciudad aún está tranquila, no te hemos olvidado."
                : "We're preparing our Costa del Sol launch and will grow coverage as the community grows. A quiet city doesn't mean we've forgotten yours."}
            </p>
          </div>
          <div className="discovery-empty-actions">
            <Link className="button button-ghost" href={`/${locale}/roadmap`}>
              {locale === "es" ? "Ver nuestra hoja de ruta" : "See Our Roadmap"}
            </Link>
            {radius < 100 ? (
              <Link
                className="button button-strong"
                href={formatTimeFilterUrl("all").replace(
                  `radius=${radius}`,
                  `radius=${radius < 25 ? 25 : radius < 50 ? 50 : 100}`,
                )}
              >
                {locale === "es" ? "Ampliar radio" : "Expand radius"}
              </Link>
            ) : (
              <Link className="button button-strong" href={`/${locale}`}>
                {locale === "es"
                  ? "Cambiar zona y borrar filtros"
                  : "Change area and reset filters"}
              </Link>
            )}
            <Link
              className="button button-ghost"
              href={formatTimeFilterUrl("tomorrow")}
            >
              {locale === "es" ? "Ver mañana" : "See tomorrow"}
            </Link>
            <Link
              className="button button-ghost"
              href={discoveryViewHref(locale, "map", query)}
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
        <section
          id="venue-results"
          className={homeVenues.directory}
          aria-labelledby="nearby-venues-title"
        >
          <div className={`section-head ${homeVenues.heading}`}>
            <div>
              <span className={homeVenues.eyebrow}>
                {locale === "es" ? "Explora tu zona" : "Around your corner"}
              </span>
              <h2 id="nearby-venues-title">
                {locale === "es"
                  ? "Negocios cerca de ti"
                  : "Businesses near you"}
              </h2>
            </div>
            <span className="count">{venuePage.total}</span>
          </div>
          <p className={homeVenues.intro}>
            {locale === "es"
              ? "Descubre los lugares de tu zona y encuentra tu próximo plan."
              : "Get to know the places around you and find your next plan."}
          </p>
          <div className={homeVenues.grid}>
            {venuePage.rows.map((venue) => (
              <Link
                key={venue.id}
                className={`card venue-card ${homeVenues.card}`}
                data-home-venue-card
                data-claim-status={venue.claimStatus}
                href={`/${locale}/venues/${venue.slug}`}
              >
                <div className={homeVenues.cardTop}>
                  <span className={homeVenues.mark} aria-hidden="true">
                    <Icon name="venue" size={24} />
                  </span>
                  <span className={homeVenues.claim}>
                    {venue.claimStatus === "claimed"
                      ? locale === "es"
                        ? "Local"
                        : "Venue"
                      : locale === "es"
                        ? "No reclamado"
                        : "Unclaimed"}
                  </span>
                </div>
                <div className={homeVenues.identity}>
                  <h3>{venue.name}</h3>
                  <p className={homeVenues.address}>{venue.address}</p>
                </div>
                <div className={homeVenues.cardBottom}>
                  <span className={homeVenues.distance}>
                    <Icon name="map" size={14} aria-hidden="true" />
                    {`${venue.distanceKm.toFixed(1)} km`}
                  </span>
                  <span className={homeVenues.arrow} aria-hidden="true">
                    <Icon name="arrow-right" size={18} />
                  </span>
                </div>
                <span className={homeVenues.destination}>
                  {locale === "es" ? "Ver negocio" : "View business"}
                </span>
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

      {venuePage.unavailable ? (
        <p className="notice" role="status">
          {locale === "es"
            ? "Los locales cercanos no se pueden cargar ahora mismo. Prueba de nuevo en un momento."
            : "Nearby venues are temporarily unavailable. Please try again shortly."}
        </p>
      ) : null}

      <CityDiscovery locale={locale} />

      <p className="owner-nudge">
        <span>
          {locale === "es" ? "¿Tienes un negocio?" : "Run a business?"}
        </span>
        <Link href={`/${locale}/business/apply`}>
          {locale === "es" ? "Añádelo a AkiPasa" : "List it on AkiPasa"}
          <span aria-hidden="true"> →</span>
        </Link>
        <Link href={`/hq-login?lang=${locale}`}>
          {locale === "es" ? "Acceder a mi negocio" : "Business sign in"}
          <span aria-hidden="true"> →</span>
        </Link>
      </p>
    </main>
  );
}
