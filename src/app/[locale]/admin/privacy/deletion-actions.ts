"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  deletionChecks,
  deletionReviewSchema,
  executeReviewedIdentityDeletion,
} from "@/lib/account-deletion-review";
import { z } from "zod";

async function administrator(locale: "en" | "es") {
  const context = await requireUser(locale, `/${locale}/admin/privacy`);
  const { data, error } = await context.supabase
    .from("profiles")
    .select("app_role")
    .eq("id", context.user.id)
    .maybeSingle();
  if (error || data?.app_role !== "administrator")
    throw new Error("Administrator required");
  return context;
}

export async function saveDeletionReview(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const parsed = deletionReviewSchema.safeParse({
    requestId: form.get("requestId"),
    targetProfile: form.get("targetProfile"),
    evidence: form.get("evidence"),
    legalHold: form.get("legalHold") !== "clear",
    checks: Object.fromEntries(
      deletionChecks.map((key) => [key, form.get(key) === "on"]),
    ),
  });
  if (!parsed.success) redirect(`/${locale}/admin/privacy?error=review`);
  const { supabase } = await administrator(locale);
  const r = parsed.data;
  const { error } = await supabase.rpc("review_account_deletion", {
    p_request: r.requestId,
    p_target: r.targetProfile,
    p_checks: r.checks,
    p_legal_hold: r.legalHold,
    p_evidence: r.evidence,
  });
  redirect(
    `/${locale}/admin/privacy?${error ? "error=review" : "updated=review"}`,
  );
}

export async function executeDeletion(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const parsed = z
    .object({
      requestId: z.string().uuid(),
      target: z.string().uuid(),
      confirmation: z.string().uuid(),
    })
    .safeParse({
      requestId: form.get("requestId"),
      target: form.get("targetProfile"),
      confirmation: form.get("confirmation"),
    });
  if (!parsed.success) redirect(`/${locale}/admin/privacy?error=confirmation`);
  const { supabase } = await administrator(locale);
  const r = parsed.data;
  try {
    await executeReviewedIdentityDeletion(
      r.target,
      r.confirmation,
      async () => {
        const { data, error } = await supabase.rpc("begin_account_deletion", {
          p_request: r.requestId,
          p_target: r.target,
        });
        if (error || !data) throw new Error("Review blocked");
        return data as { profile: string; lease: string };
      },
      async (profile) => {
        const { error } =
          await createSupabaseServiceClient().auth.admin.deleteUser(profile);
        if (error) throw new Error("Identity deletion failed");
      },
      async (lease, succeeded) => {
        const { error } = await supabase.rpc("finish_account_deletion", {
          p_request: r.requestId,
          p_lease: lease,
          p_succeeded: succeeded,
        });
        if (error) throw new Error("Manual reconciliation required");
      },
    );
  } catch {
    redirect(`/${locale}/admin/privacy?error=deletion-execution`);
  }
  redirect(`/${locale}/admin/privacy?updated=identity-deleted`);
}

export async function confirmDeletionReply(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const parsed = z
    .object({
      requestId: z.string().uuid(),
      evidence: z.string().trim().min(10).max(1000),
      confirmed: z.literal("on"),
    })
    .safeParse({
      requestId: form.get("requestId"),
      evidence: form.get("evidence"),
      confirmed: form.get("manualConfirmation"),
    });
  if (!parsed.success) redirect(`/${locale}/admin/privacy?error=confirmation`);
  const { supabase } = await administrator(locale);
  const { error } = await supabase.rpc("confirm_account_deletion_reply", {
    p_request: parsed.data.requestId,
    p_evidence: parsed.data.evidence,
  });
  redirect(
    `/${locale}/admin/privacy?${error ? "error=confirmation" : "updated=completed"}`,
  );
}
