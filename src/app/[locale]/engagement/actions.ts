"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const refSchema = z.object({
  locale: z.enum(["es", "en"]),
  key: z.string().min(2).max(160),
  label: z.string().min(2).max(200),
  href: z.string().regex(/^\/(es|en)\/(events|venues)\/[a-z0-9-]+$/),
  returnTo: z.string().regex(/^\/(es|en)\/(events|venues)\/[a-z0-9-]+$/),
  intent: z.enum(["add", "remove"]),
});
const uuid = z.string().uuid();

export async function toggleSavedEvent(formData: FormData) {
  const parsed = refSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}`);
  const { supabase, user } = await requireUser(locale, parsed.data.returnTo);
  const query = supabase.from("saved_event_refs");
  const { error } =
    parsed.data.intent === "remove"
      ? await query
          .delete()
          .eq("profile_id", user.id)
          .eq("event_key", parsed.data.key)
      : await query.upsert({
          profile_id: user.id,
          event_key: parsed.data.key,
          title: parsed.data.label,
          href: parsed.data.href,
        });
  if (!error) {
    if (parsed.data.intent === "add" && uuid.safeParse(parsed.data.key).success)
      await supabase.rpc("record_analytics", {
        p_action: "event_saved",
        p_event: parsed.data.key,
        p_metadata: { locale: parsed.data.locale },
      });
    revalidatePath(parsed.data.returnTo);
  }
}

export async function toggleFollowedVenue(formData: FormData) {
  const parsed = refSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}`);
  const { supabase, user } = await requireUser(locale, parsed.data.returnTo);
  const query = supabase.from("followed_venue_refs");
  const { error } =
    parsed.data.intent === "remove"
      ? await query
          .delete()
          .eq("profile_id", user.id)
          .eq("venue_key", parsed.data.key)
      : await query.upsert({
          profile_id: user.id,
          venue_key: parsed.data.key,
          name: parsed.data.label,
          href: parsed.data.href,
        });
  if (!error) {
    if (parsed.data.intent === "add" && uuid.safeParse(parsed.data.key).success)
      await supabase.rpc("record_analytics", {
        p_action: "venue_followed",
        p_venue: parsed.data.key,
        p_metadata: { locale: parsed.data.locale },
      });
    revalidatePath(parsed.data.returnTo);
  }
}
