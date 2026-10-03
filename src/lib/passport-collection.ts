import scopes from "./achievement-scopes.json";
import type { Locale } from "./config";
export type PassportMilestone = {
  key: string;
  tier: number;
  target: number;
  title_es: string;
  title_en: string;
  unlocked_at: string | null;
  manual_at: string | null;
};
export type PassportFamily = {
  family_key: string;
  city_key: string | null;
  category_key: string | null;
  archived: boolean;
  current_count: number;
  available: number;
  remaining: number;
  milestones: PassportMilestone[];
};
export type PassportCollection = {
  families: PassportFamily[];
  updated_at: string;
};
export const stampCategories = scopes.categories;
export const stampSymbols: Record<string, string> = {
  restaurant: "♜",
  cafe: "☕",
  bar: "◈",
  nightlife: "♫",
  culture: "✺",
  shopping: "◇",
  sport: "⚑",
  wellness: "❋",
  family: "✿",
  outdoors: "❧",
};
export function familyProgress(f?: PassportFamily) {
  const milestones = f?.milestones || [];
  const natural = milestones
    .filter((m) => m.unlocked_at)
    .reduce((n, m) => Math.max(n, m.tier || 1), 0);
  const manual = milestones
    .filter((m) => m.manual_at)
    .reduce((n, m) => Math.max(n, m.tier || 1), 0);
  const tier = Math.max(natural, manual);
  const next = milestones.find((m) => (m.tier || 1) > tier);
  const count = Number(f?.current_count || 0);
  return {
    tier,
    natural,
    manual,
    admin: manual > natural,
    next,
    count,
    attainable: !next || count + Number(f?.remaining || 0) >= next.target,
  };
}
export function cardFinish(tier: number) {
  return tier >= 5
    ? "prismatic"
    : tier >= 3
      ? "holographic"
      : tier >= 1
        ? "satin"
        : "plain";
}
export function tierName(tier: number, locale: Locale) {
  return (
    (locale === "es"
      ? ["Sin sello", "Bronce", "Plata", "Oro", "Platino", "Holográfico"]
      : ["Unearned", "Bronze", "Silver", "Gold", "Platinum", "Holographic"])[
      tier
    ] || ""
  );
}
export function rankName(tier: number, locale: Locale) {
  return (
    (locale === "es"
      ? [
          "Sin explorar",
          "Principiante",
          "Aficionado",
          "Explorador",
          "Conocedor",
          "Experto",
          "Leyenda",
        ]
      : [
          "Unexplored",
          "Novice",
          "Amateur",
          "Explorer",
          "Insider",
          "Expert",
          "Legend",
        ])[tier] || ""
  );
}
export function finishName(tier: number, locale: Locale) {
  return (
    locale === "es"
      ? {
          plain: "Clásica",
          satin: "Satinada",
          holographic: "Holográfica",
          prismatic: "Prismática",
        }
      : {
          plain: "Plain",
          satin: "Satin",
          holographic: "Holographic",
          prismatic: "Prismatic",
        }
  )[cardFinish(tier)];
}
