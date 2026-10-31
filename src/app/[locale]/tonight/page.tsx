import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { ShareButton } from "@/components/ShareButton";
import { isLocale } from "@/lib/config";
import { localizedMetadata } from "@/lib/seo";
import { recommendDiscovery } from "@/lib/personalisation/server";
import { nearbyVenuePage } from "@/lib/unclaimed-venues";
import { tonightEnabled } from "@/lib/aki-tonight-release";
import {
  parseTonightPreferences,
  selectTonightEvents,
  tonightArea,
  tonightAreas,
  tonightIntents,
  tonightMaximumPriceCents,
  tonightPlanHref,
} from "@/lib/aki-tonight";
import styles from "./tonight.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || !tonightEnabled()) notFound();
  const es = locale === "es";
  return {
    ...localizedMetadata(
      locale,
      "/tonight",
      es
        ? "AkiTonight: ¿Qué hacemos esta noche?"
        : "AkiTonight: What's the plan?",
      es
        ? "Busca planes y locales reales en la Costa del Sol, elige tu ambiente y comparte ideas con amigos."
        : "Find real plans and local places on the Costa del Sol, choose your vibe and share ideas with friends.",
    ),
    // Launch inventory is not yet sufficient for indexed destination pages.
    robots: { index: false, follow: true },
  };
}

const budgets = [
  { key: "any", es: "Cualquier precio", en: "Any budget" },
  { key: "free", es: "Gratis", en: "Free" },
  { key: "15", es: "Hasta 15 €", en: "Up to €15" },
  { key: "30", es: "Hasta 30 €", en: "Up to €30" },
  { key: "60", es: "Hasta 60 €", en: "Up to €60" },
] as const;

const groups = [
  { key: "solo", es: "Voy solo", en: "Going solo" },
  { key: "date", es: "Una cita", en: "On a date" },
  { key: "friends", es: "Con amigos", en: "With friends" },
] as const;

const startingTimes = [
  { key: "now", es: "Desde ahora", en: "From now" },
  { key: "18", es: "18:00 o después", en: "18:00 or later" },
  { key: "20", es: "20:00 o después", en: "20:00 or later" },
  { key: "22", es: "22:00 o después", en: "22:00 or later" },
  { key: "0", es: "Medianoche o después", en: "Midnight or later" },
] as const;

function directions(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${latitude},${longitude}`,
  )}`;
}

