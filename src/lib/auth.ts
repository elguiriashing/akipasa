import { redirect } from "next/navigation";
import { config, type Locale } from "./config";
import { createSupabaseServerClient } from "./supabase/server";

export async function requireUser(locale: Locale, next = `/${locale}/account`) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth?next=${encodeURIComponent(next)}`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_version")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.terms_version !== config.currentTermsVersion)
    redirect(`/${locale}/terms/accept?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}
