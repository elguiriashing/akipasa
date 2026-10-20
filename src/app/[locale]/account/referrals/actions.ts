"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { referralCodeSchema, referralProductSchema } from "@/lib/referrals";

export async function captureReferral(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const base = `/${locale}/account/referrals`;
  if (process.env.AKISUITE_REFERRALS_READY !== "true")
    redirect(`${base}?result=unavailable`);
  const parsed = z
    .object({ code: referralCodeSchema, product: referralProductSchema })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const { supabase } = await requireUser(locale, base);
  const { data, error } = await supabase.rpc("suite_capture_referral", {
    p_code: parsed.data.code,
    p_product: parsed.data.product,
  });
  redirect(
    `${base}?result=${error ? "unavailable" : data ? "saved" : "ineligible"}`,
  );
}
export async function saveReferralLead(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const base = `/${locale}/account/referrals`;
  if (process.env.AKISUITE_REFERRALS_READY !== "true")
    redirect(`${base}?result=unavailable`);
  const parsed = z
    .object({
      business: z.string().trim().min(2).max(160),
      email: z.union([z.string().email().max(254), z.literal("")]),
      notes: z.string().trim().max(2000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const { supabase, user } = await requireUser(locale, base);
  const { error } = await supabase.from("suite_referral_leads").insert({
    representative_id: user.id,
    business_name: parsed.data.business,
    contact_email: parsed.data.email || null,
    notes: parsed.data.notes,
  });
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}
export async function updateReferralLead(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const base = `/${locale}/account/referrals`;
  if (process.env.AKISUITE_REFERRALS_READY !== "true")
    redirect(`${base}?result=unavailable`);
  const parsed = z
    .object({
      id: z.string().uuid(),
      stage: z.enum([
        "registered",
        "qualified",
        "contacted",
        "converted",
        "lost",
      ]),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const { supabase, user } = await requireUser(locale, base);
  const { error } = await supabase
    .from("suite_referral_leads")
    .update({ stage: parsed.data.stage, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("representative_id", user.id);
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}

export async function joinReferralProgramme(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const base = `/${locale}/account/referrals`;
  if (process.env.AKISUITE_REFERRALS_READY !== "true")
    redirect(`${base}?result=unavailable`);
  const id = z.string().uuid().safeParse(form.get("programme"));
  if (!id.success) redirect(`${base}?result=invalid`);
  const { supabase } = await requireUser(locale, base);
  const { error } = await supabase.rpc("suite_join_referral_programme", {
    p_programme: id.data,
  });
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}

export async function reportReferralCase(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const base = `/${locale}/account/referrals`;
  if (process.env.AKISUITE_REFERRALS_READY !== "true")
    redirect(`${base}?result=unavailable`);
  const parsed = z
    .object({
      code: referralCodeSchema,
      kind: z.enum(["attribution_dispute", "fraud", "refund", "other"]),
      detail: z.string().trim().min(5).max(2000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const { supabase, user } = await requireUser(locale, base);
  const { error } = await supabase.from("suite_referral_cases").insert({
    reporter_id: user.id,
    code: parsed.data.code,
    case_type: parsed.data.kind,
    detail: parsed.data.detail,
  });
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}
