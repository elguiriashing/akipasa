"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAdministrator } from "@/lib/roles";
import {
  achievementScopes,
  type AchievementActionState,
} from "@/lib/achievements";
const category = z
  .string()
  .refine((value) =>
    achievementScopes.categories.some((item) => item.key === value),
  );
const schema = z.object({
  venue_id: z.string().uuid(),
  categories: z.array(category).max(10),
  expected: z.array(category).max(10),
});
export async function saveVenueCategories(
  _state: AchievementActionState,
  form: FormData,
): Promise<AchievementActionState> {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const es = locale === "es";
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/achievements/venues`,
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !isAdministrator(profile.app_role))
    return {
      error: es
        ? "Se requiere un administrador."
        : "Administrator access required.",
    };
  const parsed = schema.safeParse({
    venue_id: form.get("venue_id"),
    categories: form.getAll("categories"),
    expected: String(form.get("expected") || "")
      .split(",")
      .filter(Boolean),
  });
  if (!parsed.success)
    return { error: es ? "Revisa las categorías." : "Check the categories." };
  const { error } = await supabase.rpc("set_venue_achievement_categories", {
    p_venue: parsed.data.venue_id,
    p_categories: parsed.data.categories,
    p_expected: parsed.data.expected,
  });
  if (error)
    return {
      error: es
        ? "No se pudo guardar. Actualiza para comprobar si otro administrador lo ha cambiado."
        : "Could not save. Refresh to check whether another administrator changed this venue.",
    };
  revalidatePath(`/${locale}/admin/achievements/venues`);
  return { success: true };
}
