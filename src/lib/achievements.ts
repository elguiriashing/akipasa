import { z } from "zod";
import type { BadgeDefinition } from "./badges";
import scopes from "./achievement-scopes.json";
import type { Locale } from "./config";

export const achievementScopes = scopes;
export const achievementMetrics = [
  "xp",
  "venues",
  "check_ins",
  "cities",
  "categories",
  "active_days",
  "regular",
  "weekend",
] as const;
export const metricLabels: Record<
  (typeof achievementMetrics)[number],
  Record<Locale, string>
> = {
  xp: { es: "XP", en: "XP" },
  venues: { es: "Locales distintos", en: "Distinct places" },
  check_ins: { es: "Check-ins válidos", en: "Valid check-ins" },
  cities: { es: "Ciudades distintas", en: "Different cities" },
  categories: { es: "Categorías distintas", en: "Different categories" },
  active_days: { es: "Días activos", en: "Active days" },
  regular: { es: "Visitas al mismo local", en: "Visits to the same place" },
  weekend: { es: "Días de fin de semana", en: "Weekend days" },
};

export const achievementIcons = [
  "discover",
  "star",
  "venue",
  "gift",
  "heart",
] as const;
export const achievementKeySchema = z.string().regex(/^[a-z][a-z0-9_]{2,63}$/);
export const achievementSchema = z
  .object({
    condition_type: z.enum(achievementMetrics).default("xp"),
    target_count: z.coerce.number().int().min(1).max(1000000).default(1),
    city_key: z
      .string()
      .nullable()
      .default(null)
      .refine(
        (value) =>
          value === null || scopes.cities.some((city) => city.key === value),
      ),
    category_key: z
      .string()
      .nullable()
      .default(null)
      .refine(
        (value) =>
          value === null ||
          scopes.categories.some((category) => category.key === value),
      ),
    key: achievementKeySchema,
    title_es: z.string().trim().min(2).max(80),
    title_en: z.string().trim().min(2).max(80),
    description_es: z.string().trim().min(3).max(300),
    description_en: z.string().trim().min(3).max(300),
    minimum_xp: z.coerce.number().int().min(1).max(1000000),
    icon: z.enum(achievementIcons),
    active: z.boolean(),
  })
  .refine(
    (value) =>
      value.condition_type === "venues" ||
      (!value.city_key && !value.category_key),
    { message: "Only distinct-place conditions accept a city or category." },
  );
export type Achievement = z.infer<typeof achievementSchema> & {
  updated_at: string;
};
export type AchievementActionState = { error?: string; success?: boolean };

export function achievementBadge(item: Achievement): BadgeDefinition {
  return {
    key: item.key,
    minimumXp: item.minimum_xp,
    icon: item.icon,
    name: { es: item.title_es, en: item.title_en },
    description: { es: item.description_es, en: item.description_en },
  };
}

export type AchievementProgress = Achievement & {
  current_count: number;
  unlocked_at: string | null;
};
export function achievementTarget(item: Achievement) {
  return item.condition_type === "xp" ? item.minimum_xp : item.target_count;
}
export function achievementCondition(item: Achievement, locale: Locale) {
  const city = scopes.cities.find((city) => city.key === item.city_key);
  const category = scopes.categories.find(
    (category) => category.key === item.category_key,
  );
  return [
    metricLabels[item.condition_type || "xp"][locale],
    city?.[locale],
    category?.[locale],
  ]
    .filter(Boolean)
    .join(" · ");
}
