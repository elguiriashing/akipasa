import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

export const safeExternalUrlSchema = z.union([
  z.literal(""),
  z
    .string()
    .url()
    .refine((value) => new URL(value).protocol === "https:"),
]);

export function safeAuthDestination(locale: "es" | "en", requested?: string) {
  return requested?.startsWith(`/${locale}/`)
    ? requested
    : `/${locale}/account`;
}
