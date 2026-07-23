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
    venue_name: value.venueName,
    venue_address: value.venueAddress,
    event_title: value.title,
    event_description: value.description,
    starts_at: value.startsAt.toISOString(),
    ends_at: value.endsAt.toISOString(),
    source_url: value.sourceUrl,
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
