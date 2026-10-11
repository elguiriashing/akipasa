"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

export async function setSavedEventReminder(form: FormData) {
  const parsed = z
    .object({
      locale: z.enum(["en", "es"]),
      enabled: z.enum(["true", "false"]),
    })
    .safeParse(Object.fromEntries(form));
  const locale = form.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect("/" + locale + "/account/saved?email=invalid");
  const { supabase } = await requireUser(
    locale,
    "/" + locale + "/account/saved",
  );
  const { error } = await supabase.rpc("suite_email_reminder_preferences", {
    p_event: parsed.data.enabled === "true",
    p_stay: null,
  });
  if (error) redirect("/" + locale + "/account/saved?email=error");
  revalidatePath("/" + locale + "/account/saved");
  redirect("/" + locale + "/account/saved?email=updated");
}
