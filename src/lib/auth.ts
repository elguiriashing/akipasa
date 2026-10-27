import { readOnboardingStatus } from "./account-onboarding-server";
import { onboardingUrl } from "./account-onboarding";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { config, type Locale } from "./config";
import { hasSupabaseAuthCookie } from "./supabase/auth-cookie";
import { createSupabasePublicClient } from "./supabase/public";
import { createSupabaseServerClient } from "./supabase/server";

export async function optionalUser() {
  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookie(cookieStore.getAll())) {
    return { supabase: createSupabasePublicClient(), user: null, error: null };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user, error };
}

export async function requireIdentity(
  locale: Locale,
  next = `/${locale}/account`,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}

export async function requireUser(locale: Locale, next = `/${locale}/account`) {
  const { supabase, user } = await requireIdentity(locale, next);
  const eligibility = await readOnboardingStatus(supabase);
  if (eligibility === "pending" || eligibility === "underage")
    redirect(onboardingUrl(locale, next));
  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_version")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.terms_version !== config.currentTermsVersion)
    redirect(`/${locale}/terms/accept?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}
