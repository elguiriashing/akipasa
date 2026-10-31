"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { isAdministrator } from "@/lib/roles";
import {
  prestigeEnabled,
  prestigeProgrammeSchema,
} from "@/lib/passport-prestige";
const schema = z.discriminatedUnion("action", [
  prestigeProgrammeSchema.extend({ action: z.literal("configure") }),
  z.object({
    action: z.literal("programme_status"),
    key: z.string().regex(/^[a-z][a-z0-9_]{2,63}$/),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal("review"),
    award_id: z.string().uuid(),
    status: z.enum(["reviewed", "declined"]),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("read_shipping"),
    award_id: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("delivery"),
    award_id: z.string().uuid(),
    expected_status: z.enum([
      "disabled",
      "awaiting_address",
      "ready",
      "preparing",
      "shipped",
      "delivered",
      "cancelled",
    ]),
    status: z.enum(["preparing", "shipped", "delivered", "cancelled"]),
    tracking_reference: z.string().trim().max(100).default(""),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("revoke"),
    award_id: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
]);
export async function prestigeAdminAction(
  locale: string,
  input: unknown,
): Promise<{
  error?: string;
  success?: boolean;
  data?: Record<string, unknown>;
}> {
  if (!isLocale(locale) || !prestigeEnabled())
    return { error: locale === "es" ? "No disponible." : "Unavailable." };
  if (
    input !== null &&
    typeof input === "object" &&
    "action" in input &&
    input.action === "configure" &&
    "achievement_keys" in input &&
    Array.isArray(input.achievement_keys) &&
    input.achievement_keys.length > 1000
  )
    return {
      error: locale === "es" ? "Revisa los datos." : "Check the details.",
    };
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return {
      error: locale === "es" ? "Revisa los datos." : "Check the details.",
    };
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/passports/prestige`,
  );
  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !data || !isAdministrator(data.app_role))
    return {
      error:
        locale === "es"
          ? "Se requiere administrador."
          : "Administrator required.",
    };
  const { action, ...payload } = parsed.data;
  const { data: result, error } = await supabase.rpc("prestige_admin", {
    p_action: action,
    p_payload: payload,
  });
  if (error)
    return {
      error:
        locale === "es"
          ? "No se pudo guardar. Comprueba los requisitos, el motivo y el identificador único."
          : "Could not save. Check requirements, reason and unique identifier.",
    };
  for (const l of ["en", "es"]) {
    revalidatePath(`/${l}/admin/passports/prestige`);
    revalidatePath(`/${l}/passports/prestige`);
    revalidatePath(`/${l}/passports/prestige/hall`);
  }
  return {
    success: true,
    ...(action === "read_shipping"
      ? { data: result as Record<string, unknown> }
      : {}),
  };
}
