"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  locale: z.enum(["en", "es"]),
  claimId: z.string().uuid(),
  source: z.enum([
    "google_search",
    "google_maps",
    "social_media",
    "recommendation",
    "business_outreach",
    "venue_listing",
    "other",
  ]),
  need: z.enum([
    "listing",
    "events",
    "reservations",
    "marketing",
    "operations",
    "other",
  ]),
  comments: z.string().trim().max(1000).default(""),
  contactPermission: z.enum(["yes"]).optional(),
});

export async function submitEarlyPartnerFeedback(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const parsed = schema.safeParse(Object.fromEntries(form));
  const claimId = String(form.get("claimId") || "");
  const base = `/${locale}/business/early-partner?claim=${encodeURIComponent(claimId)}`;
  if (!parsed.success) redirect(`${base}&error=validation`);

  const { supabase, user } = await requireUser(locale, base);
  const { data: claim, error: claimError } = await supabase
    .from("venue_claims")
    .select("id")
    .eq("id", parsed.data.claimId)
    .eq("claimant_id", user.id)
    .eq("status", "approved")
    .maybeSingle();
  if (claimError || !claim) redirect(`${base}&error=access`);

  const { error } = await supabase.from("claim_owner_feedback").upsert(
    {
      claim_id: parsed.data.claimId,
      claimant_id: user.id,
      discovery_source: parsed.data.source,
      priority_need: parsed.data.need,
      comments: parsed.data.comments,
      contact_permission: parsed.data.contactPermission === "yes",
    },
    { onConflict: "claim_id" },
  );
  if (error) {
    console.error("claim_owner_feedback_submit_failed", error.code);
    redirect(`${base}&error=save`);
  }
  redirect(`${base}&done=1`);
}
