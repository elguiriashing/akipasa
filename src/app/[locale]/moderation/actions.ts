"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { dispatchClaimDecisions } from "@/lib/claim-mail-delivery";
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
  const page = String(formData.get("claimPage") || "1");
  const claimQuery =
    value.targetType === "venue_claim"
      ? `&queue=claims&page=${/^\d{1,5}$/.test(page) ? Math.min(10001, Math.max(1, Number(page))) : 1}`
      : "";
  if (error)
    redirect(`/${locale}/staff/moderation?error=decision${claimQuery}`);
  if (value.targetType === "venue_claim") {
    // The decision and durable email already committed. Provider failure must not undo it.
    try {
      await dispatchClaimDecisions(undefined, value.targetId);
    } catch {
      console.error("claim_email_dispatch_pending");
    }
  }
  redirect(`/${locale}/staff/moderation?updated=decision${claimQuery}`);
}

export async function setAutomaticModeration(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const enabled = formData.get("enabled") === "true";
  const { supabase } = await requireUser(locale, `/${locale}/staff/moderation`);
  const { error } = await supabase.rpc("set_automatic_moderation", {
    p_enabled: enabled,
  });
  if (error) redirect(`/${locale}/staff/moderation?error=automatic-mode`);
  redirect(`/${locale}/staff/moderation?updated=automatic-mode`);
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
