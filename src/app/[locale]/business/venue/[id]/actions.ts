"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBusinessAccess } from "@/lib/entitlements";
import { safeExternalUrlSchema } from "@/lib/auth-security";
import { madridLocalDateTimeSchema } from "@/lib/time";
import { reviewPendingCatalogueItem } from "@/lib/automatic-moderation";
import {
  translateLocalizedFields,
  translateSubmittedLocalizedFields,
  translateVenueCatalogueDocument,
} from "@/lib/localized-copy";
import type { VenueCatalogueDocument } from "@/lib/venue-catalogue";

const context = z.object({
  locale: z.enum(["es", "en"]),
  venueId: z.string().uuid(),
});
function destination(locale: string, venueId: string, result: string) {
  return `/${locale}/business/venue/${venueId}?${result}`;
}

export async function updateVenue(formData: FormData) {
  const parsed = context
    .extend({
      name: z.string().trim().min(2).max(120),
      description: z.string().trim().min(20).max(2000),
      address: z.string().trim().min(5).max(300),
      addressSelection: z.enum(["selected", "unchanged"]),
      locality: z.string().trim().max(120),
      province: z.string().trim().max(120),
      latitude: z.union([z.literal(""), z.coerce.number().min(27).max(44.5)]),
      longitude: z.union([z.literal(""), z.coerce.number().min(-19).max(5)]),
      accessible: z.string().optional(),
      contactPhone: z.union([
        z.literal(""),
        z.string().regex(/^\+[1-9][0-9]{7,14}$/),
      ]),
      whatsappPhone: z.union([
        z.literal(""),
        z.string().regex(/^\+[1-9][0-9]{7,14}$/),
      ]),
      websiteUrl: safeExternalUrlSchema,
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=venue"));
  const { supabase, user } = await requireBusinessAccess(locale);
  const { data: currentVenue } = await supabase
    .from("venues")
    .select("description_es,description_en")
    .eq("id", parsed.data.venueId)
    .maybeSingle();
  if (!currentVenue) redirect(destination(locale, venueId, "error=venue"));

  let localizedDescription;
  try {
    localizedDescription = (
      await translateSubmittedLocalizedFields(
        locale,
        { description: parsed.data.description },
        user.id,
        {
          description: {
            es: currentVenue.description_es || "",
            en: currentVenue.description_en || "",
          },
        },
      )
    ).description;
  } catch {
    redirect(destination(locale, venueId, "error=translation"));
  }
  if (parsed.data.addressSelection === "selected") {
    if (
      !parsed.data.locality ||
      !parsed.data.province ||
      parsed.data.latitude === "" ||
      parsed.data.longitude === ""
    ) {
      redirect(destination(locale, venueId, "error=venue"));
    }
    const { error: locationError } = await supabase.rpc(
      "update_venue_location_in_spain",
      {
        p_venue: parsed.data.venueId,
        p_locality_name: parsed.data.locality,
        p_province_name: parsed.data.province,
        p_address: parsed.data.address,
        p_latitude: parsed.data.latitude,
        p_longitude: parsed.data.longitude,
      },
    );
    if (locationError) redirect(destination(locale, venueId, "error=venue"));
  }
  const { error } = await supabase
    .from("venues")
    .update({
      name: parsed.data.name,
      description_es: localizedDescription.es,
      description_en: localizedDescription.en,
      accessibility: { step_free: parsed.data.accessible === "on" },
      contact_phone: parsed.data.contactPhone || null,
      whatsapp_phone: parsed.data.whatsappPhone || null,
      website_url: parsed.data.websiteUrl || null,
      status: "pending",
    })
    .eq("id", parsed.data.venueId);
  if (error) redirect(destination(locale, venueId, "error=venue"));
  await reviewPendingCatalogueItem({
    targetType: "venue",
    targetId: parsed.data.venueId,
    requesterId: user.id,
  });
  revalidatePath(destination(locale, venueId, ""));
  redirect(destination(locale, venueId, "updated=venue"));
}

export async function updateEvent(formData: FormData) {
  const parsed = context
    .extend({
      eventId: z.string().uuid(),
      title: z.string().trim().min(3).max(160),
      description: z.string().trim().min(20).max(4000),
      priceEuros: z.coerce.number().min(0).max(10000),
      priceDisplayMode: z.enum(["show", "hide"]).default("show"),
      coverMediaId: z.union([z.string().uuid(), z.literal("")]).default(""),
      bookingUrl: safeExternalUrlSchema,
      minimumAge: z.union([
        z.literal(""),
        z.coerce.number().int().min(0).max(99),
      ]),
      accessibilityNotes: z.string().trim().max(1000),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=event"));
  const { supabase, user } = await requireBusinessAccess(locale);
  const v = parsed.data;
  const { data: currentEvent } = await supabase
    .from("events")
    .select(
      "title_es,title_en,description_es,description_en,accessibility_notes_es,accessibility_notes_en",
    )
    .eq("id", v.eventId)
    .eq("venue_id", v.venueId)
    .maybeSingle();
  if (!currentEvent) redirect(destination(locale, venueId, "error=event"));

  let localized;
  try {
    localized = await translateSubmittedLocalizedFields(
      locale,
      {
        title: v.title,
        description: v.description,
        accessibilityNotes: v.accessibilityNotes,
      },
      user.id,
      {
        title: {
          es: currentEvent.title_es || "",
          en: currentEvent.title_en || "",
        },
        description: {
          es: currentEvent.description_es || "",
          en: currentEvent.description_en || "",
        },
        accessibilityNotes: {
          es: currentEvent.accessibility_notes_es || "",
          en: currentEvent.accessibility_notes_en || "",
        },
      },
    );
  } catch {
    redirect(destination(locale, venueId, "error=translation"));
  }
  const { error } = await supabase
    .from("events")
    .update({
      title_es: localized.title.es,
      title_en: localized.title.en,
      description_es: localized.description.es,
      description_en: localized.description.en,
      price_cents: Math.round(v.priceEuros * 100),
      price_display_mode: v.priceDisplayMode,
      booking_url: v.bookingUrl || null,
      minimum_age: v.minimumAge === "" ? null : v.minimumAge,
      accessibility_notes_es: localized.accessibilityNotes.es || null,
      accessibility_notes_en: localized.accessibilityNotes.en || null,
      status: "pending",
    })
    .eq("id", v.eventId)
    .eq("venue_id", v.venueId);
  if (error) redirect(destination(locale, venueId, "error=event"));

  const galleryMediaIds = formData
    .getAll("galleryMediaId")
    .map(String)
    .filter((value) => /^[0-9a-f-]{36}$/i.test(value))
    .slice(0, 8);
  const selectedMediaIds = [
    ...(v.coverMediaId ? [v.coverMediaId] : []),
    ...galleryMediaIds,
  ];
  const { data: allowedRows } = selectedMediaIds.length
    ? await supabase
        .from("venue_media")
        .select("id")
        .eq("venue_id", v.venueId)
        .in("id", selectedMediaIds)
    : { data: [] };
  const allowed = new Set((allowedRows || []).map((item) => item.id));

  await supabase
    .from("venue_media_placements")
    .delete()
    .eq("venue_id", v.venueId)
    .eq("target_key", v.eventId)
    .in("placement", ["event_cover", "event_gallery"]);

  if (v.coverMediaId && allowed.has(v.coverMediaId)) {
    await supabase.from("venue_media_placements").insert({
      venue_id: v.venueId,
      media_id: v.coverMediaId,
      placement: "event_cover",
      target_key: v.eventId,
      sort_order: 0,
      created_by: user.id,
    });
  }
  const galleryRows = galleryMediaIds
    .filter((id) => allowed.has(id))
    .map((id, index) => ({
      venue_id: v.venueId,
      media_id: id,
      placement: "event_gallery",
      target_key: v.eventId,
      sort_order: index,
      created_by: user.id,
    }));
  if (galleryRows.length) {
    await supabase.from("venue_media_placements").insert(galleryRows);
  }

  await reviewPendingCatalogueItem({
    targetType: "event",
    targetId: v.eventId,
    requesterId: user.id,
  });
  redirect(destination(locale, venueId, "updated=event"));
}

export async function publishEvent(formData: FormData) {
  const parsed = context
    .extend({
      eventId: z.string().uuid(),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=publish-event"));

  const { supabase, user } = await requireBusinessAccess(locale);
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,status")
    .eq("id", parsed.data.eventId)
    .eq("venue_id", parsed.data.venueId)
    .maybeSingle();

  if (eventError || !event)
    redirect(destination(locale, venueId, "error=publish-event"));

  if (event.status !== "published") {
    const { error } = await supabase
      .from("events")
      .update({ status: "pending" })
      .eq("id", parsed.data.eventId)
      .eq("venue_id", parsed.data.venueId);
    if (error) redirect(destination(locale, venueId, "error=publish-event"));

    await reviewPendingCatalogueItem({
      targetType: "event",
      targetId: parsed.data.eventId,
      requesterId: user.id,
    });
  }

  redirect(destination(locale, venueId, "updated=publish-event"));
}

export async function updateOccurrenceStatus(formData: FormData) {
  const parsed = context
    .extend({
      eventId: z.string().uuid(),
      occurrenceId: z.string().uuid(),
      status: z.enum(["scheduled", "cancelled", "postponed", "sold_out"]),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "error=occurrence-status"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase
    .from("event_occurrences")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.occurrenceId)
    .eq("event_id", parsed.data.eventId);
  if (error) redirect(destination(locale, venueId, "error=occurrence-status"));
  redirect(destination(locale, venueId, "updated=occurrence-status"));
}

export async function updateOccurrence(formData: FormData) {
  const parsed = context
    .extend({
      eventId: z.string().uuid(),
      occurrenceId: z.string().uuid(),
      startsAt: madridLocalDateTimeSchema,
      endsAt: madridLocalDateTimeSchema,
      status: z.enum(["scheduled", "cancelled", "postponed", "sold_out"]),
      bookingUrl: safeExternalUrlSchema,
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
    redirect(destination(locale, venueId, "error=occurrence"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase
    .from("event_occurrences")
    .update({
      starts_at: parsed.data.startsAt.toISOString(),
      ends_at: parsed.data.endsAt.toISOString(),
      status: parsed.data.status,
      booking_url: parsed.data.bookingUrl || null,
    })
    .eq("id", parsed.data.occurrenceId)
    .eq("event_id", parsed.data.eventId);
  if (error) redirect(destination(locale, venueId, "error=occurrence"));
  redirect(destination(locale, venueId, "updated=occurrence"));
}

export async function addOccurrence(formData: FormData) {
  const parsed = context
    .extend({
      eventId: z.string().uuid(),
      startsAt: madridLocalDateTimeSchema,
      endsAt: madridLocalDateTimeSchema,
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "error=occurrence"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("add_owned_event_occurrence", {
    p_event: parsed.data.eventId,
    p_starts: parsed.data.startsAt.toISOString(),
    p_ends: parsed.data.endsAt.toISOString(),
  });
  if (error) redirect(destination(locale, venueId, "error=occurrence"));
  redirect(destination(locale, venueId, "updated=occurrence"));
}

export async function setRecurrence(formData: FormData) {
  const parsed = context
    .extend({
      eventId: z.string().uuid(),
      startsAt: madridLocalDateTimeSchema,
      endsAt: madridLocalDateTimeSchema,
      frequency: z.enum(["daily", "weekly"]),
      interval: z.coerce.number().int().min(1).max(12),
      occurrences: z.coerce.number().int().min(2).max(52),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
    redirect(destination(locale, venueId, "error=recurrence"));
  const { supabase } = await requireBusinessAccess(locale);
  const value = parsed.data;
  const { error } = await supabase.rpc("set_owned_event_recurrence", {
    p_event: value.eventId,
    p_starts: value.startsAt.toISOString(),
    p_ends: value.endsAt.toISOString(),
    p_frequency: value.frequency,
    p_interval: value.interval,
    p_occurrences: value.occurrences,
  });
  if (error) redirect(destination(locale, venueId, "error=recurrence"));
  redirect(destination(locale, venueId, "updated=recurrence"));
}

export async function duplicateEvent(formData: FormData) {
  const parsed = context
    .extend({
      eventId: z.string().uuid(),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "error=duplicate"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("duplicate_owned_event", {
    p_event: parsed.data.eventId,
    p_slug: parsed.data.slug,
  });
  if (error) redirect(destination(locale, venueId, "error=duplicate"));
  redirect(destination(locale, venueId, "updated=duplicate"));
}

export async function saveOffer(formData: FormData) {
  const parsed = context
    .extend({
      title: z.string().trim().min(3).max(160),
      terms: z.string().trim().min(10).max(2000),
      audience: z.enum(["public", "premium"]),
      startsAt: madridLocalDateTimeSchema,
      endsAt: madridLocalDateTimeSchema,
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
    redirect(destination(locale, venueId, "error=offer"));
  const { supabase, user } = await requireBusinessAccess(locale);
  const v = parsed.data;
  let localized;
  try {
    localized = await translateLocalizedFields(
      locale,
      { title: v.title, terms: v.terms },
      user.id,
    );
  } catch {
    redirect(destination(locale, venueId, "error=translation"));
  }
  const { error } = await supabase.from("offers").insert({
    id: crypto.randomUUID(),
    venue_id: v.venueId,
    title_es: localized.title.es,
    title_en: localized.title.en,
    terms_es: localized.terms.es,
    terms_en: localized.terms.en,
    audience: v.audience,
    starts_at: v.startsAt.toISOString(),
    ends_at: v.endsAt.toISOString(),
    status: "pending",
  });
  if (error) redirect(destination(locale, venueId, "error=offer"));
  redirect(destination(locale, venueId, "updated=offer"));
}

export async function addTeamMember(formData: FormData) {
  const parsed = context
    .extend({
      email: z.string().trim().email().max(254),
      role: z.enum(["editor", "manager"]),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=member"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("add_venue_member_by_email", {
    p_venue: parsed.data.venueId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error) redirect(destination(locale, venueId, "error=member"));
  redirect(destination(locale, venueId, "updated=member"));
}

export async function uploadVenueImage(formData: FormData) {
  const parsed = context
    .extend({
      alt: z.string().trim().min(3).max(300),
      sortOrder: z.coerce.number().int().min(0).max(10000),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  const file = formData.get("image");
  if (
    !parsed.success ||
    !(file instanceof File) ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size < 1 ||
    file.size > 10 * 1024 * 1024
  )
    redirect(destination(locale, venueId, "error=media"));
  const { supabase, user } = await requireBusinessAccess(locale);
  let localizedAlt;
  try {
    localizedAlt = (
      await translateLocalizedFields(locale, { alt: parsed.data.alt }, user.id)
    ).alt;
  } catch {
    redirect(destination(locale, venueId, "error=translation"));
  }
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${parsed.data.venueId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("event-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) redirect(destination(locale, venueId, "error=media"));
  const { error } = await supabase.from("venue_media").insert({
    venue_id: parsed.data.venueId,
    storage_path: path,
    alt_es: localizedAlt.es,
    alt_en: localizedAlt.en,
    sort_order: parsed.data.sortOrder,
    mime_type: file.type,
    size_bytes: file.size,
    created_by: user.id,
  });
  if (error) {
    await supabase.storage.from("event-media").remove([path]);
    redirect(destination(locale, venueId, "error=media"));
  }
  redirect(destination(locale, venueId, "updated=media"));
}

export async function updateVenueImageMetadata(formData: FormData) {
  const parsed = context
    .extend({
      mediaId: z.string().uuid(),
      alt: z.string().trim().min(3).max(300),
      sortOrder: z.coerce.number().int().min(0).max(10000),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=media"));
  const { supabase, user } = await requireBusinessAccess(locale);
  const { data: currentMedia } = await supabase
    .from("venue_media")
    .select("alt_es,alt_en")
    .eq("id", parsed.data.mediaId)
    .eq("venue_id", parsed.data.venueId)
    .maybeSingle();
  if (!currentMedia) redirect(destination(locale, venueId, "error=media"));

  let localizedAlt;
  try {
    localizedAlt = (
      await translateSubmittedLocalizedFields(
        locale,
        { alt: parsed.data.alt },
        user.id,
        {
          alt: {
            es: currentMedia.alt_es || "",
            en: currentMedia.alt_en || "",
          },
        },
      )
    ).alt;
  } catch {
    redirect(destination(locale, venueId, "error=translation"));
  }
  const { error } = await supabase
    .from("venue_media")
    .update({
      alt_es: localizedAlt.es,
      alt_en: localizedAlt.en,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", parsed.data.mediaId)
    .eq("venue_id", parsed.data.venueId);
  if (error) redirect(destination(locale, venueId, "error=media"));
  redirect(destination(locale, venueId, "updated=media-metadata"));
}

export async function removeVenueImage(formData: FormData) {
  const parsed = context
    .extend({ mediaId: z.string().uuid() })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=media"));
  const { supabase } = await requireBusinessAccess(locale);
  const { data: media } = await supabase
    .from("venue_media")
    .select("storage_path")
    .eq("id", parsed.data.mediaId)
    .eq("venue_id", parsed.data.venueId)
    .maybeSingle();
  if (!media) redirect(destination(locale, venueId, "error=media"));
  const { error: storageError } = await supabase.storage
    .from("event-media")
    .remove([media.storage_path]);
  if (storageError) redirect(destination(locale, venueId, "error=media"));
  const { error: rowError } = await supabase
    .from("venue_media")
    .delete()
    .eq("id", parsed.data.mediaId)
    .eq("venue_id", parsed.data.venueId);
  if (rowError) redirect(destination(locale, venueId, "error=media"));
  redirect(destination(locale, venueId, "updated=media-removed"));
}

const deletionSchema = context.extend({
  confirmation: z.literal("DELETE"),
  reason: z.string().trim().min(10).max(2000),
});

const unclaimSchema = context.extend({
  confirmation: z.literal("UNCLAIM"),
  reason: z.string().trim().min(10).max(2000),
});

export async function unclaimVenue(formData: FormData) {
  const parsed = unclaimSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=unclaim"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("unclaim_owned_venue", {
    p_venue: parsed.data.venueId,
    p_confirmation: parsed.data.confirmation,
    p_reason: parsed.data.reason,
  });
  if (error) redirect(destination(locale, venueId, "error=unclaim"));
  revalidatePath(`/${locale}/business`);
  redirect(`/${locale}/business?updated=venue-unclaimed`);
}

export async function deleteEvent(formData: FormData) {
  const parsed = deletionSchema
    .extend({ eventId: z.string().uuid() })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "error=event-delete"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("delete_owned_event", {
    p_event: parsed.data.eventId,
    p_confirmation: parsed.data.confirmation,
    p_reason: parsed.data.reason,
  });
  if (error) redirect(destination(locale, venueId, "error=event-delete"));
  redirect(destination(locale, venueId, "updated=event-deleted"));
}

export async function deleteVenue(formData: FormData) {
  const parsed = deletionSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "error=venue-delete"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("delete_owned_venue", {
    p_venue: parsed.data.venueId,
    p_confirmation: parsed.data.confirmation,
    p_reason: parsed.data.reason,
  });
  if (error) redirect(destination(locale, venueId, "error=venue-delete"));
  redirect(`/${locale}/business?updated=venue-deleted`);
}

export async function createStampCard(formData: FormData) {
  const parsed = context
    .extend({
      title: z.string().trim().min(3).max(160),
      reward: z.string().trim().min(3).max(500),
      stampsRequired: z.coerce.number().int().min(2).max(50),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=stamp"));
  const { supabase, user } = await requireBusinessAccess(locale);
  let localized;
  try {
    localized = await translateLocalizedFields(
      locale,
      { title: parsed.data.title, reward: parsed.data.reward },
      user.id,
    );
  } catch {
    redirect(destination(locale, venueId, "error=translation"));
  }
  const { error } = await supabase.from("loyalty_programs").insert({
    venue_id: parsed.data.venueId,
    title_es: localized.title.es,
    title_en: localized.title.en,
    reward_es: localized.reward.es,
    reward_en: localized.reward.en,
    stamps_required: parsed.data.stampsRequired,
    active: true,
  });
  redirect(
    destination(locale, venueId, error ? "error=stamp" : "updated=stamp"),
  );
}

export async function createBusinessReward(formData: FormData) {
  const parsed = context
    .extend({
      title: z.string().trim().min(3).max(160),
      description: z.string().trim().min(3).max(1000),
      claimWindowDays: z.coerce.number().int().min(1).max(365),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=reward"));
  const { supabase, user } = await requireBusinessAccess(locale);
  let localized;
  try {
    localized = await translateLocalizedFields(
      locale,
      { title: parsed.data.title, description: parsed.data.description },
      user.id,
    );
  } catch {
    redirect(destination(locale, venueId, "error=translation"));
  }
  const { error } = await supabase.from("business_rewards").insert({
    venue_id: parsed.data.venueId,
    title_es: localized.title.es,
    title_en: localized.title.en,
    description_es: localized.description.es,
    description_en: localized.description.en,
    claim_window_days: parsed.data.claimWindowDays,
    active: true,
  });
  redirect(
    destination(locale, venueId, error ? "error=reward" : "updated=reward"),
  );
}

export async function assignReward(formData: FormData) {
  const parsed = context
    .extend({
      rewardId: z.string().uuid(),
      targetType: z.enum(["stamp", "passport"]),
      targetId: z.string().uuid(),
      accessTier: z.enum(["free", "premium"]).default("free"),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "error=assignment"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } =
    parsed.data.targetType === "stamp"
      ? await supabase.from("loyalty_program_rewards").upsert({
          program_id: parsed.data.targetId,
          reward_id: parsed.data.rewardId,
        })
      : await supabase.from("passport_rewards").upsert({
          passport_id: parsed.data.targetId,
          reward_id: parsed.data.rewardId,
          access_tier: parsed.data.accessTier,
        });
  redirect(
    destination(
      locale,
      venueId,
      error ? "error=assignment" : "updated=assignment",
    ),
  );
}

export async function createCheckInCredential(formData: FormData) {
  const parsed = context
    .extend({ label: z.string().trim().min(2).max(80) })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "error=credential"));
  const { supabase, user } = await requireBusinessAccess(locale);
  const { error } = await supabase.from("venue_checkin_credentials").insert({
    venue_id: parsed.data.venueId,
    label: parsed.data.label,
    created_by: user.id,
  });
  redirect(
    destination(
      locale,
      venueId,
      error ? "error=credential" : "updated=credential",
    ),
  );
}

export async function redeemRewardClaim(formData: FormData) {
  const parsed = context
    .extend({ claimCode: z.string().uuid() })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "error=redemption"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("redeem_reward_claim", {
    p_code: parsed.data.claimCode,
  });
  redirect(
    destination(
      locale,
      venueId,
      error ? "error=redemption" : "updated=redemption",
    ),
  );
}

export async function saveBookingSettings(formData: FormData) {
  const parsed = context
    .extend({
      mode: z.enum(["external", "request", "disabled"]),
      requiresDeposit: z.string().optional(),
      depositEuros: z.union([
        z.literal(""),
        z.coerce.number().min(0).max(10000),
      ]),
      instructions: z.string().trim().max(1000),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=booking"));
  const { supabase, user } = await requireBusinessAccess(locale);
  let localizedInstructions = { es: "", en: "" };
  if (parsed.data.instructions) {
    try {
      localizedInstructions = (
        await translateLocalizedFields(
          locale,
          { instructions: parsed.data.instructions },
          user.id,
        )
      ).instructions;
    } catch {
      redirect(destination(locale, venueId, "error=translation"));
    }
  }
  const { error } = await supabase.from("venue_booking_settings").upsert({
    venue_id: parsed.data.venueId,
    mode: parsed.data.mode,
    requires_deposit: parsed.data.requiresDeposit === "on",
    deposit_cents:
      parsed.data.depositEuros === ""
        ? null
        : Math.round(parsed.data.depositEuros * 100),
    instructions_es: localizedInstructions.es || null,
    instructions_en: localizedInstructions.en || null,
    active: parsed.data.mode !== "disabled",
  });
  redirect(
    destination(locale, venueId, error ? "error=booking" : "updated=booking"),
  );
}

export async function createBookingSlot(formData: FormData) {
  const parsed = context
    .extend({
      startsAt: madridLocalDateTimeSchema,
      endsAt: madridLocalDateTimeSchema,
      capacity: z.coerce.number().int().min(1).max(10000),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
    redirect(destination(locale, venueId, "error=booking-slot"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.from("venue_availability_slots").insert({
    venue_id: parsed.data.venueId,
    starts_at: parsed.data.startsAt.toISOString(),
    ends_at: parsed.data.endsAt.toISOString(),
    capacity: parsed.data.capacity,
  });
  redirect(
    destination(
      locale,
      venueId,
      error ? "error=booking-slot" : "updated=booking-slot",
    ),
  );
}

export async function updateBookingRequest(formData: FormData) {
  const parsed = context
    .extend({
      requestId: z.string().uuid(),
      status: z.enum(["confirmed", "declined", "completed"]),
    })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "error=booking-request"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase
    .from("booking_requests")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId)
    .eq("venue_id", parsed.data.venueId);
  redirect(
    destination(
      locale,
      venueId,
      error ? "error=booking-request" : "updated=booking-request",
    ),
  );
}


const catalogueSaveSchema = context.extend({
  expectedRevision: z.coerce.number().int().min(0),
  document: z.string().min(2).max(400000),
  publish: z.enum(["0", "1"]).default("0"),
});

export async function saveVenueCatalogue(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  const parsed = catalogueSaveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(destination(locale, venueId, "section=catalogue&error=catalogue"));

  let document: unknown;
  try {
    document = JSON.parse(parsed.data.document);
  } catch {
    redirect(destination(locale, venueId, "section=catalogue&error=catalogue"));
  }

  const { supabase, user } = await requireBusinessAccess(locale);

  try {
    document = await translateVenueCatalogueDocument(
      locale,
      document as VenueCatalogueDocument,
      user.id,
    );
  } catch {
    redirect(
      destination(locale, venueId, "section=catalogue&error=translation"),
    );
  }

  const { error } = await supabase.rpc("save_venue_catalogue", {
    p_venue: parsed.data.venueId,
    p_expected_revision: parsed.data.expectedRevision,
    p_document: document,
    p_publish: parsed.data.publish === "1",
  });
  if (error) {
    const code =
      error.message?.includes("ALLERGEN_REVIEW_REQUIRED")
        ? "allergens"
        : "catalogue";
    redirect(destination(locale, venueId, `section=catalogue&error=${code}`));
  }
  revalidatePath(`/${locale}/venues`, "layout");
  redirect(
    destination(
      locale,
      venueId,
      `section=catalogue&updated=${parsed.data.publish === "1" ? "catalogue-published" : "catalogue"}`,
    ),
  );
}

export async function unpublishVenueCatalogue(formData: FormData) {
  const parsed = context
    .extend({ expectedRevision: z.coerce.number().int().min(0) })
    .safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success)
    redirect(destination(locale, venueId, "section=catalogue&error=catalogue"));
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("unpublish_venue_catalogue", {
    p_venue: parsed.data.venueId,
    p_expected_revision: parsed.data.expectedRevision,
  });
  if (error)
    redirect(destination(locale, venueId, "section=catalogue&error=catalogue"));
  revalidatePath(`/${locale}/venues`, "layout");
  redirect(destination(locale, venueId, "section=catalogue&updated=catalogue"));
}


const venueMediaPlacementSchema = context.extend({
  mediaId: z.string().uuid(),
  placement: z.enum(["venue_logo", "venue_cover"]),
});

export async function setVenueMediaPlacement(formData: FormData) {
  const parsed = venueMediaPlacementSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=media"));

  const { supabase, user } = await requireBusinessAccess(locale);
  const { data: media } = await supabase
    .from("venue_media")
    .select("id")
    .eq("id", parsed.data.mediaId)
    .eq("venue_id", parsed.data.venueId)
    .maybeSingle();
  if (!media) redirect(destination(locale, venueId, "error=media"));

  await supabase
    .from("venue_media_placements")
    .delete()
    .eq("venue_id", parsed.data.venueId)
    .eq("placement", parsed.data.placement)
    .eq("target_key", "");

  const { error } = await supabase.from("venue_media_placements").insert({
    venue_id: parsed.data.venueId,
    media_id: parsed.data.mediaId,
    placement: parsed.data.placement,
    target_key: "",
    sort_order: 0,
    created_by: user.id,
  });

  if (error) redirect(destination(locale, venueId, "error=media"));
  revalidatePath(`/${locale}/venues`, "layout");
  redirect(destination(locale, venueId, "section=profile&updated=media-placement"));
}

const clearVenueMediaPlacementSchema = context.extend({
  placement: z.enum(["venue_logo", "venue_cover"]),
});

export async function clearVenueMediaPlacement(formData: FormData) {
  const parsed = clearVenueMediaPlacementSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  if (!parsed.success) redirect(destination(locale, venueId, "error=media"));

  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase
    .from("venue_media_placements")
    .delete()
    .eq("venue_id", parsed.data.venueId)
    .eq("placement", parsed.data.placement)
    .eq("target_key", "");

  if (error) redirect(destination(locale, venueId, "error=media"));
  revalidatePath(`/${locale}/venues`, "layout");
  redirect(destination(locale, venueId, "section=profile&updated=media-placement"));
}
