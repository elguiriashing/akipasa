import type { Locale } from "./config";

export type BadgeDefinition = {
  key: "first_step" | "local_regular" | "city_insider";
  minimumXp: number;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
};

export const badgeDefinitions: readonly BadgeDefinition[] = [
  {
    key: "first_step",
    minimumXp: 10,
    name: { es: "Primer paso", en: "First step" },
    description: {
      es: "Has hecho tu primer check-in válido.",
      en: "You completed your first valid check-in.",
    },
  },
  {
    key: "local_regular",
    minimumXp: 100,
    name: { es: "Habitual local", en: "Local regular" },
    description: {
      es: "Has conseguido 100 XP explorando negocios participantes.",
      en: "You earned 100 XP exploring participating businesses.",
    },
  },
  {
    key: "city_insider",
    minimumXp: 500,
    name: { es: "Conoce la ciudad", en: "City insider" },
    description: {
      es: "Has conseguido 500 XP descubriendo planes locales.",
      en: "You earned 500 XP discovering local plans.",
    },
  },
] as const;

export function badgeProgress(totalXp: number) {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const earned = badgeDefinitions.filter((badge) => safeXp >= badge.minimumXp);
  const next =
    badgeDefinitions.find((badge) => safeXp < badge.minimumXp) ?? null;
  return {
    earned,
    next,
    remainingXp: next ? next.minimumXp - safeXp : 0,
  };
}
