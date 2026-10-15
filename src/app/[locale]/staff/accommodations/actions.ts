"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canModerate } from "@/lib/roles";
const review = z.object({
  locale: z.enum(["en", "es"]),
  property: z.string().uuid(),
  revision: z.string().uuid(),
  decision: z.enum(["publish", "reject"]),
  reason: z.string().trim().min(10).max(2000),
});
export async function reviewAccommodation(form: FormData) {
  const parsed = review.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const p = parsed.data;
  const path = `/${p.locale}/staff/accommodations`;
  const { supabase, user } = await requireUser(p.locale, path);
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !canModerate(profile.app_role))
    redirect(`/${p.locale}/account`);
  const { error } = await supabase.rpc("review_accommodation_property", {
    p_property: p.property,
    p_revision: p.revision,
    p_publish: p.decision === "publish",
    p_reason: p.reason,
  });
  revalidatePath(path);
  redirect(path + (error ? "?result=unavailable" : "?result=reviewed"));
}
