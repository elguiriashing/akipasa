"use server";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isAdministrator } from "@/lib/roles";
import { referralCodeSchema } from "@/lib/referrals";
async function context(form: FormData) {
  const locale = form.get("locale") === "en" ? "en" : "es";
  const base = `/${locale}/admin/referrals`;
  const { supabase, user } = await requireUser(locale, base);
  const role = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isAdministrator(role.data?.app_role || "")) notFound();
  if (process.env.AKISUITE_REFERRALS_READY !== "true")
    redirect(`${base}?result=unavailable`);
  return { locale, base, supabase, user };
}
export async function saveReferralProgramme(form: FormData) {
  const { base, supabase } = await context(form);
  const optionalMoney = z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().positive().max(100).optional(),
  );
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(120),
      type: z.enum(["public", "representative", "partner"]),
      days: z.coerce.number().int().min(1).max(365),
      products: z.string().trim().min(1).max(500),
      starts: z.preprocess(
        (v) => (v === "" ? undefined : v),
        z.string().datetime({ offset: true }).optional(),
      ),
      ends: z.preprocess(
        (v) => (v === "" ? undefined : v),
        z.string().datetime({ offset: true }).optional(),
      ),
      basis: z.preprocess(
        (v) => (v === "" ? undefined : v),
        z.enum(["initial_invoice", "each_invoice"]).optional(),
      ),
      discountFixed: z.preprocess(
        (v) => (v === "" ? undefined : v),
        z.coerce.number().int().positive().max(10000000).optional(),
      ),
      commissionFixed: z.preprocess(
        (v) => (v === "" ? undefined : v),
        z.coerce.number().int().positive().max(10000000).optional(),
      ),
      discount: optionalMoney,
      commission: optionalMoney,
      terms: z.string().trim().max(120),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const p = parsed.data;
  if (
    (p.discount && p.discountFixed) ||
    (p.commission && p.commissionFixed) ||
    (p.starts && p.ends && Date.parse(p.ends) <= Date.parse(p.starts))
  )
    redirect(`${base}?result=invalid`);
  const products = p.products
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (products.some((s) => !/^([a-z][a-z0-9_]{1,60})$/.test(s)))
    redirect(`${base}?result=invalid`);
  const { error } = await supabase.from("suite_referral_programmes").insert({
    name: p.name,
    programme_type: p.type,
    attribution_days: p.days,
    eligible_products: products,
    starts_at: p.starts || new Date().toISOString(),
    ends_at: p.ends || null,
    commission_basis: p.basis || null,
    discount_fixed_cents: p.discountFixed || null,
    commission_fixed_cents: p.commissionFixed || null,
    discount_percent: p.discount ?? null,
    commission_percent: p.commission ?? null,
    terms_version: p.terms || null,
  });
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}
export async function setReferralProgrammeState(form: FormData) {
  const { base, supabase } = await context(form);
  const parsed = z
    .object({
      id: z.string().uuid(),
      state: z.enum(["draft", "active", "suspended"]),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const { error } = await supabase
    .from("suite_referral_programmes")
    .update({ state: parsed.data.state })
    .eq("id", parsed.data.id);
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}
export async function assignReferralCode(form: FormData) {
  const { base, supabase } = await context(form);
  const parsed = z
    .object({
      programme: z.string().uuid(),
      owner: z.string().uuid(),
      limit: z.preprocess(
        (v) => (v === "" ? null : v),
        z.coerce.number().int().positive().max(100000).nullable(),
      ),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const code = crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 16)
    .toUpperCase();
  const { error } = await supabase.from("suite_referral_codes").insert({
    code,
    programme_id: parsed.data.programme,
    owner_profile_id: parsed.data.owner,
    usage_limit: parsed.data.limit,
  });
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}
export async function revokeReferralCode(form: FormData) {
  const { base, supabase } = await context(form);
  const code = referralCodeSchema.safeParse(form.get("code"));
  if (!code.success) redirect(`${base}?result=invalid`);
  const { error } = await supabase
    .from("suite_referral_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("code", code.data);
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}
export async function setRepresentative(form: FormData) {
  const { base, supabase, user } = await context(form);
  const parsed = z
    .object({
      profile: z.string().uuid(),
      state: z.enum(["approved", "suspended"]),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const { error } = await supabase
    .from("suite_referral_representatives")
    .upsert({
      profile_id: parsed.data.profile,
      state: parsed.data.state,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    });
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}

export async function reviewReferralCase(form: FormData) {
  const { base, supabase, user } = await context(form);
  const parsed = z
    .object({
      id: z.string().uuid(),
      state: z.enum(["open", "reviewing", "resolved", "rejected"]),
      resolution: z.string().trim().max(2000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const { error } = await supabase
    .from("suite_referral_cases")
    .update({
      state: parsed.data.state,
      resolution: parsed.data.resolution,
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}

export async function reviewReferralPayout(form: FormData) {
  const { base, supabase } = await context(form);
  if (process.env.AKISUITE_REFERRAL_APPROVAL_SCHEMA_READY !== "true")
    redirect(`${base}?result=unavailable`);
  const parsed = z
    .object({
      event: z
        .string()
        .regex(/^evt_[A-Za-z0-9]+$/)
        .max(255),
      state: z.enum(["eligible", "approved", "held", "rejected"]),
      reason: z.string().trim().min(5).max(2000),
      reference: z.string().trim().max(200),
      request: z.string().uuid(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`${base}?result=invalid`);
  const { error } = await supabase.rpc("suite_review_referral_payout", {
    p_event: parsed.data.event,
    p_state: parsed.data.state,
    p_reason: parsed.data.reason,
    p_reference: parsed.data.reference || null,
    p_request: parsed.data.request,
  });
  redirect(`${base}?result=${error ? "unavailable" : "saved"}`);
}