export default async function TonightPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || !tonightEnabled()) notFound();
  const es = locale === "es";
  const preferences = parseTonightPreferences(await searchParams);
  const area = tonightArea(preferences);
  const retryHref = tonightPlanHref(locale, preferences);
  const query = {
    locality: preferences.area,
    latitude: area.latitude,
    longitude: area.longitude,
    radiusKm: preferences.radiusKm,
    time: "tonight" as const,
    maxPriceCents: tonightMaximumPriceCents(preferences.budget),
  };

  // No new business-state writes; recommendations retain existing telemetry.
  // Never replace absent events with invented ones.
  const [discovery, venues] = await Promise.all([
    recommendDiscovery({
      query,
      surface: "akitonight",
      limit: 60,
      liveOnly: true,
    })
      .then((value) => ({ ...value, unavailable: false }))
      .catch((error: unknown) => {
        console.error("AkiTonight event discovery unavailable", error);
        return {
          items: [],
          requestId: undefined,
          unavailable: true,
        };
      }),
    nearbyVenuePage({
      center: { latitude: area.latitude, longitude: area.longitude },
      radiusKm: preferences.radiusKm,
    })
      .then((value) => ({ ...value, unavailable: false }))
      .catch((error: unknown) => {
        console.error("AkiTonight nearby venue discovery unavailable", error);
        return {
          rows: [],
          total: 0,
          page: 1,
          unavailable: true,
        };
      }),
  ]);
  const events = selectTonightEvents(discovery.items, preferences);
  const hasSearch = events.length > 0 || venues.total > 0;
  const displayArea = area[locale];

  return (
    <main className={`shell ${styles.page}`}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>AKI / TONIGHT</p>
          <h1>
            {es ? "¿Qué hacemos " : "What's the plan "}
            <span>{es ? "esta noche?" : "tonight?"}</span>
          </h1>
          <p className={styles.heroDescription}>
            {es
              ? "Menos discusiones en el grupo, más planes que merezcan la pena. Elige el ambiente y descubre lo que realmente hay."
              : "Less arguing in the group chat. More nights worth having. Pick your vibe and see what's genuinely on."}
          </p>
          <div className={styles.heroActions}>
            <ShareButton
              locale={locale}
              title={
                es
                  ? "Plan de esta noche · AkiTonight"
                  : "Tonight's plan · AkiTonight"
              }
              label={es ? "Compartir plan" : "Share this plan"}
              copiedLabel={es ? "Enlace copiado" : "Link copied"}
            />
            <Link className={styles.secondaryLink} href={`/${locale}/map`}>
              {es ? "Explorar mapa" : "Explore the map"}
            </Link>
          </div>
        </div>
        <div className={styles.heroMotif} aria-hidden="true">
          <span>01</span>
          <div className={styles.motifRoute}>
            <i />
            <i />
            <i />
          </div>
          <strong>GO OUT.</strong>
          <span>02</span>
        </div>
      </header>

      <section
        aria-label={es ? "Crear un plan" : "Build a plan"}
        className={styles.planner}
      >
        <form action={`/${locale}/tonight`} method="get">
          <fieldset className={styles.intentField}>
            <legend>
              {es ? "¿Qué te apetece?" : "What are you in the mood for?"}
            </legend>
            <div className={styles.intentGrid}>
              {tonightIntents.map((intent, index) => (
                <label className={styles.intentOption} key={intent.key}>
                  <input
                    type="radio"
                    name="intent"
                    value={intent.key}
                    defaultChecked={preferences.intent === intent.key}
                  />
                  <span className={styles.intentNumber} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{intent[locale]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.details}>
            <label>
              <span id="tonight-area-label">{es ? "Zona" : "Area"}</span>
              <select
                aria-labelledby="tonight-area-label"
                name="area"
                defaultValue={preferences.area}
              >
                {tonightAreas.map((candidate) => (
                  <option key={candidate.key} value={candidate.key}>
                    {candidate[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span id="tonight-company-label">
                {es ? "Con quién" : "With whom"}
              </span>
              <select
                aria-labelledby="tonight-company-label"
                name="company"
                defaultValue={preferences.company}
              >
                {groups.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span id="tonight-people-label">
                {es ? "Personas" : "People"}
              </span>
              <select
                aria-labelledby="tonight-people-label"
                name="people"
                defaultValue={preferences.people}
              >
                {[1, 2, 4, 6, 8].map((people) => (
                  <option key={people} value={people}>
                    {people}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span id="tonight-budget-label">
                {es ? "Presupuesto por persona" : "Budget per person"}
              </span>
              <select
                aria-labelledby="tonight-budget-label"
                name="budget"
                defaultValue={preferences.budget}
              >
                {budgets.map((budget) => (
                  <option key={budget.key} value={budget.key}>
                    {budget[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span id="tonight-start-label">
                {es ? "Empezar" : "Start time"}
              </span>
              <select
                aria-labelledby="tonight-start-label"
                name="start"
                defaultValue={preferences.start}
              >
                {startingTimes.map((time) => (
                  <option key={time.key} value={time.key}>
                    {time[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span id="tonight-radius-label">
                {es ? "Distancia máxima" : "Distance"}
              </span>
              <select
                aria-labelledby="tonight-radius-label"
                name="radius"
                defaultValue={preferences.radiusKm}
              >
                {[5, 15, 25, 50].map((radius) => (
                  <option key={radius} value={radius}>
                    {radius} km
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.plannerFooter}>
            <button className={styles.findButton} type="submit">
              {es ? "Buscar planes reales" : "Find real plans"}
              <span aria-hidden="true">↗</span>
            </button>
            <p>
              {es
                ? "El tamaño del grupo es orientativo: no confirma aforo ni reserva."
                : "Group size is for planning only, not a capacity or booking confirmation."}
            </p>
          </div>
        </form>
      </section>

      <section className={styles.results} aria-labelledby="tonight-events">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>
              {displayArea} / {es ? "esta noche" : "tonight"}
            </p>
            <h2 id="tonight-events">
              {es
                ? "Planes con horario publicado"
                : "Plans with published schedules"}
            </h2>
          </div>
          <span className={styles.resultCount}>
            {discovery.unavailable ? "—" : events.length}
          </span>
        </div>
        {discovery.unavailable ? (
          <div className={styles.notice} role="alert">
            <p>
              {es
                ? "No hemos podido comprobar los eventos ahora mismo. Prueba de nuevo."
                : "We couldn't check events right now. Please try again."}
            </p>
            <Link className={styles.secondaryLink} href={retryHref}>
              {es ? "Reintentar este plan" : "Retry this plan"}
            </Link>
          </div>
        ) : events.length ? (
          <>
            <p className={styles.disclaimer}>
              {es
                ? "Horarios de eventos publicados, no aforo ni disponibilidad en directo. Confirma las condiciones con el local."
                : "Published event times, not live capacity or availability. Confirm details with the venue."}
            </p>
            <div className="grid">
              {events.map((entry, position) => (
                <EventCard
                  key={entry.result.occurrence.id}
                  result={entry.result}
                  locale={locale}
                  position={position}
                  recommendationRequestId={discovery.requestId}
                  reasonCodes={entry.reasonCodes}
                />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            <strong>
              {es
                ? "Todavía no hay eventos publicados para este plan."
                : "No published event listings for this plan yet."}
            </strong>
            <p>
              {es
                ? "Estamos preparando el lanzamiento por la Costa del Sol. Puedes explorar locales reales mientras reunimos más eventos con horarios publicados."
                : "We're building up the Costa del Sol launch. Explore real local places while more events with published schedules are added."}
            </p>
            <div className={styles.heroActions}>
              <Link href={`/${locale}/map`} className={styles.secondaryLink}>
                {es ? "Ver locales en el mapa" : "Explore places on the map"}
              </Link>
              <Link
                href={`/${locale}/community?view=suggest`}
                className={styles.secondaryLink}
              >
                {es ? "Sugerir un evento real" : "Suggest a real event"}
              </Link>
              <Link
                href={`/${locale}/roadmap`}
                className={styles.secondaryLink}
              >
                {es ? "Ver el plan de lanzamiento" : "View the launch roadmap"}
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className={styles.results} aria-labelledby="tonight-places">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>{es ? "Más ideas" : "More ideas"}</p>
            <h2 id="tonight-places">
              {es ? "Lugares que puedes explorar" : "Places worth exploring"}
            </h2>
          </div>
          <span className={styles.resultCount}>
            {venues.unavailable ? "—" : venues.total}
          </span>
        </div>
        <p className={styles.disclaimer}>
          {es
            ? "Estos negocios están cerca de la zona elegida; no se ha confirmado que estén abiertos, tengan el ambiente seleccionado ni admitan el grupo. Comprueba horarios y contacto antes de ir."
            : "These businesses are near your chosen area. Opening hours, selected vibe and group availability are not confirmed. Check with the venue before heading out."}
        </p>
        {venues.unavailable ? (
          <div className={styles.notice} role="alert">
            <p>
              {es
                ? "El directorio de locales no está disponible ahora."
                : "The local venue directory is temporarily unavailable."}
            </p>
            <Link className={styles.secondaryLink} href={retryHref}>
              {es ? "Reintentar locales cercanos" : "Retry nearby places"}
            </Link>
          </div>
        ) : venues.rows.length ? (
          <div className={styles.placeGrid}>
            {venues.rows.slice(0, 9).map((venue) => (
              <article key={venue.id} className={styles.place}>
                <div className={styles.placeMonogram} aria-hidden="true">
                  {venue.name.slice(0, 1).toUpperCase()}
                </div>
                <div className={styles.placeText}>
                  <h3>{venue.name}</h3>
                  <p>{venue.address}</p>
                  <span>{venue.distanceKm.toFixed(1)} km</span>
                  <div className={styles.placeActions}>
                    <Link href={`/${locale}/venues/${venue.slug}`}>
                      {es ? "Ver local" : "View place"}
                    </Link>
                    <a
                      href={directions(venue.latitude, venue.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {es ? "Cómo llegar" : "Directions"}
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <strong>
              {es
                ? "Aún estamos llegando a tu zona."
                : "We're still building in this area."}
            </strong>
            <p>
              {es
                ? "No hay locales publicados a esta distancia. Amplía el radio o cambia de zona."
                : "No published places were returned within this radius. Try a larger area or a different location."}
            </p>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <p>
          {discovery.unavailable || venues.unavailable
            ? es
              ? "No hemos podido comprobar todos los resultados. Vuelve a intentarlo para consultar los planes y locales."
              : "Some results couldn't be checked. Try again to load the plans and places."
            : hasSearch
              ? es
                ? "De descubrir a vivirlo: comparte un lugar, confirma los detalles y sal a explorar."
                : "From finding it to living it: share a place, confirm the details and go explore."
              : es
                ? "La cobertura está creciendo. Ni eventos inventados ni falsas multitudes."
                : "Coverage is growing. No made-up events or pretend crowds."}
        </p>
        <Link href={`/${locale}/passports`}>
          {es ? "Explorar AkiPassport" : "Explore AkiPassport"}
        </Link>
      </footer>
    </main>
  );
}
