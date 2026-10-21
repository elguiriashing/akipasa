"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isAdministrator } from "@/lib/roles";
const request = z
  .object({
    property: z.string().uuid(),
    revision: z.string().uuid(),
    publish: z.boolean(),
    reason: z.string().trim().min(10).max(2000),
    locale: z.enum(["en", "es"]),
  })
  .strict();
export async function reviewNativeAccommodation(
  input: unknown,
): Promise<{
  ok: boolean;
  error?: "invalid" | "unavailable" | "forbidden" | "stale";
}> {
  const parsed = request.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (process.env.AKISUITE_ACCOMMODATION_READY !== "true")
    return { ok: false, error: "unavailable" };
  const p = parsed.data,
    path = `/${p.locale}/admin/accommodation-review`;
  const { supabase, user } = await requireUser(p.locale, path);
  const role = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (role.error) return { ok: false, error: "unavailable" };
  if (!isAdministrator(role.data?.app_role ?? ""))
    return { ok: false, error: "forbidden" };
  const result = await supabase.rpc("review_accommodation_property", {
    p_property: p.property,
    p_revision: p.revision,
    p_publish: p.publish,
    p_reason: p.reason,
  });
  if (result.error)
    return {
      ok: false,
      error:
        result.error.code === "42501"
          ? "forbidden"
          : result.error.message.includes("Stale")
            ? "stale"
            : "unavailable",
    };
  revalidatePath(path);
  return { ok: true };
}
