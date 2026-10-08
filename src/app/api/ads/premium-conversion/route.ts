import { NextResponse } from "next/server";
import { optionalUser } from "@/lib/auth";
import {
  stripeRetrieve,
  stripeObjectId,
  stripeBillingPlanForPrice,
} from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only report subscriptions that Stripe and our webhook-backed database agree are paid.
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !/^cs_(?:test_|live_)[A-Za-z0-9]+$/.test(sessionId))
    return NextResponse.json(
      { ready: false },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  const { supabase, user } = await optionalUser();
  if (!user) return NextResponse.json({ ready: false }, { status: 401 });
  try {
    const session = await stripeRetrieve<{
      id: string;
      mode?: string;
      client_reference_id?: string;
      payment_status?: string;
      currency?: string;
      amount_total?: number;
      subscription?: unknown;
      livemode?: boolean;
    }>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (
      session.client_reference_id !== user.id ||
      session.mode !== "subscription" ||
      session.payment_status !== "paid" ||
      session.currency !== "eur" ||
      session.livemode !== true
    )
      return NextResponse.json(
        { ready: false },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    const subscriptionId = stripeObjectId(session.subscription);
    if (!subscriptionId)
      return NextResponse.json(
        { ready: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    const subscription = await stripeRetrieve<{
      status?: string;
      items?: { data?: Array<{ price?: { id?: string } }> };
    }>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
    const plan = stripeBillingPlanForPrice(
      subscription.items?.data?.[0]?.price?.id || null,
    );
    if (plan?.plan !== "premium" || subscription.status !== "active")
      return NextResponse.json(
        { ready: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    const { data, error } = await supabase
      .from("billing_subscriptions")
      .select("stripe_subscription_id")
      .eq("stripe_subscription_id", subscriptionId)
      .eq("profile_id", user.id)
      .eq("plan_code", "premium")
      .eq("status", "active")
      .maybeSingle();
    if (
      error ||
      !data ||
      !Number.isInteger(session.amount_total) ||
      (session.amount_total || 0) <= 0
    )
      return NextResponse.json(
        { ready: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    return NextResponse.json(
      {
        ready: true,
        transactionId: session.id,
        value: session.amount_total! / 100,
        currency: "EUR",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ready: false },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
