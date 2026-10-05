"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
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
  publicEmail: z.union([z.literal(""), z.string().email()]),
  phone: z.string().trim().max(40),
  websiteUrl: z.string().trim().max(300),
  instagramHandle: z.union([
    z.literal(""),
    z.string().trim().regex(/^[A-Za-z0-9._]{1,30}$/),
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
  const websiteValue = parsed.data.websiteUrl.trim();
  const normalizedWebsite = websiteValue
    ? /^https?:\/\//i.test(websiteValue)
      ? websiteValue
      : `https://${websiteValue}`
    : "";
  if (normalizedWebsite) {
    try {
      new URL(normalizedWebsite);
    } catch {
      redirect(`/${locale}/account/profile?error=validation`);
    }
  }
  const instagramUrl = parsed.data.instagramHandle
    ? `https://www.instagram.com/${parsed.data.instagramHandle}`
    : null;

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
      public_email: parsed.data.publicEmail || null,
      phone: parsed.data.phone || null,
      website_url: normalizedWebsite || null,
      instagram_url: instagramUrl,
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

const emailChangeSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function requestAccountEmailChange(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = emailChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(`/${locale}/account/settings?error=email-validation`);

  const { supabase, user } = await requireUser(locale);
  const nextEmail = parsed.data.email.toLowerCase();
  if (user.email?.toLowerCase() === nextEmail)
    redirect(`/${locale}/account/settings?error=email-same`);

  const next = `/${locale}/account/settings?email=confirmed`;
  const emailRedirectTo = `${config.siteUrl}/${locale}/auth/callback?next=${encodeURIComponent(
    next,
  )}`;
  const { error } = await supabase.auth.updateUser(
    { email: nextEmail },
    { emailRedirectTo },
  );
  if (error) redirect(`/${locale}/account/settings?error=email-update`);

  redirect(`/${locale}/account/settings?email=pending`);
}

export async function requestAccountPasswordReset(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const { supabase, user } = await requireUser(locale);
  if (!user.email)
    redirect(`/${locale}/account/settings?error=password-email`);

  const redirectTo =
    `${config.siteUrl}/${locale}/auth/callback?next=${encodeURIComponent(
      `/${locale}/auth/recover`,
    )}`;
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo,
  });
  if (error)
    redirect(`/${locale}/account/settings?error=password-reset`);

  redirect(`/${locale}/account/settings?password=sent`);
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
