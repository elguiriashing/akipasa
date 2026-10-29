import type { Locale } from "@/lib/config";
import {
  weeklyCredentialQuestProgress,
  type VenueCredentialVisit,
} from "@/lib/aki-weekly-quests";
import styles from "./WeeklyQuestPanel.module.css";

const milestones = {
  "first-venue": {
    es: {
      title: "Tu primera parada",
      description: "Haz un check-in con credencial del local esta semana.",
    },
    en: {
      title: "Your first stop",
      description: "Check in with a venue credential this week.",
    },
  },
  "two-venues": {
    es: {
      title: "Dos lugares diferentes",
      description: "Explora dos locales distintos con check-in autorizado.",
    },
    en: {
      title: "Two different places",
      description: "Visit two distinct places with authorised check-ins.",
    },
  },
} as const;

export function WeeklyQuestPanel({
  locale,
  signedIn,
  unavailable,
  visits,
  now,
}: {
  locale: Locale;
  signedIn: boolean;
  unavailable: boolean;
  visits: VenueCredentialVisit[];
  now: Date;
}) {
  const es = locale === "es";
  const progress = weeklyCredentialQuestProgress(visits, now);
  return (
    <section
      className={styles.section}
      aria-labelledby="weekly-quests-heading"
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            {es ? "RETOS OPCIONALES / SEMANALES" : "OPTIONAL / WEEKLY CHALLENGES"}
          </p>
          <h2 id="weekly-quests-heading">
            {es ? "Tu semana de exploración" : "Your week of exploring"}
          </h2>
          <p className={styles.intro}>
            {es
              ? "Pequeñas metas para descubrir sitios nuevos. Sin rachas diarias, sin presión y sin premios por gastar."
              : "Small goals for discovering new places. No daily streaks, pressure or rewards for spending."}
          </p>
        </div>
        <span className={styles.weekTag}>
          {es ? "Reinicio el lunes · Madrid" : "Resets Monday · Madrid"}
        </span>
      </div>
      {!signedIn ? (
        <p className={styles.message}>
          {es
            ? "Inicia sesión para consultar tus visitas esta semana."
            : "Sign in to see your visits from this week."}
        </p>
      ) : unavailable ? (
        <p className={styles.message} role="alert">
          {es
            ? "Ahora mismo no podemos consultar tus check-ins. Tu progreso existente sigue guardado."
            : "Your check-ins can't be loaded right now. Existing progress is still saved."}
        </p>
      ) : (
        <div className={styles.cards}>
          {progress.milestones.map((quest, index) => {
            const copy = milestones[quest.id][locale];
            return (
              <article className={styles.card} key={quest.id}>
                <div className={styles.cardTop}>
                  <span className={styles.step}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.state}>
                    {quest.achieved
                      ? es
                        ? "Completado"
                        : "Complete"
                      : es
                        ? "En marcha"
                        : "In progress"}
                  </span>
                </div>
                <h3>{copy.title}</h3>
                <p>{copy.description}</p>
                <progress
                  className={styles.progress}
                  value={quest.completed}
                  max={quest.target}
                  aria-label={
                    es
                      ? `${copy.title}: ${quest.completed} de ${quest.target}`
                      : `${copy.title}: ${quest.completed} of ${quest.target}`
                  }
                >
                  {quest.completed}/{quest.target}
                </progress>
                <span className={styles.count}>
                  {quest.completed} / {quest.target}
                </span>
              </article>
            );
          })}
        </div>
      )}
      <p className={styles.disclosure}>
        {es
          ? "Vista previa de progreso: solo cuentan los check-ins aceptados con credencial del local. Un check-in no demuestra una compra ni activa XP adicional, descuentos o premios. Los controles antifraude avanzados siguen en desarrollo."
          : "Progress preview: only accepted venue-credential check-ins count. A check-in is not proof of purchase and does not grant extra XP, discounts or prizes. Advanced fraud controls are still in development."}
      </p>
    </section>
  );
}
