"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { communitySubmissionSchema, reportSchema } from "@/lib/moderation";
import { reviewPendingCatalogueItem } from "@/lib/automatic-moderation";
import { communityWorkflowPath } from "@/lib/community-navigation";

export async function submitCommunityEvent(formData: FormData) {
  const parsed = communitySubmissionSchema.safeParse(
    Object.fromEntries(formData),
  );
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success)
    redirect(communityWorkflowPath(locale, "suggest", { error: "submission" }));
  const { supabase, user } = await requireUser(
    locale,
    communityWorkflowPath(locale, "suggest"),
  );
  const value = parsed.data;
  const { data: submissionId, error } = await supabase.rpc(
    "submit_community_event",
    {
      p_venue_name: value.venueName,
      p_venue_address: value.venueAddress,
      p_address_provider_id: value.addressProviderId,
      p_locality_name: value.locality,
      p_province_name: value.province,
      p_postal_code: value.postalCode,
      p_latitude: value.latitude,
      p_longitude: value.longitude,
      p_category_id: value.categoryId,
      p_event_title: value.title,
      p_event_description: value.description,
      p_starts_at: value.startsAt.toISOString(),
      p_ends_at: value.endsAt.toISOString(),
      p_source_url: value.sourceUrl,
    },
  );
  if (error)
    redirect(
      communityWorkflowPath(locale, "suggest", {
        error: error.message.includes("rate limit")
          ? "rate-limit"
          : "submission",
      }),
    );
  if (typeof submissionId === "string") {
    await reviewPendingCatalogueItem({
      targetType: "submission",
      targetId: submissionId,
      requesterId: user.id,
    });
  }
  redirect(
    communityWorkflowPath(locale, "suggestions", { created: "submission" }),
  );
}

export async function submitReport(formData: FormData) {
  const [targetType, targetId] = String(formData.get("target") || "").split(
    ":",
  );
  const parsed = reportSchema.safeParse({
    ...Object.fromEntries(formData),
    targetType,
    targetId,
  });
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const target = formData.get("target");
  if (!parsed.success)
    redirect(
      communityWorkflowPath(locale, "report", { target, error: "report" }),
    );
  const { supabase } = await requireUser(
    locale,
    communityWorkflowPath(locale, "report", { target }),
  );
  const value = parsed.data;
  const { error } = await supabase.rpc("submit_report", {
    target_type: value.targetType,
    target_id: value.targetId,
    reason: value.reason,
    details: value.details,
  });
  if (error)
    redirect(
      communityWorkflowPath(locale, "report", {
        target,
        error: error.message.includes("rate limit") ? "rate-limit" : "report",
      }),
    );
  redirect(communityWorkflowPath(locale, "reports", { created: "report" }));
}
