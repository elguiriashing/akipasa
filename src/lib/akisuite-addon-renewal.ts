import { createClient } from "@supabase/supabase-js";
import { matchConfiguredAkiSuitePriceId } from "./akisuite-stripe";
type AddonEnv = {
  AKISUITE_SUBSCRIPTIONS_READY?: string;
  AKISUITE_BILLING_VERIFIED?: string;
  AKISUITE_STRIPE_ACCOUNT_ID?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
};

/** Stop future renewal without refunding, deleting content, or charging a replacement plan. */
export async function stopIneligibleAkiSuiteAddonRenewals(env: AddonEnv) {
  if (
    env.AKISUITE_SUBSCRIPTIONS_READY !== "true" ||
    env.AKISUITE_BILLING_VERIFIED !== "true" ||
    env.AKISUITE_STRIPE_ACCOUNT_ID !== "acct_1SVLH2GfzDhsgsQZ" ||
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    !env.STRIPE_SECRET_KEY
  )
    return { stopped: 0, enabled: false };
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await db.rpc(
    "akisuite_addons_requiring_cancellation",
  );
  if (error) throw new Error("AkiSuite add-on reconciliation unavailable");
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  const accountResponse = await fetch("https://api.stripe.com/v1/account", {
    headers,
  });
  const account = (await accountResponse.json()) as { id: string };
  if (!accountResponse.ok || account.id !== env.AKISUITE_STRIPE_ACCOUNT_ID)
    throw new Error("Wrong Stripe merchant");
  let stopped = 0;
  for (const row of data || []) {
    if (!/^sub_[A-Za-z0-9]+$/.test(row.subscription_id))
      throw new Error("Invalid add-on ID");
    const url = `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(row.subscription_id)}`;
    const response = await fetch(url, { headers });
    const subscription = (await response.json()) as {
      customer: string;
      cancel_at_period_end: boolean;
      status: string;
      items: { data: Array<{ price: { id: string } }> };
    };
    if (
      !response.ok ||
      subscription.customer !== row.customer_id ||
      subscription.items?.data.length !== 1 ||
      matchConfiguredAkiSuitePriceId(subscription.items.data[0].price.id)
        ?.plan !== "akihq_business_addon"
    )
      throw new Error("Add-on ownership or price mismatch");
    if (
      subscription.cancel_at_period_end ||
      ["canceled", "incomplete_expired"].includes(subscription.status)
    )
      continue;
    const updated = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ cancel_at_period_end: "true" }),
    });
    if (!updated.ok) throw new Error("Add-on cancellation pending retry");
    stopped++;
  }
  return { stopped, enabled: true };
}
