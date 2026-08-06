"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { roleChangeSchema } from "@/lib/admin-users";
import { madridLocalDateTimeSchema } from "@/lib/time";

export async function changePlatformRole(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = roleChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/admin/users?error=validation`);
  const { supabase } = await requireUser(locale, `/${locale}/admin/users`);
  const { error } = await supabase.rpc("set_platform_role", {
    target_profile: parsed.data.profileId,
    new_role: parsed.data.role,
    reason: parsed.data.reason,
  });
  if (error)
    redirect(
      `/${locale}/admin/users/${parsed.data.profileId}?error=permission`,
    );
  redirect(`/${locale}/admin/users/${parsed.data.profileId}?updated=role`);
}

const passportSchema = z.object({
  locale: z.enum(["es", "en"]),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleEs: z.string().trim().min(3).max(160),
  titleEn: z.string().trim().max(160),
  descriptionEs: z.string().trim().min(20).max(2000),
  descriptionEn: z.string().trim().max(2000),
  rewardEs: z.string().trim().min(3).max(500),
  rewardEn: z.string().trim().max(500),
  venueId: z.string().uuid(),
  stepEs: z.string().trim().min(3).max(160),
  stepEn: z.string().trim().max(160),
  startsAt: madridLocalDateTimeSchema,
  endsAt: madridLocalDateTimeSchema,
});
export async function createPassport(formData: FormData) {
  const parsed = passportSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
    redirect(`/${locale}/admin/passports?error=passport`);
  const { supabase, user } = await requireUser(locale, `/${locale}/admin`);
  const id = crypto.randomUUID();
  const v = parsed.data;
  const { error } = await supabase.from("passports").insert({
    id,
    slug: v.slug,
    title_es: v.titleEs,
    title_en: v.titleEn || null,
    description_es: v.descriptionEs,
    description_en: v.descriptionEn || null,
    reward_es: v.rewardEs,
    reward_en: v.rewardEn || null,
    starts_at: v.startsAt.toISOString(),
    ends_at: v.endsAt.toISOString(),
    status: "published",
    created_by: user.id,
  });
  if (error) redirect(`/${locale}/admin/passports?error=passport`);
  const { error: stepError } = await supabase.from("passport_steps").insert({
    passport_id: id,
    venue_id: v.venueId,
    label_es: v.stepEs,
    label_en: v.stepEn || null,
  });
  if (stepError) {
    await supabase.from("passports").delete().eq("id", id);
    redirect(`/${locale}/admin/passports?error=passport`);
  }
  redirect(`/${locale}/admin/passports?updated=passport`);
}

const promotionSchema = z.object({
  locale: z.enum(["es", "en"]),
  requestId: z.string().uuid(),
  state: z.enum(["new", "contacted", "qualified", "won", "lost"]),
  notes: z.string().trim().max(2000),
});
export async function updatePromotion(formData: FormData) {
  const parsed = promotionSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/admin/promotions?error=promotion`);
  const { supabase, user } = await requireUser(locale, `/${locale}/admin`);
  const { error } = await supabase
    .from("promotion_requests")
    .update({
      state: parsed.data.state,
      operator_notes: parsed.data.notes || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId);
  if (error) redirect(`/${locale}/admin/promotions?error=promotion`);
  redirect(`/${locale}/admin/promotions?updated=promotion`);
}

const deletionRequestSchema = z.object({
  requestId: z.string().uuid(),
  state: z.enum(["processing", "completed", "cancelled"]),
  reason: z.string().trim().min(10).max(2000),
});

export async function updateDeletionRequest(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = deletionRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/admin/privacy?error=deletion`);
  const { supabase } = await requireUser(locale, `/${locale}/admin`);
  const { error } = await supabase.rpc("update_deletion_request", {
    p_request: parsed.data.requestId,
    p_state: parsed.data.state,
    p_reason: parsed.data.reason,
    p_confirmed_deleted: formData.get("confirmedDeleted") === "on",
  });
  if (error) redirect(`/${locale}/admin/privacy?error=deletion`);
  redirect(`/${locale}/admin/privacy?updated=deletion`);
}

const featureSchema = z.object({
  locale: z.enum(["es", "en"]),
  eventId: z.string().uuid(),
  startsAt: madridLocalDateTimeSchema,
  endsAt: madridLocalDateTimeSchema,
});
export async function createFeatureSlot(formData: FormData) {
  const parsed = featureSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
    redirect(`/${locale}/admin/promotions?error=feature`);
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/promotions`,
  );
  const { error } = await supabase.from("feature_slots").insert({
    event_id: parsed.data.eventId,
    starts_at: parsed.data.startsAt.toISOString(),
    ends_at: parsed.data.endsAt.toISOString(),
    created_by: user.id,
  });
  if (error) redirect(`/${locale}/admin/promotions?error=feature`);
  redirect(`/${locale}/admin/promotions?updated=feature`);
}

const categorySchema = z.object({
  categoryId: z.union([z.string().uuid(), z.literal("")]),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nameEs: z.string().trim().min(2).max(80),
  nameEn: z.string().trim().min(2).max(80),
  reason: z.string().trim().min(10).max(500),
});

export async function saveCategory(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(`/${locale}/admin/catalogue?section=categories&error=category`);
  const { supabase } = await requireUser(locale, `/${locale}/admin`);
  const { error } = await supabase.rpc("upsert_catalog_category", {
    p_category: parsed.data.categoryId || null,
    p_slug: parsed.data.slug,
    p_name_es: parsed.data.nameEs,
    p_name_en: parsed.data.nameEn,
    p_reason: parsed.data.reason,
  });
  if (error)
    redirect(`/${locale}/admin/catalogue?section=categories&error=category`);
  redirect(`/${locale}/admin/catalogue?section=categories&updated=category`);
}

const citySchema = z.object({
  cityId: z.union([z.string().uuid(), z.literal("")]),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  nameEs: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  latitude: z.coerce.number().min(27).max(44.5),
  longitude: z.coerce.number().min(-19).max(5),
  timezone: z.enum(["Europe/Madrid", "Atlantic/Canary"]),
  reason: z.string().trim().min(10).max(500),
});

export async function saveCity(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = citySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(`/${locale}/admin/catalogue?section=cities&error=city`);
  const { supabase } = await requireUser(locale, `/${locale}/admin`);
  const { error } = await supabase.rpc("upsert_catalog_city", {
    p_city: parsed.data.cityId || null,
    p_slug: parsed.data.slug,
    p_name_es: parsed.data.nameEs,
    p_name_en: parsed.data.nameEn,
    p_latitude: parsed.data.latitude,
    p_longitude: parsed.data.longitude,
    p_timezone: parsed.data.timezone,
    p_reason: parsed.data.reason,
  });
  if (error) redirect(`/${locale}/admin/catalogue?section=cities&error=city`);
  redirect(`/${locale}/admin/catalogue?section=cities&updated=city`);
}

const flagSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{2,63}$/),
  reason: z.string().trim().min(10).max(500),
});

export async function updateFeatureFlag(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = flagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/admin/settings?error=flag`);
  const { supabase } = await requireUser(locale, `/${locale}/admin`);
  const { error } = await supabase.rpc("set_feature_flag", {
    p_key: parsed.data.key,
    p_enabled: formData.get("enabled") === "on",
    p_reason: parsed.data.reason,
  });
  if (error) redirect(`/${locale}/admin/settings?error=flag`);
  redirect(`/${locale}/admin/settings?updated=flag`);
}
