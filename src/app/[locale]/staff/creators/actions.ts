"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
const schema = z.object({
  locale: z.enum(["es", "en"]),
  profileId: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
  reason: z.string().trim().min(3).max(1000),
});
export async function moderateCreator(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/staff/creators?error=validation`);
  const { supabase } = await requireUser(locale);
  const { error } = await supabase.rpc("moderate_creator_profile", {
    p_profile_id: parsed.data.profileId,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason,
  });
  redirect(
    `/${locale}/staff/creators?${error ? "error=moderation" : "updated=1"}`,
  );
}
