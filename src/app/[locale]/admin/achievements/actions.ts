"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isAdministrator } from "@/lib/roles";
import {
  achievementSchema,
  achievementKeySchema,
  type AchievementActionState,
} from "@/lib/achievements";

const revision = z.string().datetime({ offset: true });
async function context(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/achievements`,
  );
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  return {
    supabase,
    allowed: !error && !!profile && isAdministrator(profile.app_role),
    es: locale === "es",
  };
}
function refresh() {
  for (const locale of ["es", "en"]) {
    revalidatePath(`/${locale}/admin/achievements`);
    revalidatePath(`/${locale}/admin/audit`);
    revalidatePath(`/${locale}/account/rewards`);
    revalidatePath(`/${locale}/passports`);
  }
}

export async function saveAchievement(
  _state: AchievementActionState,
  form: FormData,
): Promise<AchievementActionState> {
  const { supabase, allowed, es } = await context(form);
  if (!allowed)
    return {
      error: es
        ? "Solo los administradores pueden gestionar logros."
        : "Only administrators can manage achievements.",
    };
  const parsed = achievementSchema.safeParse({
    ...Object.fromEntries(form),
    active: form.get("active") === "true",
    city_key: form.get("city_key") || null,
    category_key: form.get("category_key") || null,
    minimum_xp:
      form.get("condition_type") === "xp" ? form.get("target_count") : 1000000,
  });
  const creating = form.get("mode") === "create";
  const version = revision.safeParse(form.get("updated_at"));
  if (!parsed.success || (!creating && !version.success))
    return {
      error: es
        ? "Revisa los textos, la condición y el objetivo (1–1.000.000)."
        : "Check both translations, the condition and target (1–1,000,000).",
    };
  const query = creating
    ? supabase.from("achievements").insert(parsed.data)
    : supabase
        .from("achievements")
        .update(parsed.data)
        .eq("key", parsed.data.key)
        .eq("updated_at", version.data!);
  const { data, error } = await query.select("key");
  if (error)
    return {
      error: es
        ? "No se pudo guardar. Tus cambios siguen aquí; inténtalo de nuevo."
        : "Could not save. Your edits are still here; please try again.",
    };
  if (!data?.length)
    return {
      error: es
        ? "Este logro ha cambiado o se ha eliminado. Cierra y actualiza la página."
        : "This achievement changed or was deleted. Close and refresh the page.",
    };
  refresh();
  return { success: true };
}

export async function deleteAchievement(
  _state: AchievementActionState,
  form: FormData,
): Promise<AchievementActionState> {
  const { supabase, allowed, es } = await context(form);
  if (!allowed)
    return {
      error: es
        ? "Se requiere una cuenta de administrador."
        : "An administrator account is required.",
    };
  const parsed = z
    .object({
      key: achievementKeySchema,
      updated_at: revision,
      confirm: z.literal("delete"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: es ? "Confirma la eliminación." : "Confirm deletion first.",
    };
  const { data, error } = await supabase
    .from("achievements")
    .delete()
    .eq("key", parsed.data.key)
    .eq("updated_at", parsed.data.updated_at)
    .select("key");
  if (error || !data?.length)
    return {
      error: es
        ? "No se pudo eliminar. Actualiza la página e inténtalo de nuevo."
        : "Could not delete. Refresh the page and try again.",
    };
  refresh();
  return { success: true };
}
