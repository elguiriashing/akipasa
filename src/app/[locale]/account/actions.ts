"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  preferredLocale: z.enum(["es", "en"]),
  username: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_]{3,30}$/),
  ]),
  bio: z.string().trim().max(2000),
  avatarUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  bannerUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  publicEmail: z.union([z.literal(""), z.string().email()]),
  phone: z.string().trim().max(40),
  websiteUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  instagramUrl: z.union([
    z.literal(""),
    z.string().url().startsWith("https://"),
  ]),
  locality: z.string().trim().max(120),
  province: z.string().trim().max(120),
  birthYear: z.union([
    z.literal(""),
    z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  ]),
  gender: z.string().trim().max(60),
  profileVisibility: z.enum(["public", "members", "private"]),
  contactVisibility: z.enum(["public", "members", "private"]),
  attendanceVisibility: z.enum(["public", "members", "private"]),
});

export async function updateAccountProfile(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/account/profile?error=validation`);
  const { supabase, user } = await requireUser(locale);
  const { error } = await supabase.rpc("update_own_profile", {
    p_display_name: parsed.data.displayName,
    p_preferred_locale: parsed.data.preferredLocale,
  });
  if (error) redirect(`/${locale}/account/profile?error=update`);
  const { error: detailsError } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username || null,
      bio: parsed.data.bio || null,
      avatar_url: parsed.data.avatarUrl || null,
      banner_url: parsed.data.bannerUrl || null,
      public_email: parsed.data.publicEmail || null,
      phone: parsed.data.phone || null,
      website_url: parsed.data.websiteUrl || null,
      instagram_url: parsed.data.instagramUrl || null,
      locality: parsed.data.locality || null,
      province: parsed.data.province || null,
      birth_year: parsed.data.birthYear || null,
      gender: parsed.data.gender || null,
      profile_visibility: parsed.data.profileVisibility,
      contact_visibility: parsed.data.contactVisibility,
      attendance_visibility: parsed.data.attendanceVisibility,
    })
    .eq("id", user.id);
  if (detailsError) redirect(`/${locale}/account/profile?error=update`);
  revalidatePath(`/${locale}/account`, "layout");
  redirect(`/${locale}/account/profile?updated=1`);
}

export async function requestAccountDeletion(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const confirmation = String(formData.get("confirmation") || "");
  if (confirmation !== "DELETE" && confirmation !== "BORRAR")
    redirect(`/${locale}/account/privacy?error=delete-confirmation`);
  const { supabase, user } = await requireUser(locale);
  const { error } = await supabase
    .from("account_deletion_requests")
    .insert({ profile_id: user.id });
  if (error) redirect(`/${locale}/account/privacy?error=delete-request`);
  revalidatePath(`/${locale}/account/privacy`);
  redirect(`/${locale}/account/privacy?updated=delete-request`);
}

export async function uploadProfileMedia(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const kind = formData.get("kind") === "banner" ? "banner" : "avatar";
  const returnTo =
    formData.get("returnTo") === "creator"
      ? `/${locale}/community/creator`
      : `/${locale}/account/profile`;
  const file = formData.get("file");
  if (
    !(file instanceof File) ||
    file.size <= 0 ||
    file.size > 10 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  ) {
    redirect(`${returnTo}?error=media`);
  }
  const { supabase, user } = await requireUser(locale);
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${user.id}/${kind}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("profile-media")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) redirect(`${returnTo}?error=media`);
  const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
  const { error: updateError } = await supabase
    .from("profiles")
    .update(
      kind === "avatar"
        ? { avatar_url: data.publicUrl }
        : { banner_url: data.publicUrl },
    )
    .eq("id", user.id);
  if (updateError) redirect(`${returnTo}?error=media`);
  revalidatePath(`/${locale}/account`, "layout");
  revalidatePath(`/${locale}/community`, "layout");
  redirect(`${returnTo}?updated=media`);
}
