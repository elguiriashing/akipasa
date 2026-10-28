import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/Icons";
import { isLocale, type Locale } from "@/lib/config";
import { launchPhases, roadmapFeatures, localized } from "@/lib/pasa-roadmap";
import styles from "./roadmap.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  return {
    title: es ? "Nuestro plan y expansión | AkiPasa" : "Our plan & rollout | AkiPasa",
    description: es
      ? "Descubre cómo se está preparando AkiPasa, empezando por la Costa del Sol y creciendo por España según la demanda."
      : "Follow the AkiPasa launch plan: Costa del Sol first, then expansion across Spain based on real demand.",
    alternates: {
      canonical: `https://akipasa.com/${locale}/roadmap`,
      languages: {
        es: "https://akipasa.com/es/roadmap",
        en: "https://akipasa.com/en/roadmap",
        "x-default": "https://akipasa.com/roadmap",
      },
    },
  };
}

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const lang: Locale = locale;
  const es = locale === "es";
  return (
    <main className={styles.main} id="roadmap-main">
      <div className={styles.topline}>
        <span className={styles.edition}><span className={styles.liveDot} aria-hidden="true" /> AKIPASA / ROADMAP</span>
        <Link href={`/${locale}`} className={styles.back}>
          <Icon name="arrow-right" size={16} /> {es ? "Volver a explorar" : "Back to exploring"}
        </Link>
      </div>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{es ? "DE LA COSTA DEL SOL AL RESTO DE ESPAÑA" : "FROM THE COSTA DEL SOL TO THE REST OF SPAIN"}</span>
          <h1>
            {es ? "Lo bueno empieza " : "Good things start "}
            <em>{es ? "cerca." : "locally."}</em>
          </h1>
          <p className={styles.lede}>
            {es
              ? "Estamos construyendo una manera más divertida de encontrar planes, lugares y experiencias reales. Empezamos en la Costa del Sol y creceremos donde la comunidad nos lleve."
              : "We're building a more exciting way to discover real places, plans and experiences. We start on the Costa del Sol and grow wherever our community takes us."}
          </p>
          <div className={styles.heroActions}>
            <a href="#launch-plan" className={styles.cta}>
              {es ? "Explorar el plan" : "Explore the plan"}
              <Icon name="arrow-right" size={18} />
            </a>
            <span className={styles.dateNote}>
              <Icon name="clock" size={16} />
              {es ? "Fechas por confirmar" : "Dates to be announced"}
            </span>
          </div>
        </div>
        <div className={styles.heroVisual} aria-label={es ? "Primera etapa Costa del Sol, expansión por España" : "Starting on Costa del Sol, expanding across Spain"}>
          <div className={styles.radar} aria-hidden="true">
            <span className={styles.radarRing} />
            <span className={styles.radarRing} />
            <span className={styles.radarRing} />
            <span className={styles.radarCenter}><Icon name="map" size={24} /></span>
          </div>
          <div className={styles.heroTag}>
            <span className={styles.tagLabel}>{es ? "PRIMER DESTINO" : "FIRST DESTINATION"}</span>
            <strong>Costa del Sol</strong>
            <span>{es ? "Fuengirola y alrededores" : "Fuengirola and surrounding areas"}</span>
          </div>
        </div>
      </header>

      <section className={styles.plan} id="launch-plan" aria-labelledby="plan-title">
        <div className={styles.sectionIntro}>
          <div>
            <span className={styles.eyebrow}>01 / {es ? "EL VIAJE" : "THE JOURNEY"}</span>
            <h2 id="plan-title">{es ? "Nuestro plan de lanzamiento" : "The launch plan"}</h2>
          </div>
          <p>{es ? "Sin fechas inventadas ni promesas vacías. Cada fase se anuncia cuando está lista." : "No invented deadlines. Each phase gets a date when it's actually ready."}</p>
        </div>
        <ol className={styles.timeline}>
          {launchPhases.map((phase, index) => (
            <li className={styles.phase} key={phase.key} data-status={phase.status}>
              <div className={styles.phaseTop}>
                <span className={styles.phaseNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.phaseStatus}>
                  {phase.status === "current"
                    ? es ? "En marcha" : "In progress"
                    : phase.status === "next"
                      ? es ? "Siguiente" : "Up next"
                      : es ? "Previsto" : "Planned"}
                </span>
              </div>
              <span className={styles.phaseEyebrow}>{localized(phase.eyebrow, lang)}</span>
              <h3>{localized(phase.title, lang)}</h3>
              <p>{localized(phase.description, lang)}</p>
              <span className={styles.schedule}><Icon name="calendar" size={15} /> {localized(phase.schedule, lang)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.features} aria-labelledby="features-title">
        <div className={styles.sectionIntro}>
          <div>
            <span className={styles.eyebrow}>02 / {es ? "LO QUE VIENE" : "WHAT'S NEXT"}</span>
            <h2 id="features-title">{es ? "Lo que estamos creando" : "What we're building"}</h2>
          </div>
          <p>{es ? "Nuestra brújula de producto. En desarrollo no significa que una función esté disponible para todos." : "Our product compass. A feature being developed isn't necessarily available to everyone yet."}</p>
        </div>
        <div className={styles.featureGrid}>
          {roadmapFeatures.map((feature) => (
            <article key={feature.name} className={styles.feature}>
              <span className={styles.featureStatus} data-state={feature.state}>
                <span aria-hidden="true" className={styles.statusDot} />
                {localized(feature.label, lang)}
              </span>
              <h3>{feature.name}</h3>
              <p>{localized(feature.detail, lang)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.expansion} aria-labelledby="expansion-title">
        <div className={styles.expansionMark}><Icon name="map" size={30} /></div>
        <div>
          <span className={styles.eyebrow}>03 / {es ? "NUESTRO MAPA" : "OUR MAP"}</span>
          <h2 id="expansion-title">{es ? "¿Y mi ciudad?" : "What about my town?"}</h2>
          <p>{es
            ? "Si aún no hay planes en tu ciudad, no significa que la hayamos olvidado. La expansión dependerá de la demanda, la actividad local y la calidad de los lugares publicados, no solo de un mapa lleno de pines."
            : "If your city looks quiet, it doesn't mean we've forgotten it. New areas will depend on demand, local activity and trustworthy venue coverage, not just filling a map with pins."}</p>
        </div>
        <Link href={`/${locale}/map`} className={styles.mapLink}>
          {es ? "Explorar el mapa" : "Explore the map"} <Icon name="arrow-right" size={18} />
        </Link>
      </section>
      <footer className={styles.footer}>
        <span>{es ? "El plan puede cambiar a medida que aprendemos." : "The plan may evolve as we learn."}</span>
        <Link href={`/${locale}`}>AkiPasa</Link>
      </footer>
    </main>
  );
}
