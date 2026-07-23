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
    <section className="panel">
      <h2>{es ? "Insignias" : "Badges"}</h2>
      <p>
        {earned.length} / {badgeDefinitions.length}{" "}
        {es ? "conseguidas" : "earned"}
      </p>
      {earned.length ? (
        earned.map((badge) => (
          <div className="managed-row" key={badge.key}>
            <strong>{badge.name[locale]}</strong>
            <span>{badge.description[locale]}</span>
          </div>
        ))
      ) : (
        <p>
          {es
            ? "Tu primera insignia se desbloquea con un check-in válido."
            : "Your first badge unlocks after one valid check-in."}
        </p>
      )}
      {next ? (
        <p>
          <strong>{next.name[locale]}</strong> · {remainingXp} XP{" "}
          {es ? "para desbloquear" : "to unlock"}
        </p>
      ) : (
        <p>
          {es
            ? "Has desbloqueado todas las insignias actuales."
            : "You have unlocked every current badge."}
        </p>
      )}
    </section>
  );
}
