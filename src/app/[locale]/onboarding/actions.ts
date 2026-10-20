"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireIdentity } from "@/lib/auth";
import { config } from "@/lib/config";
import {
  onboardingDestination,
  onboardingSchema,
  onboardingUrl,
} from "@/lib/account-onboarding";
import { uploadProfileMedia } from "../account/actions";

export async function completeAccount(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const next = onboardingDestination(
    locale,
    String(formData.get("next") || ""),
  );
  const back = onboardingUrl(locale, next);
  const { supabase } = await requireIdentity(locale, back);
  // Persist a negative declaration before any unrelated field validation.
  if (formData.get("adult") === "no") {
    const { error } = await supabase.rpc("complete_account_onboarding", {
      p_adult: false,
    });
    if (error) redirect(`${back}&error=save`);
    revalidatePath(`/${locale}`, "layout");
    redirect(back);
  }
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${back}&error=required`);
  const avatar = formData.get("file");
  if (
    avatar instanceof File &&
    avatar.size > 0 &&
    (avatar.size > 10 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(avatar.type))
  )
    redirect(`${back}&error=media`);
  const { data, error } = await supabase.rpc("complete_account_onboarding", {
    p_adult: true,
    p_username: parsed.data.username,
    p_bio: parsed.data.bio,
    p_terms_version: config.currentTermsVersion,
    p_locale: locale,
  });
  if (error)
    redirect(`${back}&error=${error.code === "23505" ? "username" : "save"}`);
  revalidatePath(`/${locale}`, "layout");
  if (data === "underage") redirect(back);
  if (!["complete", "exempt"].includes(data)) redirect(`${back}&error=save`);
  if (avatar instanceof File && avatar.size > 0) {
    formData.set("kind", "avatar");
    // Reuse the existing authorized profile storage path and validation.
    await uploadProfileMedia(formData);
  }
  redirect(next);
}

export async function requestRestrictedDeletion(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const back = `/${locale}/onboarding/privacy`;
  const { supabase, user } = await requireIdentity(locale, back);
  if (formData.get("confirmation") !== "DELETE")
    redirect(`${back}?error=confirmation`);
  const { error } = await supabase
    .from("account_deletion_requests")
    .insert({ profile_id: user.id });
  if (error) redirect(`${back}?error=save`);
  redirect(`${back}?requested=1`);
}
