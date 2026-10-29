import Link from "next/link";
import { Icon } from "./Icons";
import type { Locale } from "@/lib/config";
import styles from "./LaunchRibbon.module.css";

/** Static, accessible rollout notice. No scrolling text, location tracking or invented deadlines. */
export function LaunchRibbon({ locale }: { locale: Locale }) {
  const es = locale === "es";
  return (
    <aside
      className={styles.ribbon}
      aria-label={es ? "Aviso de lanzamiento" : "Launch update"}
    >
      <span className={styles.spark} aria-hidden="true" />
      <p>
        <strong>
          {es
            ? "Empezamos en la Costa del Sol."
            : "Starting on the Costa del Sol."}
        </strong>
      </p>
      <Link href={`/${locale}/roadmap`} className={styles.link}>
        {es ? "Nuestro plan" : "Roadmap"}
        <Icon name="arrow-right" size={17} />
      </Link>
    </aside>
  );
}
