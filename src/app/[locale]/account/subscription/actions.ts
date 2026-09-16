"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import {
  billingPlanSchema,
  stripePriceId,
  stripeRequest,
  stripeRetrieve,
} from "@/lib/stripe";
import { businessCategories } from "@/lib/business-packages";

type CheckoutSession = { url?: string | null };
type PortalSession = { url?: string | null };
type StripeSubscription = {
  items?: { data?: Array<{ id?: string }> };
  latest_invoice?:
    | string
    | { hosted_invoice_url?: string | null; status?: string | null };
};

export async function startSubscriptionCheckout(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = billingPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/account/subscription?error=plan`);
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/subscription`,
  );
  const requestedCategory = businessCategories.some(
    (item) => item.key === formData.get("businessCategory"),
  )
    ? String(formData.get("businessCategory"))
    : "food";
  let selectedBusinessCategory = requestedCategory;
  const { data: existingSubscriptions } = await supabase
    .from("billing_subscriptions")
    .select("stripe_subscription_id,plan_code,status,current_period_end")
    .eq("profile_id", user.id)
    .in("status", ["active", "trialing"]);
  const isCurrent = (subscription: { current_period_end: string | null }) =>
    !subscription.current_period_end ||
    new Date(subscription.current_period_end) > new Date();
  const activeSubscription = (existingSubscriptions || []).some(
    (subscription) =>
      subscription.plan_code === parsed.data.plan && isCurrent(subscription),
  );
  if (activeSubscription)
    redirect(
      `/${locale}/account/subscription?plan=${parsed.data.plan}&error=active`,
    );

  if (parsed.data.plan === "business" || parsed.data.plan === "business_pro") {
    const { data: existingBusiness } = await supabase.rpc(
      "has_active_entitlement",
      { p_profile: user.id, p_plan: "business" },
    );
    const { data: application } = await supabase
      .from("business_applications")
      .select("id,plan_code,business_category")
      .eq("applicant_id", user.id)
      .eq("state", "awaiting_payment")
      .maybeSingle();
    if (
      !application &&
      !(parsed.data.plan === "business_pro" && existingBusiness)
    )
      redirect(`/${locale}/business/apply?error=review_required`);
    if (application) {
      const { error: packageError } = await supabase.rpc(
        "update_business_application_package",
        {
          p_business_category: requestedCategory,
          p_plan_code: parsed.data.plan,
        },
      );
      if (packageError) redirect(`/${locale}/business/apply?error=package`);
      application.business_category = requestedCategory;
      application.plan_code = parsed.data.plan;
      selectedBusinessCategory = requestedCategory;
    }
  }

  const { data: customer } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const activeBusinessSubscription = (existingSubscriptions || []).find(
    (subscription) =>
      subscription.plan_code === "business" && isCurrent(subscription),
  );
  if (parsed.data.plan === "business_pro" && activeBusinessSubscription) {
    let subscription: StripeSubscription;
    try {
      const subscriptionId = encodeURIComponent(
        activeBusinessSubscription.stripe_subscription_id,
      );
      const current = await stripeRetrieve<StripeSubscription>(
        `/subscriptions/${subscriptionId}`,
      );
      const itemId = current.items?.data?.[0]?.id;
      if (!itemId) throw new Error("Stripe subscription item not found");
      subscription = await stripeRequest<StripeSubscription>(
        `/subscriptions/${subscriptionId}`,
        new URLSearchParams({
          "items[0][id]": itemId,
          "items[0][price]": stripePriceId(parsed.data),
          "items[0][quantity]": "1",
          payment_behavior: "pending_if_incomplete",
          proration_behavior: "always_invoice",
          "expand[0]": "latest_invoice",
          "metadata[profile_id]": user.id,
          "metadata[plan_code]": "business_pro",
          "metadata[billing_interval]": parsed.data.interval,
          "metadata[business_category]": selectedBusinessCategory,
        }),
        `business-pro-upgrade:${user.id}:${activeBusinessSubscription.stripe_subscription_id}:${parsed.data.interval}`,
      );
    } catch {
      redirect(`/${locale}/account/subscription?error=checkout`);
    }
    const invoice =
      typeof subscription.latest_invoice === "object"
        ? subscription.latest_invoice
        : null;
    if (
      invoice?.status !== "paid" &&
      invoice?.hosted_invoice_url?.startsWith("https://invoice.stripe.com/")
    )
      redirect(invoice.hosted_invoice_url);
    redirect(`/${locale}/account/subscription?upgrade=pending`);
  }

  const successUrl = `${config.siteUrl}/${locale}/account/subscription?checkout=success`;
  const cancelUrl = `${config.siteUrl}/${locale}/account/subscription?checkout=cancelled`;
  const parameters = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": stripePriceId(parsed.data),
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale,
    allow_promotion_codes: "true",
    "metadata[profile_id]": user.id,
    "metadata[plan_code]": parsed.data.plan,
    "metadata[billing_interval]": parsed.data.interval,
    "metadata[business_category]": selectedBusinessCategory,
    "subscription_data[metadata][profile_id]": user.id,
    "subscription_data[metadata][plan_code]": parsed.data.plan,
    "subscription_data[metadata][billing_interval]": parsed.data.interval,
    "subscription_data[metadata][business_category]": selectedBusinessCategory,
  });
  if (customer?.stripe_customer_id)
    parameters.set("customer", customer.stripe_customer_id);
  else if (user.email) parameters.set("customer_email", user.email);

  let session: CheckoutSession;
  try {
    session = await stripeRequest<CheckoutSession>(
      "/checkout/sessions",
      parameters,
    );
  } catch {
    redirect(`/${locale}/account/subscription?error=checkout`);
  }
  if (!session.url || !session.url.startsWith("https://checkout.stripe.com/"))
    redirect(`/${locale}/account/subscription?error=checkout`);
  redirect(session.url);
}

export async function openBillingPortal(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/subscription`,
  );
  const { data: customer } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!customer?.stripe_customer_id)
    redirect(`/${locale}/account/subscription?error=no_customer`);
  const portalParameters = new URLSearchParams({
    customer: customer.stripe_customer_id,
    return_url: `${config.siteUrl}/${locale}/account/subscription`,
  });
  if (process.env.STRIPE_AKIPASA_PORTAL_CONFIGURATION_ID)
    portalParameters.set(
      "configuration",
      process.env.STRIPE_AKIPASA_PORTAL_CONFIGURATION_ID,
    );
  let session: PortalSession;
  try {
    session = await stripeRequest<PortalSession>(
      "/billing_portal/sessions",
      portalParameters,
    );
  } catch {
    redirect(`/${locale}/account/subscription?error=portal`);
  }
  if (!session.url || !session.url.startsWith("https://billing.stripe.com/"))
    redirect(`/${locale}/account/subscription?error=portal`);
  redirect(session.url);
}
