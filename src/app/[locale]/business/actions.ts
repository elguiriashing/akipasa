"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { requireBusinessAccess } from "@/lib/entitlements";
import { safeExternalUrlSchema } from "@/lib/auth-security";
import { madridLocalDateTimeSchema } from "@/lib/time";
import { createEventSlug, createVenueSlug } from "@/lib/business";

const businessApplicationSchema = z.object({
  locale: z.enum(["es", "en"]),
  businessName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  locality: z.string().trim().min(2).max(120),
  websiteUrl: safeExternalUrlSchema,
  message: z.string().trim().min(20).max(2000),
});

export async function submitBusinessApplication(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = businessApplicationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) redirect(`/${locale}/business/apply?error=validation`);
  const { supabase } = await requireUser(locale);
  const { error } = await supabase.rpc("submit_business_application", {
    p_business_name: parsed.data.businessName,
    p_contact_name: parsed.data.contactName,
    p_locality: parsed.data.locality,
    p_website_url: parsed.data.websiteUrl,
    p_message: parsed.data.message,
  });
  if (error) redirect(`/${locale}/business/apply?error=application`);
  redirect(`/${locale}/business/apply?submitted=1`);
}

const venueSchema = z.object({
  locale: z.string(),
  locality: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().max(20),
  addressSelection: z.literal("selected"),
  addressProviderId: z.string().trim().min(1).max(160),
  name: z.string().trim().min(2).max(120),
  descriptionEs: z.string().trim().min(20).max(2000),
  descriptionEn: z.string().trim().max(2000),
  address: z.string().trim().min(5).max(300),
  latitude: z.coerce.number().min(27).max(44.5),
  longitude: z.coerce.number().min(-19).max(5),
});

export async function createVenue(formData: FormData) {
  const parsed = venueSchema.safeParse(Object.fromEntries(formData));
  const locale = isLocale(String(formData.get("locale")))
    ? (String(formData.get("locale")) as "es" | "en")
    : "es";
  if (!parsed.success) redirect(`/${locale}/business?error=venue`);
  const { supabase } = await requireBusinessAccess(locale);
  const v = parsed.data;
  const { error } = await supabase.rpc("create_owned_venue_in_spain", {
    locality_name: v.locality,
    province_name: v.province,
    venue_name: v.name,
    venue_slug: createVenueSlug(v.name),
    description_es: v.descriptionEs,
    description_en: v.descriptionEn,
    venue_address: v.address,
    latitude: v.latitude,
    longitude: v.longitude,
  });
  if (error) redirect(`/${locale}/business?error=venue`);
  redirect(`/${locale}/business?created=venue`);
}

const claimSchema = z.object({
  locale: z.string(),
  venueId: z.string().uuid(),
  evidence: z.string().trim().min(20).max(2000),
});
export async function submitVenueClaim(formData: FormData) {
  const parsed = claimSchema.safeParse(Object.fromEntries(formData));
  const locale = isLocale(String(formData.get("locale")))
    ? (String(formData.get("locale")) as "es" | "en")
    : "es";
  if (!parsed.success) redirect(`/${locale}/business?error=claim`);
  const { supabase, user } = await requireBusinessAccess(locale);
  const { error } = await supabase.from("venue_claims").insert({
    venue_id: parsed.data.venueId,
    claimant_id: user.id,
    evidence: parsed.data.evidence,
  });
  if (error) redirect(`/${locale}/business?error=claim`);
  redirect(`/${locale}/business?created=claim`);
}

const eventSchema = z.object({
  locale: z.string(),
  venueId: z.string().uuid(),
  categoryId: z.string().uuid(),
  titleEs: z.string().trim().min(3).max(160),
  titleEn: z.string().trim().max(160),
  descriptionEs: z.string().trim().min(20).max(4000),
  descriptionEn: z.string().trim().max(4000),
  priceCents: z.coerce.number().int().min(0).max(1000000),
  bookingUrl: safeExternalUrlSchema,
  startsAt: madridLocalDateTimeSchema,
  endsAt: madridLocalDateTimeSchema,
});
export async function createEvent(formData: FormData) {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  const locale = isLocale(String(formData.get("locale")))
    ? (String(formData.get("locale")) as "es" | "en")
    : "es";
  if (!parsed.success) redirect(`/${locale}/business?error=event`);
  const { supabase } = await requireBusinessAccess(locale);
  const e = parsed.data;
  const { error } = await supabase.rpc("create_event_with_occurrence", {
    target_venue: e.venueId,
    category: e.categoryId,
    event_slug: createEventSlug(e.titleEs),
    title_es: e.titleEs,
    title_en: e.titleEn,
    description_es: e.descriptionEs,
    description_en: e.descriptionEn,
    price_cents: e.priceCents,
    booking_url: e.bookingUrl,
    starts_at: e.startsAt.toISOString(),
    ends_at: e.endsAt.toISOString(),
  });
  if (error) redirect(`/${locale}/business?error=event`);
  redirect(`/${locale}/business?created=event`);
}

