"use server";
import { z } from "zod";
import { requirePrestigePrivacyIdentity } from "@/lib/passport-prestige-identity";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { prestigeEnabled, prestigeMemberSchema } from "@/lib/passport-prestige";
export async function prestigeMemberAction(
  locale: string,
  input: unknown,
): Promise<{ error?: string; success?: boolean }> {
  if (!isLocale(locale) || !prestigeEnabled())
    return {
      error:
        locale === "es"
          ? "Prestigio no disponible."
          : "Prestige is unavailable.",
    };
  const parsed = prestigeMemberSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: locale === "es" ? "Revisa los datos." : "Check the details.",
    };
  const { supabase } = await requireUser(
    locale,
    `/${locale}/passports/prestige`,
  );
  const { action, ...payload } = parsed.data;
  if (
    parsed.data.action === "visibility" &&
    ((parsed.data.hall_of_fame && !parsed.data.shared) ||
      (parsed.data.shared &&
        (!parsed.data.public_alias || parsed.data.public_alias.length < 2)))
  )
    return {
      error:
        locale === "es"
          ? "Elige un alias público y activa compartir antes de aparecer en el salón."
          : "Choose a public alias and enable sharing before joining the hall.",
    };
  const { error } = await supabase.rpc("prestige_member", {
    p_action: action,
    p_payload: payload,
  });
  if (error)
    return {
      error:
        locale === "es"
          ? "No se pudo completar. Revisa los requisitos o vuelve a intentarlo."
          : "Could not complete. Check requirements or retry.",
    };
  revalidatePath(`/${locale}/passports/prestige`);
  revalidatePath(`/${locale}/passports/prestige/hall`);
  return { success: true };
}

export async function prestigePrivacyAction(
  locale: string,
  input: unknown,
): Promise<{ error?: string; success?: boolean }> {
  if (
    !isLocale(locale) ||
    (process.env.AKIPASA_PRESTIGE_SCHEMA_READY !== "true" && !prestigeEnabled())
  )
    return { error: locale === "es" ? "No disponible." : "Unavailable." };
  const parsed = z
    .object({
      action: z.enum(["shipping_delete", "withdraw"]),
      award_id: z.string().uuid(),
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      error: locale === "es" ? "Revisa los datos." : "Check the details.",
    };
  const { supabase } = await requirePrestigePrivacyIdentity(locale);
  const { error } = await supabase.rpc("prestige_member", {
    p_action: parsed.data.action,
    p_payload: { award_id: parsed.data.award_id },
  });
  if (error)
    return {
      error:
        locale === "es"
          ? "No se pudo guardar. Reinténtalo."
          : "Could not save. Please retry.",
    };
  for (const l of ["en", "es"]) {
    revalidatePath(`/${l}/privacy/prestige`);
    revalidatePath(`/${l}/passports/prestige`);
    revalidatePath(`/${l}/passports/prestige/hall`);
  }
  return { success: true };
}
