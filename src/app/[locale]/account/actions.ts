"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function requestAccountDeletion(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const confirmation = String(formData.get("confirmation") || "");
  if (confirmation !== "DELETE" && confirmation !== "BORRAR")
    redirect(`/${locale}/account?error=delete-confirmation`);
  const { supabase, user } = await requireUser(locale);
  const { error } = await supabase
    .from("account_deletion_requests")
    .insert({ profile_id: user.id });
  if (error) redirect(`/${locale}/account?error=delete-request`);
  revalidatePath(`/${locale}/account`);
  redirect(`/${locale}/account?updated=delete-request`);
}
