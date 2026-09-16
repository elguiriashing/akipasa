import { z } from "zod";
import type { BadgeDefinition } from "./badges";

export const achievementIcons = [
  "discover",
  "star",
  "venue",
  "gift",
  "heart",
] as const;
export const achievementKeySchema = z.string().regex(/^[a-z][a-z0-9_]{2,63}$/);
export const achievementSchema = z.object({
  key: achievementKeySchema,
  title_es: z.string().trim().min(2).max(80),
  title_en: z.string().trim().min(2).max(80),
  description_es: z.string().trim().min(3).max(300),
  description_en: z.string().trim().min(3).max(300),
  minimum_xp: z.coerce.number().int().min(1).max(1000000),
  icon: z.enum(achievementIcons),
  active: z.boolean(),
});
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
