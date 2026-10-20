import { redirect } from "next/navigation";
import { optionalUser } from "./auth";
import type { Locale } from "./config";
/** Privacy controls deliberately bypass terms/onboarding feature locks. */
export async function requirePrestigePrivacyIdentity(locale: Locale) {
  const { supabase, user } = await optionalUser();
  if (!user)
    redirect(
      `/${locale}/auth?next=${encodeURIComponent(`/${locale}/privacy/prestige`)}`,
    );
  return { supabase, user };
}
