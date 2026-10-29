"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dispatchClaimDecisions } from "@/lib/claim-mail-delivery";
import {
  moderationDecisionSchema,
  reportResolutionSchema,
} from "@/lib/moderation";

import {
  parseStaffQueue,
  parseStaffQueuePage,
  staffQueueForTarget,
  staffModerationHref,
} from "@/lib/staff-moderation-queue";

export async function moderateItem(formData: FormData) {
  const parsed = moderationDecisionSchema.safeParse(
    Object.fromEntries(formData),
  );
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const queue = staffQueueForTarget(
    parsed.success ? parsed.data.targetType : formData.get("targetType"),
  );
  const page = parseStaffQueuePage(
    formData.get(queue === "claims" ? "claimPage" : "queuePage"),
  );
  if (!parsed.success)
    redirect(staffModerationHref(locale, queue, page, { error: "decision" }));
  const { supabase } = await requireUser(
    locale,
    staffModerationHref(locale, queue, page),
  );
  const value = parsed.data;
  const { error } = await supabase.rpc("moderate_item", {
    target_type: value.targetType,
    target_id: value.targetId,
    decision: value.decision,
    reason: value.reason,
    p_duplicate_of: value.duplicateOf || null,
  });
  if (error)
    redirect(staffModerationHref(locale, queue, page, { error: "decision" }));
  let claimantMailStatus: "sent" | "not_sent" = "not_sent";
  if (value.targetType === "venue_claim") {
    // The decision and durable email already committed. Provider failure must not undo it.
    try {
      const delivery = await dispatchClaimDecisions(undefined, value.targetId);
      if (delivery.sent > 0) claimantMailStatus = "sent";
    } catch {
      console.error("claim_email_dispatch_pending");
    }
  }
  redirect(
    staffModerationHref(locale, queue, page, {
      updated: "decision",
      ...(value.targetType === "venue_claim"
        ? { mail: claimantMailStatus }
        : {}),
    }),
  );
}

export async function reviewRentalCompany(formData: FormData) {
  const page = parseStaffQueuePage(formData.get("queuePage"));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = z
    .object({
      companyId: z.string().uuid(),
      status: z.enum(["published", "rejected"]),
      note: z.string().trim().max(1000).optional().default(""),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(staffModerationHref(locale, "rentals", page, { error: "review" }));
  const { supabase } = await requireUser(
    locale,
    staffModerationHref(locale, "rentals", page),
  );
  const { error } = await supabase.rpc("review_car_rental_company", {
    p_company: parsed.data.companyId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || null,
  });
  if (error)
    redirect(staffModerationHref(locale, "rentals", page, { error: "review" }));
  redirect(staffModerationHref(locale, "rentals", page, { updated: "review" }));
}

export async function setAutomaticModeration(formData: FormData) {
  const queue = parseStaffQueue(formData.get("queue"));
  const page = parseStaffQueuePage(formData.get("queuePage"));
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const enabled = formData.get("enabled") === "true";
  const { supabase } = await requireUser(
    locale,
    staffModerationHref(locale, queue, page),
  );
  const { error } = await supabase.rpc("set_automatic_moderation", {
    p_enabled: enabled,
  });
  if (error)
    redirect(
      staffModerationHref(locale, queue, page, { error: "automatic-mode" }),
    );
  redirect(
    staffModerationHref(locale, queue, page, { updated: "automatic-mode" }),
  );
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
