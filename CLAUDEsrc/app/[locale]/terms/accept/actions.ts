"use server";

import { redirect } from "next/navigation";
import { config, isLocale } from "@/lib/config";
import { safeAuthDestination } from "@/lib/auth-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function acceptTerms(formData: FormData) {
  const requestedLocale = String(formData.get("locale"));
  const locale = isLocale(requestedLocale) ? requestedLocale : "es";
  const next = safeAuthDestination(locale, String(formData.get("next") || ""));
  if (formData.get("acceptTerms") !== "accepted")
    redirect(
      `/${locale}/terms/accept?error=required&next=${encodeURIComponent(next)}`,
    );

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(
      `/${locale}/auth?next=${encodeURIComponent(`/${locale}/terms/accept?next=${encodeURIComponent(next)}`)}`,
    );

  const { error } = await supabase.rpc("accept_current_terms", {
    p_version: config.currentTermsVersion,
    p_locale: locale,
  });
  if (error)
    redirect(
      `/${locale}/terms/accept?error=save&next=${encodeURIComponent(next)}`,
    );
  redirect(next);
}
