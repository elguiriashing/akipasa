import { createSupabaseServiceClient } from "./supabase/service";
import { stripeRetrieve } from "./stripe";
import { operationsPrice } from "./operations-billing/operations-contract.mjs";
import {
  evaluateOperationsSubscription,
  type OperationsBinding,
} from "./operations-billing/operations-lifecycle.mjs";
/** Called only inside the sole signed, leased AkiPasa Stripe webhook. */
export async function syncOperationsBilling(
  subscriptionId: string,
  eventId: string,
  revision: number,
): Promise<
  | false
  | {
      profileId: string | null;
      customerId: string;
      subscriptionId: string;
      productCode: string;
    }
> {
  const billingEnabled =
    process.env.AKIBUSINESS_OPERATIONS_BILLING_READY === "true";
  const subscription = await stripeRetrieve<Record<string, unknown>>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=latest_invoice.lines`,
    "2026-08-26.dahlia",
  );
  const items = subscription.items as
    | { data?: Array<{ price?: { id?: string } }> }
    | undefined;
  const operatingPrice = operationsPrice(items?.data?.[0]?.price?.id);
  const metadata = subscription.metadata as Record<string, string> | undefined;
  const token = operatingPrice
    ? metadata?.operations_checkout_token
    : undefined;
  if (
    token &&
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      token,
    )
  )
    throw Error("Invalid operating checkout reference");
  const service = createSupabaseServiceClient();
  const { data: binding, error } = await service.rpc("crm_operations_binding", {
    p_subscription: subscriptionId,
    p_token: token || null,
  });
  if (error) {
    // Old schemas cannot contain detached operating bindings. Keep their legacy path.
    if (!billingEnabled && ["PGRST202", "42883"].includes(error.code))
      return false;
    throw Error("Operating subscription binding unavailable");
  }
  if (!binding) {
    if (!billingEnabled || !operatingPrice) return false;
    throw Error("Operating subscription binding unavailable");
  }
  // A deleted legacy customer can have a binding before the approved-price renewal.
  // Resolve that tombstone before allowing the generic legacy billing fallback.
  if ((!billingEnabled || !operatingPrice) && binding.profileId !== null)
    return false;
  const state = evaluateOperationsSubscription(
    subscription,
    binding as OperationsBinding,
  );
  if (state.action === "detached")
    return {
      profileId: null,
      customerId: binding.customerId,
      subscriptionId,
      productCode: "akibusiness_detached",
    };
  if (state.action === "awaiting_payment")
    return {
      profileId: binding.profileId,
      customerId: binding.customerId,
      subscriptionId,
      productCode: `akibusiness_${binding.nextTier}`,
    };
  const result = await service.rpc("apply_crm_operations_billing", {
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
  if (result.error) throw result.error;
  return {
    profileId: binding.profileId,
    customerId: binding.customerId,
    subscriptionId,
    productCode: `akibusiness_${state.tier}`,
  };
}
