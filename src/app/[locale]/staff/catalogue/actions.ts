"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { safeExternalUrlSchema } from "@/lib/auth-security";

const contentStatus = z.enum([
  "draft",
  "pending",
  "published",
  "rejected",
  "archived",
]);

const venueSchema = z.object({
  locale: z.enum(["es", "en"]),
  venueId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  descriptionEs: z.string().trim().min(20).max(2000),
  descriptionEn: z.string().trim().max(2000),
  address: z.string().trim().min(5).max(300),
  addressSelection: z.enum(["selected", "unchanged"]),
  locality: z.string().trim().max(120),
  province: z.string().trim().max(120),
  latitude: z.union([z.literal(""), z.coerce.number().min(27).max(44.5)]),
  longitude: z.union([z.literal(""), z.coerce.number().min(-19).max(5)]),
  status: contentStatus,
  reason: z.string().trim().min(10).max(2000),
});

function venueDestination(locale: string, venueId: string, result: string) {
  return `/${locale}/staff/catalogue/venues/${venueId}?${result}`;
}

export async function operatorUpdateVenue(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  const parsed = venueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(venueDestination(locale, venueId, "error=venue"));
  const { supabase } = await requireUser(
    locale,
    `/${locale}/staff/catalogue/venues/${venueId}`,
  );
  if (parsed.data.addressSelection === "selected") {
    if (
      !parsed.data.locality ||
      !parsed.data.province ||
      parsed.data.latitude === "" ||
      parsed.data.longitude === ""
    ) {
      redirect(venueDestination(locale, venueId, "error=venue"));
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
    if (locationError)
      redirect(venueDestination(locale, venueId, "error=venue"));
  }
  const { error } = await supabase.rpc("operator_update_venue", {
    p_venue: parsed.data.venueId,
    p_name: parsed.data.name,
    p_description_es: parsed.data.descriptionEs,
    p_description_en: parsed.data.descriptionEn,
    p_address: parsed.data.address,
    p_status: parsed.data.status,
    p_verified: formData.get("verified") === "on",
    p_reason: parsed.data.reason,
  });
  if (error) redirect(venueDestination(locale, venueId, "error=venue"));
  redirect(venueDestination(locale, venueId, "updated=venue"));
}

const eventSchema = z.object({
  locale: z.enum(["es", "en"]),
  venueId: z.string().uuid(),
  eventId: z.string().uuid(),
  titleEs: z.string().trim().min(3).max(160),
  titleEn: z.string().trim().max(160),
  descriptionEs: z.string().trim().min(20).max(4000),
  descriptionEn: z.string().trim().max(4000),
  priceCents: z.coerce.number().int().min(0).max(1000000),
  bookingUrl: safeExternalUrlSchema,
  status: contentStatus,
  reason: z.string().trim().min(10).max(2000),
});

export async function operatorUpdateEvent(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(venueDestination(locale, venueId, "error=event"));
  const { supabase } = await requireUser(
    locale,
    `/${locale}/staff/catalogue/venues/${venueId}`,
  );
  const { error } = await supabase.rpc("operator_update_event", {
    p_event: parsed.data.eventId,
    p_title_es: parsed.data.titleEs,
    p_title_en: parsed.data.titleEn,
    p_description_es: parsed.data.descriptionEs,
    p_description_en: parsed.data.descriptionEn,
    p_price_cents: parsed.data.priceCents,
    p_booking_url: parsed.data.bookingUrl,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason,
  });
  if (error) redirect(venueDestination(locale, venueId, "error=event"));
  redirect(venueDestination(locale, venueId, "updated=event"));
}

const deletionSchema = z.object({
  locale: z.enum(["es", "en"]),
  venueId: z.string().uuid(),
  targetType: z.enum(["venue", "event"]),
  targetId: z.string().uuid(),
  confirmation: z.literal("DELETE"),
  reason: z.string().trim().min(10).max(2000),
});

export async function operatorDeleteCatalogueItem(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const venueId = String(formData.get("venueId") || "");
  const parsed = deletionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(venueDestination(locale, venueId, "error=delete"));
  const { supabase } = await requireUser(
    locale,
    `/${locale}/staff/catalogue/venues/${venueId}`,
  );
  const { error } = await supabase.rpc("operator_delete_catalogue_item", {
    p_target_type: parsed.data.targetType,
    p_target_id: parsed.data.targetId,
    p_confirmation: parsed.data.confirmation,
    p_reason: parsed.data.reason,
  });
  if (error) redirect(venueDestination(locale, venueId, "error=delete"));
  if (parsed.data.targetType === "venue")
    redirect(`/${locale}/staff/catalogue?kind=venues&updated=deleted`);
  redirect(venueDestination(locale, venueId, "updated=event-deleted"));
}

const applicationReviewSchema = z.object({
  locale: z.enum(["es", "en"]),
  applicationId: z.string().uuid(),
  applicantId: z.string().uuid(),
  state: z.enum(["under_review", "awaiting_payment", "rejected"]),
  grantKind: z.enum(["none", "trial_1_month", "trial_3_month", "waived"]),
  reason: z.string().trim().min(10).max(2000),
});

export async function reviewBusinessApplication(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = applicationReviewSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success)
    redirect(`/${locale}/staff/catalogue?kind=applications&error=application`);
  const { supabase } = await requireUser(locale, `/${locale}/staff/catalogue`);
  const { error } =
    parsed.data.grantKind === "none"
      ? await supabase.rpc("review_business_application", {
          p_application: parsed.data.applicationId,
          p_state: parsed.data.state,
          p_reason: parsed.data.reason,
        })
      : await supabase.rpc("grant_staff_billing_access", {
          p_profile: parsed.data.applicantId,
          p_plan: "business",
          p_grant_kind: parsed.data.grantKind,
          p_reason: parsed.data.reason,
          p_application: parsed.data.applicationId,
        });
  if (error)
    redirect(`/${locale}/staff/catalogue?kind=applications&error=application`);
  redirect(`/${locale}/staff/catalogue?kind=applications&updated=application`);
}
