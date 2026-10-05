"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  designs,
  getDesign,
  MAX_INVENTORY,
  type Equipment,
} from "@/lib/pals/engine";
import { readState } from "@/lib/pals/server";
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

const toolboxAppearanceSchema = z.object({
  locale: z.enum(["en", "es"]),
  background: z.enum([
    "default",
    "aurora",
    "midnight",
    "synthwave",
    "paper",
    "none",
  ]),
  accent: z.enum(["orange", "teal", "violet", "pink", "gold"]),
  motion: z.boolean(),
  glass: z.boolean(),
});

export async function saveToolboxAppearance(input: unknown) {
  const parsed = toolboxAppearanceSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid appearance" };
  const { supabase } = await requireOwnerConsole(parsed.data.locale);
  const { error } = await supabase.rpc("update_owner_console_preferences", {
    p_background: parsed.data.background,
    p_accent: parsed.data.accent,
    p_motion: parsed.data.motion,
    p_glass: parsed.data.glass,
  });
  if (error) return { error: "Could not save appearance" };
  refreshOwnerLayout(parsed.data.locale);
  return { success: true };
}

const palsGrantSchema = z.object({
  locale: z.enum(["en", "es"]),
  kind: z.enum(["threads", "scrap", "xp", "wits", "energy", "charm", "item"]),
  amount: z.number().int().min(1).max(100000).optional(),
  design: z.string().max(80).optional(),
});

export async function ownerPalsGrant(input: unknown) {
  const parsed = palsGrantSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid AkiPals grant" };
  const { user } = await requireOwnerConsole(parsed.data.locale);
  const saved = await readState(user.id, true);
  if (!saved) return { error: "AkiPals save unavailable" };
  const state = structuredClone(saved.state);
  const { kind } = parsed.data;
  if (kind === "item") {
    const design = designs.find((entry) => entry.id === parsed.data.design);
    if (!design) return { error: "Unknown AkiPals item" };
    if (state.equipment.length >= MAX_INVENTORY)
      return { error: "AkiPals inventory is full" };
    const item: Equipment = {
      id: crypto.randomUUID(),
      design: design.id,
      appearance: design.id,
      level: 1,
      sockets: [null],
    };
    state.equipment.push(item);
    if (!state.wardrobe.includes(design.id)) state.wardrobe.push(design.id);
    state.entitlements ??= state.wardrobe
      .filter((itemId) => itemId !== design.id)
      .map((itemId, index) => ({
        id: `legacy-owner:${index}:${itemId}`,
        itemId,
        grantedAt: new Date().toISOString(),
        obtainedVia: "admin" as const,
        sourceType: "legacy-save",
        sourceId: null,
        quantity: 1,
        status: "active" as const,
        metadata: { migratedFromWardrobe: true },
      }));
    state.entitlements.push({
      id: crypto.randomUUID(),
      itemId: design.id,
      grantedAt: new Date().toISOString(),
      obtainedVia: "admin",
      sourceType: "owner-toolbox",
      sourceId: "self-test",
      quantity: 1,
      status: "active",
      metadata: { testGrant: true },
    });
    state.report = {
      title: "Owner toolbox grant",
      text: `${getDesign(design.id).name} added for testing.`,
      design: design.id,
    };
  } else {
    const amount = parsed.data.amount ?? 1;
    if (kind === "threads" || kind === "scrap" || kind === "xp")
      state[kind] += amount;
    else state.modules[kind] += amount;
    state.report = {
      title: "Owner toolbox grant",
      text: `+${amount} ${kind} for testing.`,
    };
  }
  state.updatedAt = Date.now();
  const { data, error } = await saved.db.rpc("pals_commit", {
    p_user_id: user.id,
    p_command_id: crypto.randomUUID(),
    p_expected_version: saved.version,
    p_state: state,
  });
  if (error || !data)
    return { error: "AkiPals changed while granting. Retry." };
  revalidatePath("/pals");
  return {
    success: true,
    balances: {
      threads: state.threads,
      scrap: state.scrap,
      xp: state.xp,
      modules: state.modules,
    },
  };
}
