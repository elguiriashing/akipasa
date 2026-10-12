"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { akisuitePlans, type AkiSuitePlan } from "@/lib/akisuite-catalogue";
import { verifiedAkiSuitePriceId } from "@/lib/akisuite-stripe";
import { stripeRequest, stripeRetrieve } from "@/lib/stripe";

const planSchema = z.object({
  plan: z.enum([
    "akipasa_premium", "akibusiness_premium", "akiduermo_premium",
    "akihq_standard", "akihq_pro", "akihq_business_addon", "aki_enterprise",
  ]),
  interval: z.enum(["month", "year"]),
});

type ExistingPlan = { plan_code: string; status: string; current_period_end: string | null };
function currentPaid(row: ExistingPlan) {
  return ["active", "trialing"].includes(row.status) &&
    (!row.current_period_end || new Date(row.current_period_end).getTime() > Date.now());
}

/** Explicitly disabled until database migration, VAT registration and new Stripe catalogue are verified. */
export async function startAkiSuiteCheckout(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  if (
    process.env.AKISUITE_CHECKOUT_ENABLED !== "true" ||
    process.env.AKISUITE_TAX_READY !== "true" ||
    !process.env.AKISUITE_STRIPE_ACCOUNT_ID
  ) redirect(`/${locale}/account/subscription?error=checkout_unavailable`);

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !(parsed.data.plan in akisuitePlans))
    redirect(`/${locale}/account/subscription?error=plan`);
  const { plan, interval } = parsed.data;
  const { supabase, user } = await requireUser(locale, `/${locale}/account/subscription`);

  const [newResult, legacyResult, customerResult] = await Promise.all([
    supabase.from("akisuite_billing_subscriptions")
      .select("plan_code,status,current_period_end").eq("profile_id", user.id),
    supabase.from("billing_subscriptions")
      .select("plan_code,status,current_period_end").eq("profile_id", user.id),
    supabase.from("billing_customers")
      .select("stripe_customer_id").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (newResult.error || legacyResult.error || customerResult.error)
    redirect(`/${locale}/account/subscription?error=checkout_unavailable`);

  const activeNew = (newResult.data || []).filter(currentPaid).map((row) => row.plan_code);
  const activeLegacy = (legacyResult.data || []).filter(currentPaid).map((row) => row.plan_code);
  const conflictingLegacy = (
    (plan === "akipasa_premium" && activeLegacy.includes("premium")) ||
    (plan === "akihq_standard" && activeLegacy.some((p) => p === "business" || p === "business_pro")) ||
    (plan === "akihq_pro" && activeLegacy.some((p) => p === "business" || p === "business_pro"))
  );

  // Replacing one paid product with Enterprise, or another tier, needs an atomic subscription
  // change and proration preview. Do not silently create a second charge.
  const overlap =
    activeNew.includes(plan) ||
    activeNew.includes("aki_enterprise") ||
    (plan === "aki_enterprise" && (activeNew.length > 0 || activeLegacy.length > 0)) ||
    conflictingLegacy ||
    (plan === "akibusiness_premium" && activeNew.includes("akihq_business_addon")) ||
    (plan === "akihq_business_addon" && activeNew.includes("akibusiness_premium"));
  if (overlap) redirect(`/${locale}/account/subscription?error=existing_subscription`);

  if (plan === "akihq_business_addon") {
    const { data: eligible, error } = await supabase.rpc("has_akisuite_plan", {
      p_profile: user.id, p_plan: "akihq_pro",
    });
    if (error || !eligible)
      redirect(`/${locale}/account/subscription?error=hq_pro_required`);
  }
  if (plan !== "akipasa_premium") {
    const { data: venues, error } = await supabase
      .from("venue_members").select("venue_id")
      .eq("profile_id", user.id).in("role", ["owner", "manager"]).limit(1);
    if (error || !venues?.length)
      redirect(`/${locale}/business?view=claims`);
  }

  let checkoutUrl: string | null = null;
  try {
    // Refuse to bill from the wrong legal merchant even if an API key is accidentally swapped.
    const account = await stripeRetrieve<{ id: string }>("/account");
    if (account.id !== process.env.AKISUITE_STRIPE_ACCOUNT_ID)
      throw new Error("Wrong Stripe merchant for AkiSuite");
    const activePlans = [
      ...activeNew,
      ...(activeLegacy.includes("business_pro") ? ["akihq_pro"] : []),
    ] as AkiSuitePlan[];
    const priceId = await verifiedAkiSuitePriceId(plan, interval, activePlans);
    const successUrl = `${config.siteUrl}/${locale}/account/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${config.siteUrl}/${locale}/account/subscription?checkout=cancelled`;
    const parameters = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "automatic_tax[enabled]": "true",
      client_reference_id: user.id,
      locale,
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[profile_id]": user.id,
      "metadata[akisuite_plan]": plan,
      "metadata[billing_interval]": interval,
      "subscription_data[metadata][profile_id]": user.id,
      "subscription_data[metadata][akisuite_plan]": plan,
      "subscription_data[metadata][billing_interval]": interval,
    });
    if (customerResult.data?.stripe_customer_id)
      parameters.set("customer", customerResult.data.stripe_customer_id);
    else if (user.email)
      parameters.set("customer_email", user.email);
    const session = await stripeRequest<{ url?: string | null }>(
      "/checkout/sessions", parameters,
    );
    checkoutUrl = session.url || null;
  } catch {
    redirect(`/${locale}/account/subscription?error=checkout_unavailable`);
  }
  if (!checkoutUrl || !checkoutUrl.startsWith("https://checkout.stripe.com/"))
    redirect(`/${locale}/account/subscription?error=checkout_unavailable`);
  redirect(checkoutUrl);
}
