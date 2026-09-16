"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const reviewSchema = z.object({
  locale: z.enum(["es", "en"]),
  applicationId: z.string().uuid(),
  applicantId: z.string().uuid(),
  state: z.enum(["under_review", "awaiting_payment", "rejected"]),
  grantKind: z.enum(["none", "trial_1_month", "trial_3_month", "waived"]),
  reason: z.string().trim().min(10).max(2000),
});

export async function reviewBusinessApplication(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const destination = `/${locale}/admin/business-applications`;
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${destination}?error=application`);
  const { supabase } = await requireUser(locale, destination);
  const { error } =
    parsed.data.grantKind === "none"
      ? await supabase.rpc("review_business_application", {
          p_application: parsed.data.applicationId,
          p_state: parsed.data.state,
          p_reason: parsed.data.reason,
        })
      : await supabase.rpc("grant_staff_billing_access", {
          p_profile: parsed.data.applicantId,
          p_plan: "business",
          p_grant_kind: parsed.data.grantKind,
          p_reason: parsed.data.reason,
          p_application: parsed.data.applicationId,
        });
  if (error) redirect(`${destination}?error=application`);
  redirect(`${destination}?updated=application`);
}
