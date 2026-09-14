"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ownerBackgroundPathSchema,
  ownerPreferencesSchema,
  requireOwnerConsole,
} from "@/lib/owner-console";

const ownerBackgroundBucket = "owner-backgrounds";
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

function ownerDestination(
  locale: "en" | "es",
  value: "preferences" | "background",
  error = false,
) {
  return `/${locale}/owner?${error ? "error" : "updated"}=${value}`;
}

function refreshOwnerLayout(locale: "en" | "es") {
  revalidatePath(`/${locale}`, "layout");
  revalidatePath(`/${locale}/owner`);
}

export async function updateOwnerPreferences(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = ownerPreferencesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(ownerDestination(locale, "preferences", true));
  const { supabase } = await requireOwnerConsole(locale);
  const value = parsed.data;
  const { error } = await supabase.rpc("update_owner_console_preferences", {
    p_background: value.background,
    p_accent: value.accent,
    p_motion: value.motion === "on",
    p_glass: value.glass === "on",
  });
  if (error) redirect(ownerDestination(locale, "preferences", true));
  refreshOwnerLayout(locale);
  redirect(ownerDestination(locale, "preferences"));
}

export async function uploadOwnerBackground(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const file = formData.get("image");
  if (
    !(file instanceof File) ||
    !allowedImageTypes.includes(
      file.type as (typeof allowedImageTypes)[number],
    ) ||
    file.size < 1 ||
    file.size > 10 * 1024 * 1024
  )
    redirect(ownerDestination(locale, "background", true));

  const { supabase, user } = await requireOwnerConsole(locale);
  const extension =
    file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(ownerBackgroundBucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) redirect(ownerDestination(locale, "background", true));

  const { error: preferenceError } = await supabase.rpc(
    "set_owner_background_image",
    { p_path: path },
  );
  if (preferenceError) {
    await supabase.storage.from(ownerBackgroundBucket).remove([path]);
    redirect(ownerDestination(locale, "background", true));
  }
  refreshOwnerLayout(locale);
  redirect(ownerDestination(locale, "background"));
}

export async function selectOwnerBackground(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = ownerBackgroundPathSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) redirect(ownerDestination(locale, "background", true));
  const { supabase, user } = await requireOwnerConsole(locale);
  if (!parsed.data.path.startsWith(`${user.id}/`))
    redirect(ownerDestination(locale, "background", true));
  const { error } = await supabase.rpc("set_owner_background_image", {
    p_path: parsed.data.path,
  });
  if (error) redirect(ownerDestination(locale, "background", true));
  refreshOwnerLayout(locale);
  redirect(ownerDestination(locale, "background"));
}

export async function clearOwnerBackground(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const { supabase } = await requireOwnerConsole(locale);
  const { error } = await supabase.rpc("set_owner_background_image", {
    p_path: null,
  });
  if (error) redirect(ownerDestination(locale, "background", true));
  refreshOwnerLayout(locale);
  redirect(ownerDestination(locale, "background"));
}

export async function deleteOwnerBackground(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = ownerBackgroundPathSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) redirect(ownerDestination(locale, "background", true));
  const { supabase, user } = await requireOwnerConsole(locale);
  if (!parsed.data.path.startsWith(`${user.id}/`))
    redirect(ownerDestination(locale, "background", true));

  const { data: preferences } = await supabase
    .from("owner_console_preferences")
    .select("background_image_path")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (preferences?.background_image_path === parsed.data.path) {
    const { error: clearError } = await supabase.rpc(
      "set_owner_background_image",
      { p_path: null },
    );
    if (clearError) redirect(ownerDestination(locale, "background", true));
  }
  const { error } = await supabase.storage
    .from(ownerBackgroundBucket)
    .remove([parsed.data.path]);
  if (error) redirect(ownerDestination(locale, "background", true));
  refreshOwnerLayout(locale);
  redirect(ownerDestination(locale, "background"));
}
