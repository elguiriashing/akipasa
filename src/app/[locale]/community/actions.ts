"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { communitySubmissionSchema, reportSchema } from "@/lib/moderation";

export async function submitCommunityEvent(formData: FormData) {
  const parsed = communitySubmissionSchema.safeParse(
    Object.fromEntries(formData),
  );
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/community?error=submission`);
  const { supabase } = await requireUser(locale, `/${locale}/community`);
  const value = parsed.data;
  const { error } = await supabase.rpc("submit_community_event", {
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
  });
  if (error)
    redirect(
      `/${locale}/community?error=${
        error.message.includes("rate limit") ? "rate-limit" : "submission"
      }`,
    );
  redirect(`/${locale}/community?created=submission`);
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
  if (!parsed.success) redirect(`/${locale}/community?error=report`);
  const { supabase } = await requireUser(locale, `/${locale}/community`);
  const value = parsed.data;
  const { error } = await supabase.rpc("submit_report", {
    target_type: value.targetType,
    target_id: value.targetId,
    reason: value.reason,
    details: value.details,
  });
  if (error)
    redirect(
      `/${locale}/community?error=${
        error.message.includes("rate limit") ? "rate-limit" : "report"
      }`,
    );
  redirect(`/${locale}/community?created=report`);
}
