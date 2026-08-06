"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  moderationDecisionSchema,
  reportResolutionSchema,
} from "@/lib/moderation";

export async function moderateItem(formData: FormData) {
  const parsed = moderationDecisionSchema.safeParse(
    Object.fromEntries(formData),
  );
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/staff/moderation?error=decision`);
  const { supabase } = await requireUser(locale, `/${locale}/staff/moderation`);
  const value = parsed.data;
  const { error } = await supabase.rpc("moderate_item", {
    target_type: value.targetType,
    target_id: value.targetId,
    decision: value.decision,
    reason: value.reason,
    p_duplicate_of: value.duplicateOf || null,
  });
  if (error) redirect(`/${locale}/staff/moderation?error=decision`);
  redirect(`/${locale}/staff/moderation?updated=decision`);
}

export async function resolveReport(formData: FormData) {
  const parsed = reportResolutionSchema.safeParse(Object.fromEntries(formData));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (!parsed.success) redirect(`/${locale}/staff/support?error=report`);
  const { supabase } = await requireUser(locale, `/${locale}/staff/support`);
  const value = parsed.data;
  const { error } = await supabase.rpc("resolve_report", {
    report_id: value.reportId,
    decision: value.decision,
    resolution: value.resolution,
  });
  if (error) redirect(`/${locale}/staff/support?error=report`);
  redirect(`/${locale}/staff/support?updated=report`);
}

export async function expireEvents(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const { supabase } = await requireUser(locale, `/${locale}/staff`);
  const { error } = await supabase.rpc("expire_finished_events", {
    reference_time: new Date().toISOString(),
  });
  if (error) redirect(`/${locale}/staff?error=expiry`);
  redirect(`/${locale}/staff?updated=expiry`);
}
