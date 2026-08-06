import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { verifyStripeSignature } from "@/lib/stripe";

export const runtime = "nodejs";

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function unixDate(value: unknown) {
  return typeof value === "number"
    ? new Date(value * 1000).toISOString()
    : null;
}

async function activateBusiness(profileId: string) {
  const supabase = createSupabaseServiceClient();
  await Promise.all([
    supabase
      .from("profiles")
      .update({ app_role: "organiser", updated_at: new Date().toISOString() })
      .eq("id", profileId)
      .eq("app_role", "consumer"),
    supabase
      .from("business_applications")
      .update({
        state: "active",
        payment_state: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("applicant_id", profileId)
      .in("state", ["under_review", "awaiting_payment"]),
  ]);
}

async function processEvent(event: StripeEvent) {
  const object = event.data.object;
  const supabase = createSupabaseServiceClient();

  if (event.type === "checkout.session.completed") {
    const profileId =
      stringValue(object.client_reference_id) ||
      stringValue((object.metadata as Record<string, unknown>)?.profile_id);
    const customerId = stringValue(object.customer);
    if (profileId && customerId) {
      const { error } = await supabase.from("billing_customers").upsert(
        {
          profile_id: profileId,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );
      if (error) throw error;
    }
    return;
  }

  if (
    ![
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)
  )
    return;

  const metadata = (object.metadata || {}) as Record<string, unknown>;
  const profileId = stringValue(metadata.profile_id);
  const planCode = stringValue(metadata.plan_code);
  const billingInterval = stringValue(metadata.billing_interval);
  const subscriptionId = stringValue(object.id);
  const customerId = stringValue(object.customer);
  if (
    !profileId ||
    !subscriptionId ||
    !customerId ||
    !["premium", "business"].includes(planCode || "") ||
    !["month", "year"].includes(billingInterval || "")
  )
    throw new Error("Subscription metadata is incomplete");

  const status =
    event.type === "customer.subscription.deleted"
      ? "canceled"
      : stringValue(object.status) || "unknown";
  const { error } = await supabase.from("billing_subscriptions").upsert(
    {
      stripe_subscription_id: subscriptionId,
      profile_id: profileId,
      stripe_customer_id: customerId,
      plan_code: planCode,
      billing_interval: billingInterval,
      status,
      current_period_end: unixDate(object.current_period_end),
      cancel_at_period_end: object.cancel_at_period_end === true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw error;
  if (planCode === "business" && ["active", "trialing"].includes(status))
    await activateBusiness(profileId);
}

export async function POST(request: Request) {
  const payload = await request.text();
  const header = request.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !(await verifyStripeSignature(payload, header, secret)))
    return new Response("Invalid signature", { status: 400 });

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
    if (!event.id || !event.type || !event.data?.object)
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
    await supabase
      .from("stripe_webhook_events")
      .update({
        state: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", event.id);
    return Response.json({ received: true });
  } catch (error) {
    await supabase
      .from("stripe_webhook_events")
      .update({
        state: "failed",
        error: error instanceof Error ? error.message.slice(0, 1000) : "error",
      })
      .eq("event_id", event.id);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
