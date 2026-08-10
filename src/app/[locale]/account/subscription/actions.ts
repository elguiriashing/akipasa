"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { billingPlanSchema, stripePriceId, stripeRequest } from "@/lib/stripe";

type CheckoutSession = { url?: string | null };
type PortalSession = { url?: string | null };

export async function startSubscriptionCheckout(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = billingPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/account/subscription?error=plan`);
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/subscription`,
  );
  const { data: existingSubscriptions } = await supabase
    .from("billing_subscriptions")
    .select("status,current_period_end")
    .eq("profile_id", user.id)
    .eq("plan_code", parsed.data.plan)
    .in("status", ["active", "trialing"]);
  const activeSubscription = (existingSubscriptions || []).some(
    (subscription) =>
      !subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date(),
  );
  if (activeSubscription)
    redirect(
      `/${locale}/account/subscription?plan=${parsed.data.plan}&error=active`,
    );

  if (parsed.data.plan === "business") {
    const { data: application } = await supabase
      .from("business_applications")
      .select("id")
      .eq("applicant_id", user.id)
      .eq("state", "awaiting_payment")
      .maybeSingle();
    if (!application)
      redirect(`/${locale}/business/apply?error=review_required`);
  }

  const { data: customer } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();
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
    "subscription_data[metadata][profile_id]": user.id,
    "subscription_data[metadata][plan_code]": parsed.data.plan,
    "subscription_data[metadata][billing_interval]": parsed.data.interval,
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
  let session: PortalSession;
  try {
    session = await stripeRequest<PortalSession>(
      "/billing_portal/sessions",
      new URLSearchParams({
        customer: customer.stripe_customer_id,
        return_url: `${config.siteUrl}/${locale}/account/subscription`,
      }),
    );
  } catch {
    redirect(`/${locale}/account/subscription?error=portal`);
  }
  if (!session.url || !session.url.startsWith("https://billing.stripe.com/"))
    redirect(`/${locale}/account/subscription?error=portal`);
  redirect(session.url);
}
