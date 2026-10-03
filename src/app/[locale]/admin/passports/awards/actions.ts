"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAdministrator } from "@/lib/roles";
import type { Locale } from "@/lib/config";
const requestSchema = z.object({
  action: z.enum([
    "search",
    "read",
    "mark_test",
    "grant",
    "preset",
    "revoke",
    "reset_city",
    "reset_batch",
  ]),
  payload: z.record(z.union([z.string().max(500), z.boolean()])),
});
export async function passportAdminAction(
  locale: Locale,
  input: unknown,
): Promise<{ data?: unknown; error?: string }> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid award request" };
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/passports/awards`,
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !isAdministrator(profile.app_role))
    return { error: "Administrator required" };
  const { data, error } = await supabase.rpc("admin_passport_awards", {
    p_action: parsed.data.action,
    p_payload: parsed.data.payload,
  });
  if (error)
    return {
      error:
        locale === "es"
          ? "No se pudo completar. Revisa el usuario, nivel y motivo."
          : "Could not complete. Check the member, tier and reason.",
    };
  if (!["read", "search"].includes(parsed.data.action))
    for (const l of ["es", "en"]) {
      revalidatePath(`/${l}/passports`);
      revalidatePath(`/${l}/account/rewards`);
    }
  return { data };
}
