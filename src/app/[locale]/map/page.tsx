import { notFound } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { ProductionMap } from "@/components/ProductionMap";
import { UseMyLocation } from "@/components/UseMyLocation";
import { config, isLocale } from "@/lib/config";
import type { TimeWindow } from "@/lib/domain";
import { translated } from "@/lib/domain";
import { isSpainLocation, sortedSpainLocations } from "@/lib/locations";
import { msg } from "@/lib/messages";
import { recommendDiscovery } from "@/lib/personalisation/server";

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

  const requestedLocality =
    typeof query.locality === "string" ? query.locality : "fuengirola";
  const locality = isSpainLocation(requestedLocality)
    ? requestedLocality
    : "fuengirola";
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
  const localityConfig = config.localities[locality];
  const localityName = localityConfig[locale];

  const recommendations = await recommendDiscovery({
    query: {
      locality,
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
    category: result.event.category,
    startsAt: result.occurrence.startsAt,
    priceLabel:
      result.event.priceCents === 0
        ? m.free
        : `${(result.event.priceCents / 100).toFixed(0)}\u20ac`,
  }));

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">{m.map}</div>
        <h1>{locale === "es" ? "Mapa de planes" : "Event map"}</h1>
        <p className="lede">
          {locale === "es"
            ? `Explora ${localityName}, ajusta los filtros aqu\u00ed y abre cualquier marcador.`
            : `Explore ${localityName}, adjust filters here, and open any marker.`}
        </p>
      </section>

      <form
        id="map-filters"
        className="filters-shell"
        method="get"
        key={[
          locality,
          radius,
          time,
          category || "any",
          price || "any",
          minPriceCents ?? "",
          maxPriceCents ?? "",
          String(query.dateFrom || ""),
          String(query.dateTo || ""),
          accessible,
        ].join("-")}
      >
        <details className="filter-group" open>
          <summary className="filter-summary">
            <span>{locale === "es" ? "Filtros del mapa" : "Map filters"}</span>
            <span className="filter-summary-caption">
              {locale === "es"
                ? "El mapa y la lista usan la misma ubicaci\u00f3n"
                : "The map and list use the same location"}
            </span>
          </summary>
          <div className="filter-grid">
            <div className="field">
              <label htmlFor="locality">{m.location}</label>
              <select id="locality" name="locality" defaultValue={locality}>
                {sortedSpainLocations.map(([key, value]) => (
                  <option key={key} value={key}>
                    {value[locale]}
                  </option>
                ))}
              </select>
              <UseMyLocation locale={locale} />
            </div>
            <div className="field">
              <label htmlFor="radius">{m.radius}</label>
              <select id="radius" name="radius" defaultValue={String(radius)}>
                {[5, 15, 25, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value} km
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="time">{m.time}</label>
              <select id="time" name="time" defaultValue={time}>
                {(
                  ["now", "tonight", "tomorrow", "weekend", "all"] as const
                ).map((value) => (
                  <option key={value} value={value}>
                    {m[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="category">{m.category}</label>
              <select
                id="category"
                name="category"
                defaultValue={category || "any"}
              >
                <option value="any">{m.any}</option>
                <option value="music">{m.music}</option>
                <option value="social">{m.social}</option>
                <option value="workshop">{m.workshop}</option>
                <option value="culture">{m.culture}</option>
                <option value="market">{m.market}</option>
                <option value="food">{m.food}</option>
              </select>
            </div>
          </div>
        </details>
        <details className="filter-group">
          <summary className="filter-summary">
            <span>{locale === "es" ? "M\u00e1s filtros" : "More filters"}</span>
            <span className="filter-summary-caption">
              {locale === "es"
                ? "Precio, fechas y accesibilidad"
                : "Price, dates and accessibility"}
            </span>
          </summary>
          <div className="filter-grid filter-grid-secondary">
            <div className="field">
              <label htmlFor="minPrice">{m.minimumPrice}</label>
              <input
                id="minPrice"
                name="minPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  minPriceCents === undefined ? "" : minPriceCents / 100
                }
              />
            </div>
            <div className="field">
              <label htmlFor="maxPrice">{m.maximumPrice}</label>
              <input
                id="maxPrice"
                name="maxPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  maxPriceCents === undefined ? "" : maxPriceCents / 100
                }
              />
            </div>
            <div className="field">
              <label htmlFor="price">{m.price}</label>
              <select id="price" name="price" defaultValue={price || "any"}>
                <option value="any">{m.any}</option>
                <option value="free">{m.free}</option>
                <option value="paid">{m.paid}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="dateFrom">{m.dateFrom}</label>
              <input
                id="dateFrom"
                name="dateFrom"
                type="date"
                defaultValue={
                  typeof query.dateFrom === "string" ? query.dateFrom : ""
                }
              />
            </div>
            <div className="field">
              <label htmlFor="dateTo">{m.dateTo}</label>
              <input
                id="dateTo"
                name="dateTo"
                type="date"
                defaultValue={
                  typeof query.dateTo === "string" ? query.dateTo : ""
                }
              />
            </div>
            <label className="field checkbox-field">
              <input
                name="accessible"
                type="checkbox"
                defaultChecked={accessible}
              />
              <span>{m.accessibleOnly}</span>
            </label>
          </div>
        </details>
        <div className="filter-actions">
          <button className="button button-strong" type="submit">
            {m.apply}
          </button>
        </div>
      </form>

      <ProductionMap
        locale={locale}
        points={mapPoints}
        styleUrl={config.mapStyleUrl}
        center={{
          latitude: localityConfig.latitude,
          longitude: localityConfig.longitude,
        }}
      />

      <section aria-labelledby="map-results-title">
        <div className="section-head">
          <h2 id="map-results-title">
            {locale === "es" ? "Planes cerca de ti" : "Plans near you"}
          </h2>
          <span className="count">{results.length}</span>
        </div>
        {recommendations.items.length ? (
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
        ) : (
          <p className="notice">{m.noResults}</p>
        )}
      </section>
    </main>
  );
}
