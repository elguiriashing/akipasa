import { z } from "zod";
import { safeAuthDestination } from "./auth-security";
import type { Locale } from "./config";

export const onboardingSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,30}$/),
  bio: z.string().trim().max(2000).default(""),
  adult: z.literal("yes"),
  acceptTerms: z.literal("accepted"),
});
export type OnboardingStatus = "exempt" | "pending" | "complete" | "underage";
export function onboardingEnabled() {
  return process.env.AKISUITE_ONBOARDING_SCHEMA_READY === "true";
}
export function onboardingDestination(locale: Locale, requested?: string) {
  const safe = safeAuthDestination(locale, requested);
  // This flow always resumes a local product task, never itself or auth/legal loops.
  try {
    const url = new URL(safe, "https://akipasa.com");
    if (url.origin !== "https://akipasa.com" || /[\\\r\n]/.test(safe))
      return `/${locale}/account`;
    if (/^\/(en|es)\/(onboarding|auth|terms)(?:\/|$)/.test(url.pathname))
      return `/${locale}/account`;
    return url.pathname + url.search + url.hash;
  } catch {
    return `/${locale}/account`;
  }
}
export function onboardingUrl(locale: Locale, requested?: string) {
  return `/${locale}/onboarding?${new URLSearchParams({ next: onboardingDestination(locale, requested) })}`;
}
