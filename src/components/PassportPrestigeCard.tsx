import type { PublicPrestigeAward } from "@/lib/passport-prestige";
import type { Locale } from "@/lib/config";
import styles from "./passport-prestige.module.css";
export function PassportPrestigeCard({
  award,
  locale,
}: {
  award: PublicPrestigeAward;
  locale: Locale;
}) {
  return (
    <article className={styles.trophy}>
      <svg viewBox="0 0 160 160" aria-hidden="true" className={styles.emblem}>
        <path
          d="M45 25h70l-9 66-26 23-26-23z M80 114v20m-30 0h60 M43 39H25c0 30 11 40 27 40m65-40h18c0 30-11 40-27 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinejoin="round"
        />
      </svg>
      <p>AkiPasa · {locale === "es" ? "Prestigio" : "Prestige"}</p>
      <h2>{locale === "es" ? award.title_es : award.title_en}</h2>
      <p className={styles.alias}>{award.public_alias}</p>
      <p>
        #{award.serial} ·{" "}
        {new Date(award.awarded_at).toLocaleDateString(
          locale === "es" ? "es-ES" : "en-GB",
          { timeZone: "Europe/Madrid" },
        )}
      </p>
      <small>
        {locale === "es"
          ? "Logro confirmado mediante actividad aceptada en AkiPasa."
          : "Achievement confirmed from accepted activity in AkiPasa."}
      </small>
    </article>
  );
}
