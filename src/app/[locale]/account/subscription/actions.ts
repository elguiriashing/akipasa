"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { stripeRequest } from "@/lib/stripe";
type PortalSession = { url?: string | null };

// Existing subscriptions continue to renew and remain manageable in Stripe.
// Old forms must use the unified catalogue rather than sell superseded prices.
export async function startSubscriptionCheckout(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  redirect(`/${locale}/account/subscription?error=legacy_checkout_closed`);
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
  if (process.env.AKISUITE_SUBSCRIPTIONS_READY === "true") {
    const { data: suite, error } = await supabase
      .from("akisuite_billing_subscriptions")
      .select("stripe_subscription_id")
      .eq("profile_id", user.id)
      .in("status", [
        "active",
        "trialing",
        "past_due",
        "unpaid",
        "paused",
        "incomplete",
      ]);
    if (error) redirect(`/${locale}/account/subscription?error=portal`);
    if (suite?.length) {
      const configuration =
        process.env.STRIPE_AKISUITE_MANAGEMENT_CONFIGURATION_ID;
      if (!configuration)
        redirect(`/${locale}/account/subscription?error=portal`);
      // Management configuration allows cancellation/payment updates only; plan updates use hosted confirmation above.
      portalParameters.set("configuration", configuration);
    }
  }
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
