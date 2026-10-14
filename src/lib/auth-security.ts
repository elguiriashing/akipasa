import { z } from "zod";
import { safeStayDestination, stayOrigin } from "./akiduermo-routing";
import { conduzcoOrigin, safeConduzcoDestination } from "./akiconduzco-routing";

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
  return requested === "/pals" || requested?.startsWith(`/${locale}/`)
    ? requested
    : `/${locale}/account`;
}

export function safeAuthDestinationForOrigin(
  locale: "es" | "en",
  requested: string | undefined,
  origin: string,
) {
  if (origin === stayOrigin) return safeStayDestination(requested);
  if (origin === conduzcoOrigin) return safeConduzcoDestination(requested);
  return safeAuthDestination(locale, requested);
}

export function taskFromAuthCallback(
  locale: "es" | "en",
  requested: string | undefined,
  origin: string,
) {
  const safe = safeAuthDestinationForOrigin(locale, requested, origin);
  const url = new URL(safe, origin);
  return /^\/(en|es)\/auth\/recover\/?$/.test(url.pathname)
    ? safeAuthDestinationForOrigin(
        locale,
        url.searchParams.get("next") || undefined,
        origin,
      )
    : safe;
}
