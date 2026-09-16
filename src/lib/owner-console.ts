import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "./auth";
import type { Locale } from "./config";

export const ownerBackgrounds = [
  "default",
  "aurora",
  "midnight",
  "synthwave",
  "paper",
  "none",
] as const;
export const ownerAccents = [
  "orange",
  "teal",
  "violet",
  "pink",
  "gold",
] as const;

export const ownerPreferencesSchema = z.object({
  locale: z.enum(["es", "en"]),
  background: z.enum(ownerBackgrounds),
  accent: z.enum(ownerAccents),
  motion: z.string().optional(),
  glass: z.string().optional(),
});

export const ownerBackgroundPathSchema = z.object({
  locale: z.enum(["es", "en"]),
  path: z
    .string()
    .min(40)
    .max(180)
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/),
});

export type OwnerPreferences = {
  background: (typeof ownerBackgrounds)[number];
  accent: (typeof ownerAccents)[number];
  motion: boolean;
  glass: boolean;
  backgroundImagePath: string | null;
  backgroundImageUrl?: string | null;
};

export type OwnerBackgroundImage = { path: string; name: string; url: string };

export const defaultOwnerPreferences: OwnerPreferences = {
  background: "aurora",
  accent: "teal",
  motion: true,
  glass: true,
  backgroundImagePath: null,
  backgroundImageUrl: null,
};

export async function requireOwnerConsole(
  locale: Locale,
  next = `/${locale}/owner`,
) {
  const context = await requireUser(locale, next);
  const { data: allowed, error } =
    await context.supabase.rpc("has_owner_console");
  if (error || allowed !== true) notFound();
  return context;
}
