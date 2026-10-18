"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { akiSuiteCheckoutReady } from "@/lib/akisuite-readiness";
import {
  type AkiSuitePlan,
  blocksAkiSuitePurchase,
  overlappingAkiSuitePlan,
  akiSuiteRelevantSubscription,
} from "@/lib/akisuite-catalogue";
import { verifiedAkiSuitePriceId } from "@/lib/akisuite-stripe";
import { personalPremiumVisible } from "@/lib/akisuite-rollout";
import { stripeRequest, stripeRetrieve } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
const planSchema = z.object({
  plan: z.enum([
    "akipasa_premium",
    "akibusiness_premium",
    "akiduermo_premium",
    "akihq_standard",
    "akihq_pro",
    "akihq_business_addon",
    "aki_enterprise",
  ]),
  interval: z.enum(["month", "year"]),
  workspaceId: z.string().trim().min(1).max(200).optional(),
});
type ExistingPlan = {
  plan_code: string;
  status: string;
  workspace_id?: string | null;
};
type StripeSubscription = {
  id: string;
  status: string;
  metadata?: { workspace_id?: string };
  items: { data: Array<{ price: { id: string } }> };
};

export async function startAkiSuiteCheckout(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const failed = (reason: string): never =>
    redirect(`/${locale}/account/subscription?error=${reason}`);
  if (!akiSuiteCheckoutReady()) failed("checkout_unavailable");
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed("plan");
  if (
    !process.env.STRIPE_AKISUITE_MANAGEMENT_CONFIGURATION_ID ||
    !process.env.STRIPE_AKISUITE_PORTAL_CONFIGURATION_ID
  )
    failed("checkout_unavailable");
  const { plan, interval, workspaceId } = parsed.data;
  // The milestone is enforced on the server, not merely by hiding its card.
  if (plan === "akipasa_premium" && !(await personalPremiumVisible()))
    failed("checkout_unavailable");
  const workspace = plan === "akipasa_premium" ? null : workspaceId;
  if (plan !== "akipasa_premium" && !workspace) failed("workspace_required");
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/subscription`,
  );
  const [suite, legacy, customer] = await Promise.all([
    supabase
      .from("akisuite_billing_subscriptions")
      .select("plan_code,status,workspace_id")
      .eq("profile_id", user.id),
    supabase
      .from("billing_subscriptions")
      .select("plan_code,status")
      .eq("profile_id", user.id),
    supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);
  if (suite.error || legacy.error || customer.error)
    failed("checkout_unavailable");
  const existing = [
    ...(suite.data || [])
      .filter(
        (row: ExistingPlan) =>
          blocksAkiSuitePurchase(row.status) &&
          akiSuiteRelevantSubscription(plan, workspace, row),
      )
      .map((row: ExistingPlan) => row.plan_code),
    ...(legacy.data || [])
      .filter((row: ExistingPlan) => blocksAkiSuitePurchase(row.status))
      .map((row: ExistingPlan) => row.plan_code),
  ];
  if (overlappingAkiSuitePlan(plan, existing)) failed("existing_subscription");
  if (workspace) {
    const { data: owned, error } = await supabase
      .from("crm_workspaces")
      .select("id")
      .eq("id", workspace)
      .eq("owner_profile_id", user.id)
      .in("status", ["active", "trial"])
      .maybeSingle();
    if (error || !owned) failed("workspace_owner_required");
  }
  const { data: launchReady, error: launchError } = await supabase.rpc(
    "akisuite_launch_ready",
  );
  if (launchError || launchReady !== true)
    return failed("checkout_unavailable");
  const { data: reservation, error: reserveError } = await supabase.rpc(
    "reserve_akisuite_checkout",
    { p_workspace: workspace || null, p_plan: plan, p_interval: interval },
  );
  if (reserveError || !reservation?.token || !reservation?.expires_at)
    failed("checkout_in_progress");
  let checkoutUrl: string | null = null;
  try {
    const account = await stripeRetrieve<{ id: string }>("/account");
    if (account.id !== process.env.AKISUITE_STRIPE_ACCOUNT_ID)
      throw new Error("Wrong Stripe merchant");
    const registrationId = process.env.AKISUITE_TAX_REGISTRATION_ID;
    if (!registrationId) throw new Error("Tax registration is not verified");
    const [tax, registration] = await Promise.all([
      stripeRetrieve<{ status: string }>("/tax/settings"),
      stripeRetrieve<{
        status: string;
        country: string;
        active_from: number;
        expires_at: number | null;
      }>(`/tax/registrations/${encodeURIComponent(registrationId)}`),
    ]);
    const now = Math.floor(Date.now() / 1000);
    if (
      tax.status !== "active" ||
      registration.status !== "active" ||
      registration.country !== "ES" ||
      registration.active_from > now ||
      (registration.expires_at && registration.expires_at <= now)
    )
      throw new Error("Tax configuration is not ready");
    let customerId = customer.data?.stripe_customer_id;
    if (customerId) {
      // Recheck Stripe itself: a webhook may still be in flight.
      const current = await stripeRetrieve<{
        data: StripeSubscription[];
        has_more: boolean;
      }>(
        `/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`,
      );
      if (current.has_more) throw new Error("Billing reconciliation required");
      const { matchConfiguredAkiSuitePriceId } = await import(
        "@/lib/akisuite-stripe"
      );
      const { stripeBillingPlanForPrice } = await import("@/lib/stripe");
      const remote = current.data
        .filter((row) => blocksAkiSuitePurchase(row.status))
        .flatMap((row) =>
          row.items.data
            .map((item) => {
              const suitePlan = matchConfiguredAkiSuitePriceId(
                item.price.id,
              )?.plan;
              if (
                suitePlan &&
                !akiSuiteRelevantSubscription(plan, workspace, {
                  plan_code: suitePlan,
                  workspace_id: row.metadata?.workspace_id || null,
                })
              )
                return undefined;
              return (
                suitePlan || stripeBillingPlanForPrice(item.price.id)?.plan
              );
            })
            .filter((code): code is AkiSuitePlan => Boolean(code)),
        );
      if (overlappingAkiSuitePlan(plan, remote))
        throw new Error("Existing Stripe subscription");
    } else {
      const created = await stripeRequest<{ id: string }>(
        "/customers",
        new URLSearchParams({
          email: user.email || "",
          "metadata[profile_id]": user.id,
        }),
        `akisuite-customer:${user.id}`,
      );
      customerId = created.id;
      if (!/^cus_[A-Za-z0-9]+$/.test(customerId))
        throw new Error("Invalid billing customer");
      const service = createSupabaseServiceClient();
      const { error } = await service
        .from("billing_customers")
        .upsert(
          { profile_id: user.id, stripe_customer_id: customerId },
          { onConflict: "profile_id" },
        );
      if (error) throw error;
    }
    const activePlans: AkiSuitePlan[] = [];
    if (workspace) {
      const { data: pro, error } = await supabase.rpc(
        "akisuite_addon_eligible",
        { p_workspace: workspace },
      );
      if (error) throw error;
      if (pro) activePlans.push("akihq_pro");
    }
    const price = await verifiedAkiSuitePriceId(plan, interval, activePlans);
    const params = new URLSearchParams({
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      "automatic_tax[enabled]": "true",
      "tax_id_collection[enabled]": "true",
      client_reference_id: user.id,
      locale,
      success_url: `${config.siteUrl}/${locale}/account/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.siteUrl}/${locale}/account/subscription?checkout=cancelled`,
      expires_at: String(Math.floor(Date.parse(reservation.expires_at) / 1000)),
      "metadata[profile_id]": user.id,
      "metadata[akisuite_plan]": plan,
      "subscription_data[metadata][profile_id]": user.id,
      "subscription_data[metadata][akisuite_plan]": plan,
      "subscription_data[metadata][billing_interval]": interval,
      "customer_update[address]": "auto",
      "customer_update[name]": "auto",
      billing_address_collection: "required",
    });
    if (workspace) {
      params.set("metadata[workspace_id]", workspace);
      params.set("subscription_data[metadata][workspace_id]", workspace);
    }
    const session = await stripeRequest<{ url?: string | null }>(
      "/checkout/sessions",
      params,
      `akisuite-checkout:${reservation.token}`,
    );
    checkoutUrl = session.url || null;
  } catch {
    failed("checkout_unavailable");
  }
  if (!checkoutUrl || !checkoutUrl.startsWith("https://checkout.stripe.com/"))
    return failed("checkout_unavailable");
  redirect(checkoutUrl);
}

export async function prepareAkiSuiteWorkspace(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const { supabase } = await requireUser(
    locale,
    `/${locale}/account/subscription`,
  );
  if (process.env.AKISUITE_SUBSCRIPTIONS_READY !== "true")
    redirect(`/${locale}/account/subscription?error=checkout_unavailable`);
  const name = z
    .string()
    .trim()
    .min(2)
    .max(120)
    .safeParse(formData.get("workspaceName"));
  if (!name.success)
    redirect(`/${locale}/account/subscription?error=workspace_required`);
  const { error } = await supabase.rpc("prepare_akisuite_workspace", {
    p_name: name.data,
  });
  redirect(
    `/${locale}/account/subscription${error ? "?error=workspace_owner_required" : ""}`,
  );
}

// Stripe's hosted confirmation shows the proration before updating the existing item.
export async function changeAkiSuiteSubscription(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const failed = (reason: string): never =>
    redirect(`/${locale}/account/subscription?error=${reason}`);
  const configuration = process.env.STRIPE_AKISUITE_PORTAL_CONFIGURATION_ID;
  if (!akiSuiteCheckoutReady() || !configuration)
    failed("checkout_unavailable");
  const parsed = planSchema
    .extend({ subscriptionId: z.string().regex(/^sub_[A-Za-z0-9]+$/) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed("plan");
  const { plan, interval, subscriptionId } = parsed.data;
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/subscription`,
  );
  const { data: rows, error } = await supabase
    .from("akisuite_billing_subscriptions")
    .select(
      "stripe_subscription_id,stripe_customer_id,plan_code,billing_interval,status,workspace_id",
    )
    .eq("profile_id", user.id);
  const source = rows?.find(
    (row) => row.stripe_subscription_id === subscriptionId,
  );
  if (error || !source || !["active", "trialing"].includes(source.status))
    return failed("existing_subscription");
  // Existing personal subscribers may manage their billing interval. Do not
  // allow a new purchase through plan replacement while rollout is locked.
  if (plan === "akipasa_premium" && source.plan_code !== "akipasa_premium" &&
      !(await personalPremiumVisible())) failed("checkout_unavailable");
  const { data: launch, error: launchError } = await supabase.rpc(
    "akisuite_launch_ready",
  );
  if (launchError || !launch) failed("checkout_unavailable");
  const { canReplaceAkiSuitePlan } = await import("@/lib/akisuite-plan-change");
  const others = (rows || [])
    .filter(
      (row) =>
        row.stripe_subscription_id !== subscriptionId &&
        blocksAkiSuitePurchase(row.status) &&
        akiSuiteRelevantSubscription(plan, source.workspace_id, row),
    )
    .map((row) => row.plan_code);
  if (
    source.plan_code === "akihq_pro" &&
    others.includes("akihq_business_addon") &&
    source.billing_interval !== interval
  )
    failed("existing_subscription");
  const legacy = await supabase
    .from("billing_subscriptions")
    .select("plan_code,status")
    .eq("profile_id", user.id);
  if (
    legacy.error ||
    !canReplaceAkiSuitePlan(source.plan_code as AkiSuitePlan, plan, [
      ...others,
      ...(legacy.data || [])
        .filter((row) => blocksAkiSuitePurchase(row.status))
        .map((row) => row.plan_code),
    ])
  )
    failed("existing_subscription");
  if (source.workspace_id) {
    const owned = await supabase
      .from("crm_workspaces")
      .select("id")
      .eq("id", source.workspace_id)
      .eq("owner_profile_id", user.id)
      .in("status", ["active", "trial"])
      .maybeSingle();
    if (owned.error || !owned.data) failed("workspace_owner_required");
  }
  let portalUrl: string | null = null;
  try {
    const account = await stripeRetrieve<{ id: string }>("/account");
    if (account.id !== process.env.AKISUITE_STRIPE_ACCOUNT_ID)
      throw new Error("Wrong merchant");
    const current = await stripeRetrieve<{
      customer: string;
      status: string;
      pending_update?: unknown;
      items: {
        data: Array<{ id: string; price: { id: string }; quantity: number }>;
      };
    }>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
    const { matchConfiguredAkiSuitePriceId } = await import(
      "@/lib/akisuite-stripe"
    );
    const item = current.items.data[0];
    if (
      current.customer !== source.stripe_customer_id ||
      !["active", "trialing"].includes(current.status) ||
      current.pending_update ||
      current.items.data.length !== 1 ||
      item.quantity !== 1 ||
      matchConfiguredAkiSuitePriceId(item.price.id)?.plan !== source.plan_code
    )
      throw new Error("Subscription must reconcile first");
    const pro = source.workspace_id
      ? await supabase.rpc("akisuite_addon_eligible", {
          p_workspace: source.workspace_id,
        })
      : { data: false, error: null };
    if (pro.error) throw pro.error;
    const price = await verifiedAkiSuitePriceId(
      plan,
      interval,
      pro.data ? ["akihq_pro"] : [],
    );
    const session = await stripeRequest<{ url: string }>(
      "/billing_portal/sessions",
      new URLSearchParams({
        customer: source.stripe_customer_id,
        configuration: configuration!,
        return_url: `${config.siteUrl}/${locale}/account/subscription`,
        "flow_data[type]": "subscription_update_confirm",
        "flow_data[subscription_update_confirm][subscription]": subscriptionId,
        "flow_data[subscription_update_confirm][items][0][id]": item.id,
        "flow_data[subscription_update_confirm][items][0][price]": price,
        "flow_data[subscription_update_confirm][items][0][quantity]": "1",
        "flow_data[after_completion][type]": "redirect",
        "flow_data[after_completion][redirect][return_url]": `${config.siteUrl}/${locale}/account/subscription?upgrade=pending`,
      }),
    );
    portalUrl = session.url;
  } catch {
    failed("checkout_unavailable");
  }
  if (!portalUrl?.startsWith("https://billing.stripe.com/"))
    return failed("checkout_unavailable");
  redirect(portalUrl);
}
