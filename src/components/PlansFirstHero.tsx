import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/config";
import { planShortcutHref, type PlanShortcut } from "@/lib/plans-first";
import { discoveryViewHref } from "@/lib/discovery-navigation";
import { tonightEnabled } from "@/lib/aki-tonight-release";
import { DiscoverySearchTrigger } from "./DiscoverySearchTrigger";
import styles from "./PlansFirstHero.module.css";

/** Social-plans hero: short ES/EN promise, existing search routes unchanged. */
export function PlansFirstHero({
  locale,
  location,
  imageUrl,
}: {
  locale: Locale;
  imageUrl?: string;
  location: {
    locality: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  };
}) {
  const es = locale === "es";
  const shortcuts: Array<{ key: PlanShortcut; es: string; en: string }> = [
    { key: "today", es: "Hoy", en: "Today" },
    { key: "tonight", es: "Esta noche", en: "Tonight" },
    { key: "weekend", es: "Este finde", en: "This weekend" },
    { key: "free", es: "Planes gratis", en: "Free plans" },
  ];
  const mapHref = discoveryViewHref(locale, "map", {
    locality: location.locality,
    locationName: location.name,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    radius: String(location.radius),
  });
  return (
    <section className={styles.hero} aria-labelledby="plans-first-title">
      <div className={styles.media} aria-hidden="true">
        <Image
          src={imageUrl || "/images/akipasa/nightlife-editorial.webp"}
          alt=""
          fill
          priority
          unoptimized
          sizes="(max-width: 640px) 100vw, 1100px"
        />
      </div>
      <DiscoverySearchTrigger locale={locale} />
      <p className={styles.kicker}>{location.name}</p>
      <h1 id="plans-first-title">
        {es ? "¿Qué hacemos hoy?" : "What are we doing today?"}
      </h1>
      <p className={styles.description}>
        {es
          ? "Buena música. Nuevos lugares. Mejores momentos."
          : "Good music. New places. Better moments."}
      </p>
      <nav
        className={styles.shortcuts}
        aria-label={
          es
            ? "Explorar planes por fecha y precio"
            : "Browse plans by date and price"
        }
      >
        {shortcuts.map((shortcut) => (
          <Link
            className={styles.shortcut}
            key={shortcut.key}
            href={planShortcutHref(locale, location, shortcut.key)}
          >
            {es ? shortcut.es : shortcut.en}
          </Link>
        ))}
        {tonightEnabled() && (
          <Link className={styles.mapShortcut} href={`/${locale}/tonight`}>
            {es ? "Crear un plan · AkiTonight" : "Make a plan · AkiTonight"}
          </Link>
        )}
        <Link className={styles.mapShortcut} href={mapHref}>
          {es ? "Ver mapa" : "See map"}
        </Link>
      </nav>
      <p className={styles.hint}>
        {es
          ? `Explorando ${location.name}. Cambia de zona desde la búsqueda.`
          : `Exploring ${location.name}. Change your area using search.`}
      </p>
    </section>
  );
}
