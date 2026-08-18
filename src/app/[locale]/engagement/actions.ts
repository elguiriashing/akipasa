"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { recordTrustedBehaviour } from "@/lib/personalisation/trusted";

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
    await recordTrustedBehaviour({
      eventType: parsed.data.intent === "add" ? "event_saved" : "event_unsaved",
      profileId: user.id,
      entityType: "event",
      entityId: parsed.data.key,
      surface: "event_detail",
    });
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
    await recordTrustedBehaviour({
      eventType:
        parsed.data.intent === "add" ? "venue_followed" : "venue_unfollowed",
      profileId: user.id,
      entityType: "venue",
      entityId: parsed.data.key,
      surface: "venue_detail",
    });
    if (parsed.data.intent === "add" && uuid.safeParse(parsed.data.key).success)
      await supabase.rpc("record_analytics", {
        p_action: "venue_followed",
        p_venue: parsed.data.key,
        p_metadata: { locale: parsed.data.locale },
      });
    revalidatePath(parsed.data.returnTo);
  }
}

const eventPreferenceSchema = z.object({
  locale: z.enum(["es", "en"]),
  eventId: z.string().uuid(),
  returnTo: z.string().regex(/^\/(es|en)\/events\/[a-z0-9-]+$/),
  state: z.enum(["going", "not_interested", "clear"]),
  reason: z
    .enum([
      "",
      "not_my_thing",
      "too_far",
      "too_expensive",
      "wrong_time",
      "already_seen",
      "hide_venue",
      "other",
    ])
    .default(""),
});

export async function setEventPreference(formData: FormData) {
  const parsed = eventPreferenceSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}`);
  const { supabase, user } = await requireUser(locale, parsed.data.returnTo);
  const { error } =
    parsed.data.state === "clear"
      ? await supabase
          .from("user_event_preferences")
          .delete()
          .eq("profile_id", user.id)
          .eq("event_id", parsed.data.eventId)
      : await supabase.from("user_event_preferences").upsert({
          profile_id: user.id,
          event_id: parsed.data.eventId,
          state: parsed.data.state,
          reason: parsed.data.reason || null,
          updated_at: new Date().toISOString(),
        });
  if (!error && parsed.data.state !== "clear") {
    await recordTrustedBehaviour({
      eventType:
        parsed.data.state === "going" ? "event_going" : "event_not_interested",
      profileId: user.id,
      entityType: "event",
      entityId: parsed.data.eventId,
      surface: "event_detail",
      metadata: parsed.data.reason ? { reason: parsed.data.reason } : {},
    });
  }
  revalidatePath(parsed.data.returnTo);
}
