import { ConsoleIcon } from "@/components/ConsoleChrome";
import { badgeDefinitions, badgeProgress } from "@/lib/badges";
import type { Locale } from "@/lib/config";

export function BadgeProgress({
  locale,
  totalXp,
}: {
  locale: Locale;
  totalXp: number;
}) {
  const es = locale === "es";
  const { earned, next, remainingXp } = badgeProgress(totalXp);

  return (
    <section className="panel console-card badge-progress">
      <div className="card-title-row">
        <ConsoleIcon label="XP">
          <svg viewBox="0 0 24 24">
            <path d="m12 4 2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5-3.6-3.5 5-.7Z" />
          </svg>
        </ConsoleIcon>
        <div>
          <h3>{es ? "Insignias" : "Badges"}</h3>
          <p>
            {earned.length} / {badgeDefinitions.length}{" "}
            {es ? "conseguidas" : "earned"}
          </p>
        </div>
      </div>
      {earned.length ? (
        <div className="badge-list">
          {earned.map((badge) => (
            <div className="badge-item" key={badge.key}>
              <span className="badge-mark">
                {badge.name[locale].slice(0, 1)}
              </span>
              <div>
                <strong>{badge.name[locale]}</strong>
                <span>{badge.description[locale]}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          {es
            ? "Tu primera insignia se desbloquea con un check-in valido."
            : "Your first badge unlocks after one valid check-in."}
        </p>
      )}
      {next ? (
        <div className="badge-next">
          <span>{es ? "Siguiente" : "Next"}</span>
          <strong>{next.name[locale]}</strong>
          <small>
            {remainingXp} XP {es ? "para desbloquear" : "to unlock"}
          </small>
        </div>
      ) : (
        <p className="reward-strip">
          {es
            ? "Has desbloqueado todas las insignias actuales."
            : "You have unlocked every current badge."}
        </p>
      )}
    </section>
  );
}
