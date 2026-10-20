import {
  operationsPrice,
  objectId,
} from "./operations-billing/operations-contract.mjs";
import {
  evaluateOperationsSubscription,
  type OperationsBinding,
} from "./operations-billing/operations-lifecycle.mjs";
export type OperationsRecoveryEnv = {
  AKIBUSINESS_OPERATIONS_BILLING_READY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
};
type QueueRow = {
  kind: "subscription" | "checkout";
  id: string;
  lease: string;
  subscription_id?: string;
  session_id?: string;
  workspace_id: string;
  customer_id: string;
};
/** Central billing owner: GETs Stripe only; recovers even before the first toolbox exists. */
export async function recoverOperationsBilling(
  env: OperationsRecoveryEnv,
  fetcher: typeof fetch = fetch,
) {
  if (env.AKIBUSINESS_OPERATIONS_BILLING_READY !== "true")
    return { enabled: false, applied: 0, failed: 0, deferred: 0 };
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    !env.STRIPE_SECRET_KEY
  )
    throw Error("Operations recovery bindings unavailable");
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  async function rpc<T>(
    name: string,
    body: Record<string, unknown>,
  ): Promise<T | null> {
    const response = await fetcher(`${base}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw Error("Operations recovery RPC unavailable");
    return response.status === 204 ? null : response.json();
  }
  async function stripe<T>(path: string): Promise<T> {
    const response = await fetcher(`https://api.stripe.com/v1${path}`, {
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2026-08-26.dahlia",
      },
    });
    if (!response.ok) throw Error("Operations recovery provider unavailable");
    return response.json();
  }
  const account = await stripe<{ id: string }>("/account");
  if (account.id !== "acct_1SVLH2GfzDhsgsQZ")
    throw Error("Operations recovery merchant mismatch");
  const rows = await rpc<QueueRow[]>("claim_crm_operations_recovery", {
    p_limit: 5,
  });
  if (!Array.isArray(rows) || rows.length > 5)
    throw Error("Invalid bounded recovery queue");
  let applied = 0,
    failed = 0,
    deferred = 0;
  for (const row of rows) {
    let ok = false;
    const revision = Date.now();
    try {
      let subscriptionId = row.subscription_id;
      if (row.kind === "checkout") {
        if (!/^cs_[A-Za-z0-9_]+$/.test(row.session_id || ""))
          throw Error("Invalid checkout recovery reference");
        const session = await stripe<{
          customer: unknown;
          subscription: unknown;
        }>(`/checkout/sessions/${encodeURIComponent(row.session_id!)}`);
        if (objectId(session.customer) !== row.customer_id)
          throw Error("Recovery checkout customer mismatch");
        subscriptionId = objectId(session.subscription) || undefined;
        if (!subscriptionId) {
          deferred++;
          ok = true;
          continue;
        }
      }
      if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId || ""))
        throw Error("Invalid subscription recovery reference");
      const subscription = await stripe<Record<string, unknown>>(
        `/subscriptions/${encodeURIComponent(subscriptionId!)}?expand[]=latest_invoice.lines`,
      );
      if (
        subscription.id !== subscriptionId ||
        objectId(subscription.customer) !== row.customer_id
      )
        throw Error("Recovery subscription customer mismatch");
      const item = (
        subscription.items as {
          data?: Array<{
            price?: { id?: string };
            current_period_end?: number;
          }>;
        }
      )?.data?.[0];
      if (!operationsPrice(item?.price?.id)) {
        if (row.kind !== "subscription")
          throw Error("Unapproved recovered price");
        deferred++;
        ok = true;
        continue;
      }
      const metadata = subscription.metadata as
        | Record<string, string>
        | undefined;
      const token = metadata?.operations_checkout_token || null;
      if (row.kind === "checkout" && token !== row.id)
        throw Error("Recovery checkout token mismatch");
      const binding = await rpc<OperationsBinding>("crm_operations_binding", {
        p_subscription: subscriptionId,
        p_token: token,
      });
      if (
        !binding ||
        binding.workspaceId !== row.workspace_id ||
        binding.customerId !== row.customer_id
      )
        throw Error("Recovery binding mismatch");
      const state = evaluateOperationsSubscription(subscription, binding);
      if (state.action === "awaiting_payment" || state.action === "detached") {
        deferred++;
        ok = true;
        continue;
      }
      const invoice = subscription.latest_invoice as
        | { id?: string; status?: string }
        | undefined;
      const eventId = `operations-recovery:${subscriptionId}:${subscription.status}:${item?.price?.id}:${invoice?.id || "none"}:${invoice?.status || "none"}:${item?.current_period_end || subscription.current_period_end}`;
      await rpc("apply_crm_operations_billing", {
        p_event: eventId,
        p_subscription: subscriptionId,
        p_token: binding.token || null,
        p_profile: binding.profileId,
        p_customer: binding.customerId,
        p_workspace: binding.workspaceId,
        p_tier: state.tier,
        p_tools: state.tools,
        p_anchor: state.anchor,
        p_paid_until: state.paidUntil,
        p_status: state.status,
        p_revision: revision,
        p_evidence: state.evidence,
      });
      await rpc("crm_toolbox_rotate", { p_workspace: binding.workspaceId });
      applied++;
      ok = true;
    } catch {
      failed++;
    } finally {
      try {
        await rpc("finish_crm_operations_recovery", {
          p_kind: row.kind,
          p_id: row.id,
          p_lease: row.lease,
          p_ok: ok,
        });
      } catch {
        if (ok) failed++;
      }
    }
  }
  return { enabled: true, applied, failed, deferred };
}
