import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  stripeBillingPlanForPrice,
  stripeEventSubscriptionId,
  stripeObjectId,
  stripeRetrieve,
  stripeSubscriptionPeriodEnd,
  stripeProcessingError,
  verifyStripeSignature,
} from "@/lib/stripe";
import { readBoundedText, RequestSecurityError } from "@/lib/request-security";

export const runtime = "nodejs";
const MAX_STRIPE_WEBHOOK_BYTES = 256_000;

type StripeEvent = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

const subscriptionEvents = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);
const subscriptionStatuses = new Set([
  "active",
  "trialing",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function unixDate(value: unknown) {
  return typeof value === "number"
    ? new Date(value * 1000).toISOString()
    : null;
}

async function processEvent(event: StripeEvent) {
  let object = event.data.object;
  const supabase = createSupabaseServiceClient();

  const checkoutEvent =
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded";
  const invoiceEvent =
    event.type === "invoice.paid" || event.type === "invoice.payment_failed";
  if (!checkoutEvent && !invoiceEvent && !subscriptionEvents.has(event.type))
    return;
  if (
    checkoutEvent &&
    !["paid", "no_payment_required"].includes(String(object.payment_status))
  )
    return;
  const relatedSubscription = stripeEventSubscriptionId(event.type, object);
  if (!relatedSubscription) return; // One-off payments on this shared Stripe account.
  // Retrieve current state: a delayed invoice/Checkout event must not restore
  // access after a subsequent cancellation or downgrade.
  object = await stripeRetrieve<Record<string, unknown>>(
    `/subscriptions/${encodeURIComponent(relatedSubscription)}`,
  );

  const metadata = (object.metadata || {}) as Record<string, unknown>;

  const subscriptionItems = object.items as
    | {
        data?: Array<{
          price?: { id?: unknown };
        }>;
      }
    | undefined;
  const priceId = stringValue(subscriptionItems?.data?.[0]?.price?.id);
  const pricePlan = stripeBillingPlanForPrice(priceId);
  // Unknown prices belong to other products; metadata cannot grant a paid tier.
  if (!pricePlan) return;
  const planCode = pricePlan.plan;
  const billingInterval = pricePlan.interval;
  const subscriptionId = stringValue(object.id);
  const customerId = stripeObjectId(object.customer);
  const { data: existingSubscription, error: subscriptionLookupError } =
    await supabase
      .from("billing_subscriptions")
      .select("profile_id,stripe_customer_id")
      .eq("stripe_subscription_id", relatedSubscription)
      .maybeSingle();
  if (subscriptionLookupError) throw subscriptionLookupError;
  const { data: existingCustomer, error: customerLookupError } = await supabase
    .from("billing_customers")
    .select("profile_id")
    .eq("stripe_customer_id", customerId || "")
    .maybeSingle();
  if (customerLookupError) throw customerLookupError;
  const profileId =
    existingSubscription?.profile_id ||
    existingCustomer?.profile_id ||
    stringValue(metadata.profile_id);
  if (
    existingSubscription &&
    existingSubscription.stripe_customer_id !== customerId
  )
    throw new Error("Subscription customer mismatch");
  if (existingCustomer && existingCustomer.profile_id !== profileId)
    throw new Error("Subscription ownership mismatch");
  const objectStatus = stringValue(object.status);
  const status =
    event.type === "customer.subscription.deleted" ? "canceled" : objectStatus;

  if (
    !profileId ||
    !subscriptionId ||
    !customerId ||
    !["premium", "business", "business_pro"].includes(planCode || "") ||
    !["month", "year"].includes(billingInterval || "") ||
    !status ||
    !subscriptionStatuses.has(status) ||
    !Number.isInteger(event.created)
  )
    throw new Error("Subscription metadata is incomplete");

  const { error: customerError } = await supabase
    .from("billing_customers")
    .upsert(
      {
        profile_id: profileId,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );
  if (customerError) throw customerError;

  const { error } = await supabase.rpc("sync_stripe_subscription", {
    p_subscription_id: subscriptionId,
    p_profile: profileId,
    p_customer_id: customerId,
    p_plan: planCode,
    p_interval: billingInterval,
    p_status: status,
    p_current_period_end: stripeSubscriptionPeriodEnd(object),
    p_cancel_at_period_end: object.cancel_at_period_end === true,
    p_event_created_at: unixDate(event.created),
  });
  if (error) throw error;
}

export async function POST(request: Request) {
  let payload: string;
  try {
    payload = await readBoundedText(request, MAX_STRIPE_WEBHOOK_BYTES);
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return new Response(
        error.status === 413 ? "Payload too large" : "Invalid payload",
        { status: error.status },
      );
    return new Response("Invalid payload", { status: 400 });
  }
  const header = request.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !(await verifyStripeSignature(payload, header, secret)))
    return new Response("Invalid signature", { status: 400 });

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
    if (
      !event.id ||
      !event.type ||
      !Number.isInteger(event.created) ||
      !event.data?.object
    )
      throw new Error("Invalid event");
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: claimed, error: lockError } = await supabase.rpc(
    "claim_stripe_webhook_event",
    {
      p_event_id: event.id,
      p_event_type: event.type,
    },
  );
  if (lockError) return new Response("Event lock failed", { status: 500 });
  if (!claimed) return Response.json({ received: true, duplicate: true });

  try {
    await processEvent(event);
    const { error: completionError } = await supabase
      .from("stripe_webhook_events")
      .update({
        state: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", event.id);
    if (completionError) throw completionError;
    return Response.json({ received: true });
  } catch (error) {
    const { error: failureError } = await supabase
      .from("stripe_webhook_events")
      .update({
        state: "failed",
        error: stripeProcessingError(error),
      })
      .eq("event_id", event.id);
    if (failureError)
      console.error("Stripe event failure could not be recorded", event.id);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
