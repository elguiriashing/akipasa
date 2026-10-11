"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

export async function saveEmailReminderPreferences(form:FormData) {
 const locale=form.get("locale")==="en"?"en":"es";
 const parsed=z.object({
  locale:z.enum(["es","en"]),
  eventReminders:z.enum(["on"]).optional(),
  stayReminders:z.enum(["on"]).optional(),
 }).safeParse(Object.fromEntries(form));
 if(!parsed.success)redirect(`/${locale}/account/settings?error=reminder-validation`);
 const {supabase}=await requireUser(locale,`/${locale}/account/settings`);
 const {error}=await supabase.rpc("aki_update_email_preferences",{
  p_events:parsed.data.eventReminders==="on",
  p_stays:parsed.data.stayReminders==="on"
 });
 if(error)redirect(`/${locale}/account/settings?error=reminders`);
 redirect(`/${locale}/account/settings?updated=reminders`);
}
