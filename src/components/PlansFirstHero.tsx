import Link from "next/link";
import type { Locale } from "@/lib/config";
import { planShortcutHref, type PlanShortcut } from "@/lib/plans-first";
import { discoveryViewHref } from "@/lib/discovery-navigation";
import styles from "./PlansFirstHero.module.css";

export function PlansFirstHero({
  locale,
  location,
}: {
  locale: Locale;
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
      <p className={styles.kicker}>
        {es ? "Tu ciudad tiene plan." : "Your city has plans."}
      </p>
      <h1 id="plans-first-title">
        {es ? "¿Qué hacemos hoy?" : "What are we doing today?"}
      </h1>
      <p className={styles.description}>
        {es
          ? "Música en directo, planes con amigos y cosas nuevas por descubrir. Mira qué pasa hoy en tu zona, empezando por la Costa del Sol."
          : "Live music, plans with friends and something new to discover. See what’s happening near you today, starting on the Costa del Sol."}
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
