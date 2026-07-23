import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/lib/config";
import { msg } from "@/lib/messages";
import { repository } from "@/lib/repository";
import type { TimeWindow } from "@/lib/domain";
import { EventCard } from "@/components/EventCard";
import { isSpainLocation, sortedSpainLocations } from "@/lib/locations";
import { UseMyLocation } from "@/components/UseMyLocation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "en" ? "Discover nearby events" : "Descubre eventos cercanos",
    alternates: {
      canonical: `/${locale}`,
      languages: { es: "/es", en: "/en" },
    },
  };
}

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
  const localityName =
    sortedSpainLocations.find(([key]) => key === locality)?.[1]?.[locale] ??
    locality;

  const formatTimeFilterUrl = (nextTime: TimeWindow) => {
    const params = new URLSearchParams();
    params.set("locality", locality);
    params.set("radius", String(radius));
    if (nextTime) params.set("time", nextTime);
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

  const timeTabs: Array<{ value: TimeWindow; label: string }> = [
    { value: "now", label: m.now },
    { value: "tonight", label: m.tonight },
    { value: "tomorrow", label: m.tomorrow },
    { value: "weekend", label: m.weekend },
    { value: "all", label: m.all },
  ];

  const results = await repository.discover({
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
    <main className="shell">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">{m.eyebrow}</div>
            <h1>{m.heading}</h1>
            <p className="lede">{m.intro}</p>
            <p className="hero-meta">
              {locale === "es"
                ? `Explora planes en ${localityName} y descubre qu\u00e9 pasa a tu alrededor.`
                : `Explore plans in ${localityName} and discover what's on near you.`}
            </p>
            <div className="hero-actions">
              <Link
                href={`/${locale}#results`}
                className="button button-strong"
              >
                {locale === "es" ? "Descubrir ahora" : "Discover now"}
              </Link>
              <Link href={`/${locale}/map`} className="button button-ghost">
                {m.map}
              </Link>
            </div>
          </div>

          <aside className="hero-panel" aria-label={m.discover}>
            <div className="panel-block">
              <span>{locale === "es" ? "Zona activa" : "Active area"}</span>
              <strong>{localityName}</strong>
              <small>{`${radius} km radius`}</small>
            </div>
            <div className="panel-block">
              <span>
                {locale === "es"
                  ? "Disponibilidad en vivo"
                  : "Live availability"}
              </span>
              <strong>{results.length}</strong>
              <small>{resultText}</small>
            </div>
            <div className="panel-block">
              <span>{locale === "es" ? "Momento" : "Time window"}</span>
              <strong>{m[time]}</strong>
              <small>{locale === "es" ? "en este momento" : "for now"}</small>
            </div>
          </aside>
        </div>
      </section>

      <div className="quick-strip" role="navigation" aria-label={m.discover}>
        {timeTabs.map((tab) => (
          <Link
            key={tab.value}
            href={formatTimeFilterUrl(tab.value)}
            className={`chip ${time === tab.value ? "chip-active" : ""}`}
            aria-current={time === tab.value ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form
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
            <span>
              {locale === "es" ? "Filtros r\u00e1pidos" : "Quick filters"}
            </span>
            <span className="filter-summary-caption">
              {locale === "es"
                ? "Ajusta tu b\u00fasqueda en segundos"
                : "Adjust your discovery in seconds"}
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
                {[5, 15, 25, 50, 100].map((v) => (
                  <option key={v} value={v}>
                    {v} km
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="time">{m.time}</label>
              <select id="time" name="time" defaultValue={time}>
                {(
                  ["now", "tonight", "tomorrow", "weekend", "all"] as const
                ).map((v) => (
                  <option key={v} value={v}>
                    {m[v]}
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
          {results.map((result) => (
            <EventCard
              key={result.occurrence.id}
              result={result}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <p className="notice">{m.noResults}</p>
      )}
    </main>
  );
}
