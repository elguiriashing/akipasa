"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  locale: z.enum(["es", "en"]),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  displayName: z.string().trim().min(2).max(100),
  headlineEs: z.string().trim().max(180),
  headlineEn: z.string().trim().max(180),
  bioEs: z.string().trim().min(40).max(4000),
  bioEn: z.string().trim().max(4000),
  locality: z.string().trim().max(120),
  province: z.string().trim().max(120),
  avatarUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  coverUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  websiteUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  instagramUrl: z.union([
    z.literal(""),
    z.string().url().startsWith("https://"),
  ]),
  youtubeUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  publish: z.enum(["draft", "published"]),
});
export async function saveCreatorProfile(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const categoryIds = z
    .array(z.string().uuid())
    .max(6)
    .safeParse(formData.getAll("categoryIds"));
  if (!parsed.success || !categoryIds.success)
    redirect(`/${locale}/community/creator?error=validation`);
  const { supabase, user } = await requireUser(locale);
  const v = parsed.data;
  const { error } = await supabase.from("creator_profiles").upsert(
    {
      profile_id: user.id,
      slug: v.slug,
      display_name: v.displayName,
      headline_es: v.headlineEs || null,
      headline_en: v.headlineEn || null,
      bio_es: v.bioEs,
      bio_en: v.bioEn || null,
      locality: v.locality || null,
      province: v.province || null,
      avatar_url: v.avatarUrl || null,
      cover_url: v.coverUrl || null,
      website_url: v.websiteUrl || null,
      instagram_url: v.instagramUrl || null,
      youtube_url: v.youtubeUrl || null,
      state: v.publish,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );
  if (!error) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: v.displayName,
        avatar_url: v.avatarUrl || null,
        banner_url: v.coverUrl || null,
        locality: v.locality || null,
        province: v.province || null,
        website_url: v.websiteUrl || null,
        instagram_url: v.instagramUrl || null,
      })
      .eq("id", user.id);
    if (profileError) redirect(`/${locale}/community/creator?error=profile`);
    const { error: deleteError } = await supabase
      .from("creator_categories")
      .delete()
      .eq("creator_profile_id", user.id);
    if (!deleteError && categoryIds.data.length) {
      const { error: categoryError } = await supabase
        .from("creator_categories")
        .insert(
          categoryIds.data.map((categoryId) => ({
            creator_profile_id: user.id,
            category_id: categoryId,
          })),
        );
      if (categoryError)
        redirect(`/${locale}/community/creator?error=categories`);
    }
  }
  if (error) redirect(`/${locale}/community/creator?error=save`);
  redirect(`/${locale}/community/creator?updated=1`);
}
export async function requestCreatorVerification(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const { supabase, user } = await requireUser(locale);
  const { data: eligibility, error: eligibilityError } = await supabase.rpc(
    "creator_verification_eligibility",
    { p_profile: user.id },
  );
  if (eligibilityError)
    redirect(`/${locale}/community/creator?error=verification`);
  if (!eligibility?.eligible)
    redirect(`/${locale}/community/creator?error=verification-requirements`);
  const { error } = await supabase.rpc("request_creator_verification");
  redirect(
    `/${locale}/community/creator?${error ? "error=verification" : "updated=verification"}`,
  );
}

const creatorReviewSchema = z.object({
  locale: z.enum(["es", "en"]),
  creatorProfileId: z.string().uuid(),
  creatorSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(20).max(1200),
});

export async function submitCreatorReview(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = creatorReviewSchema.safeParse(Object.fromEntries(formData));
  const slug = String(formData.get("creatorSlug") || "");
  if (!parsed.success)
    redirect(
      `/${locale}/community/creators/${encodeURIComponent(slug)}?review=invalid`,
    );
  const { supabase, user } = await requireUser(locale);
  const { error } = await supabase.from("creator_reviews").insert({
    creator_profile_id: parsed.data.creatorProfileId,
    reviewer_id: user.id,
    rating: parsed.data.rating,
    body: parsed.data.body,
    state: "pending",
  });
  redirect(
    `/${locale}/community/creators/${encodeURIComponent(parsed.data.creatorSlug)}?review=${error ? "unavailable" : "submitted"}`,
  );
}
