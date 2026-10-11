import { redirect } from "next/navigation";
import { cache } from "react";
import { cookies } from "next/headers";
import { config, type Locale } from "./config";
import { hasSupabaseAuthCookie } from "./supabase/auth-cookie";
import { createSupabasePublicClient } from "./supabase/public";
import { createSupabaseServerClient } from "./supabase/server";

// React memoization lasts for this server render only. Never persist identity
// or role reads in a module cache, unstable_cache, or the public response cache.
export const optionalUser = cache(async () => {
  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookie(cookieStore.getAll())) {
    return { supabase: createSupabasePublicClient(), user: null };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export const viewerProfile = cache(async () => {
  const { supabase, user } = await optionalUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select(
      "terms_version,app_role,display_name,membership_tier,preferred_locale",
    )
    .eq("id", user.id)
    .maybeSingle();
  return data;
});

export async function requireUser(locale: Locale, next = `/${locale}/account`) {
  const { supabase, user } = await optionalUser();
  if (!user) redirect(`/${locale}/auth?next=${encodeURIComponent(next)}`);
  const profile = await viewerProfile();
  if (profile?.terms_version !== config.currentTermsVersion)
    redirect(`/${locale}/terms/accept?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}
