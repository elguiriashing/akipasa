import Link from "next/link";
import { Icon } from "./Icons";
import type { Locale } from "@/lib/config";
import styles from "./LaunchRibbon.module.css";

/** Localized launch announcement; one accessible message with decorative, seamless motion. */
export function LaunchRibbon({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const message = es
    ? "AKIPASA LLEGA PRONTO · EMPEZAMOS EN LA COSTA DEL SOL · FUENGIROLA · BENALMÁDENA · TORREMOLINOS · MIJAS · MARBELLA · MÁLAGA · TU PRÓXIMO PLAN EMPIEZA AQUÍ"
    : "AKIPASA IS COMING SOON · STARTING ON THE COSTA DEL SOL · FUENGIROLA · BENALMÁDENA · TORREMOLINOS · MIJAS · MARBELLA · MÁLAGA · YOUR NEXT ADVENTURE STARTS HERE";
  return (
    <aside
      className={styles.ribbon}
      aria-label={es ? "Aviso de lanzamiento" : "Launch update"}
    >
      <span className={styles.spark} aria-hidden="true" />
      <div className={styles.viewport}>
        <p className={styles.accessible}>{message}</p>
        <div className={styles.track} aria-hidden="true">
          <span className={styles.message}>{message}</span>
          <span className={styles.message}>{message}</span>
        </div>
      </div>
      <Link href={`/${locale}/roadmap`} className={styles.link}>
        {es ? "Nuestro plan" : "Roadmap"}
        <Icon name="arrow-right" size={17} />
      </Link>
    </aside>
  );
}
