"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().trim().max(100),
  preferredLocale: z.enum(["es", "en"]),
});

export async function updateAccountProfile(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/account/profile?error=validation`);
  const { supabase } = await requireUser(locale);
  const { error } = await supabase.rpc("update_own_profile", {
    p_display_name: parsed.data.displayName,
    p_preferred_locale: parsed.data.preferredLocale,
  });
  if (error) redirect(`/${locale}/account/profile?error=update`);
  revalidatePath(`/${locale}/account`, "layout");
  redirect(`/${locale}/account/profile?updated=1`);
}

export async function requestAccountDeletion(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const confirmation = String(formData.get("confirmation") || "");
  if (confirmation !== "DELETE" && confirmation !== "BORRAR")
    redirect(`/${locale}/account/privacy?error=delete-confirmation`);
  const { supabase, user } = await requireUser(locale);
  const { error } = await supabase
    .from("account_deletion_requests")
    .insert({ profile_id: user.id });
  if (error) redirect(`/${locale}/account/privacy?error=delete-request`);
  revalidatePath(`/${locale}/account/privacy`);
  redirect(`/${locale}/account/privacy?updated=delete-request`);
}
