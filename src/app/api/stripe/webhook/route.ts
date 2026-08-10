import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { verifyStripeSignature } from "@/lib/stripe";

export const runtime = "nodejs";

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

  if (!subscriptionEvents.has(event.type)) return;

  const metadata = (object.metadata || {}) as Record<string, unknown>;
  const profileId = stringValue(metadata.profile_id);
  const planCode = stringValue(metadata.plan_code);
  const billingInterval = stringValue(metadata.billing_interval);
  const subscriptionId = stringValue(object.id);
  const customerId = stringValue(object.customer);
  const objectStatus = stringValue(object.status);
  const status =
    event.type === "customer.subscription.deleted" ? "canceled" : objectStatus;

  if (
    !profileId ||
    !subscriptionId ||
    !customerId ||
    !["premium", "business"].includes(planCode || "") ||
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
    p_current_period_end: unixDate(object.current_period_end),
    p_cancel_at_period_end: object.cancel_at_period_end === true,
    p_event_created_at: unixDate(event.created),
  });
  if (error) throw error;
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