const reuseEventSchema = z.object({
  locale: z.enum(["es", "en"]),
  eventId: z.string().uuid(),
  sourceSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function reuseEvent(formData: FormData) {
  const parsed = reuseEventSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success)
    redirect(`/${locale}/business?view=events&error=duplicate`);
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("duplicate_owned_event", {
    p_event: parsed.data.eventId,
    p_slug: `${parsed.data.sourceSlug}-copy-${crypto.randomUUID().slice(0, 8)}`,
  });
  if (error) redirect(`/${locale}/business?view=events&error=duplicate`);
  redirect(`/${locale}/business?view=events&created=duplicate`);
}

const loyaltySchema = z.object({
  locale: z.enum(["es", "en"]),
  venueId: z.string().uuid(),
  titleEs: z.string().trim().min(3).max(160),
  titleEn: z.string().trim().max(160),
  rewardEs: z.string().trim().min(3).max(500),
  rewardEn: z.string().trim().max(500),
  stampsRequired: z.coerce.number().int().min(2).max(50),
});

export async function saveLoyaltyProgram(formData: FormData) {
  const parsed = loyaltySchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/business?error=loyalty`);
  const { supabase } = await requireBusinessAccess(locale);
  const value = parsed.data;
  const { error } = await supabase.from("loyalty_programs").upsert(
    {
      venue_id: value.venueId,
      title_es: value.titleEs,
      title_en: value.titleEn || null,
      reward_es: value.rewardEs,
      reward_en: value.rewardEn || null,
      stamps_required: value.stampsRequired,
      active: true,
    },
    { onConflict: "venue_id" },
  );
  if (error) redirect(`/${locale}/business?error=loyalty`);
  redirect(`/${locale}/business?created=loyalty`);
}

export async function confirmRedemption(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const id = z.string().uuid().safeParse(formData.get("redemptionId"));
  if (!id.success) redirect(`/${locale}/business?error=redemption`);
  const { supabase } = await requireBusinessAccess(locale);
  const { error } = await supabase.rpc("confirm_reward_redemption", {
    p_redemption: id.data,
  });
  if (error) redirect(`/${locale}/business?error=redemption`);
  redirect(`/${locale}/business?created=redemption`);
}

const promotionSchema = z
  .object({
    locale: z.enum(["es", "en"]),
    venueId: z.string().uuid(),
    eventId: z.union([z.string().uuid(), z.literal("")]),
    service: z.enum([
      "featured_listing",
      "social_campaign",
      "content_package",
      "other",
    ]),
    message: z.string().trim().min(20).max(2000),
  })
  .superRefine((value, context) => {
    if (value.service === "featured_listing" && !value.eventId) {
      context.addIssue({
        code: "custom",
        path: ["eventId"],
        message: "A published event is required",
      });
    }
  });

export async function requestPromotion(formData: FormData) {
  const parsed = promotionSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/business?error=promotion`);
  const { supabase, user } = await requireBusinessAccess(locale);
  if (parsed.data.eventId) {
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", parsed.data.eventId)
      .eq("venue_id", parsed.data.venueId)
      .eq("status", "published")
      .maybeSingle();
    if (!event) redirect(`/${locale}/business?error=promotion`);
  }
  const { error } = await supabase.from("promotion_requests").insert({
    venue_id: parsed.data.venueId,
    event_id: parsed.data.eventId || null,
    requester_id: user.id,
    service: parsed.data.service,
    message: parsed.data.message,
  });
  if (error) redirect(`/${locale}/business?error=promotion`);
  redirect(`/${locale}/business?created=promotion`);
}
