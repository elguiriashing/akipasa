import {
  operationsPrice,
  validTools,
  TOOL_KEYS,
  objectId,
} from "./operations-contract.mjs";
const rank = { basico: 1, standard: 2, pro: 3 };
const epoch = (value) =>
  Number.isSafeInteger(value) && value > 0 ? value : null;
const date = (value) => new Date(value * 1000).toISOString();
/** Authoritative current subscription + durable server binding, never redirect metadata alone. */
export function evaluateOperationsSubscription(
  subscription,
  binding,
  { now = Math.floor(Date.now() / 1000) } = {},
) {
  if (
    !binding ||
    subscription.id !== binding.subscriptionId ||
    objectId(subscription.customer) !== binding.customerId ||
    subscription.items?.has_more ||
    subscription.items?.data?.length !== 1
  )
    throw Error("Operations subscription binding mismatch");
  if (
    subscription.metadata?.workspace_id !== binding.workspaceId ||
    subscription.metadata?.profile_id !== binding.profileId
  )
    throw Error("Operations scope metadata mismatch");
  const item = subscription.items.data[0],
    tier = operationsPrice(objectId(item.price));
  if (
    !tier ||
    item.quantity !== 1 ||
    item.price?.currency !== "eur" ||
    item.price?.recurring?.interval !== "month" ||
    (item.price?.recurring?.interval_count || 1) !== 1
  )
    throw Error("Unapproved operating price or quantity");
  const anchor = epoch(subscription.billing_cycle_anchor);
  if (!anchor) throw Error("Missing billing anchor");
  if (binding.anchor && Date.parse(binding.anchor) !== anchor * 1000)
    throw Error("Anniversary rebinding requires reviewed migration");
  const invoice = subscription.latest_invoice;
  const subscriptionRef =
    objectId(invoice?.subscription) ||
    invoice?.parent?.subscription_details?.subscription;
  const line = invoice?.lines?.data?.find(
    (line) =>
      (objectId(line.subscription_item) ||
        line.parent?.subscription_item_details?.subscription_item) ===
        item.id &&
      (objectId(line.price) || line.pricing?.price_details?.price) ===
        objectId(item.price),
  );
  const end = epoch(line?.period?.end),
    start = epoch(line?.period?.start);
  const prorationAllowed = Boolean(
    binding.tier &&
      rank[tier] > rank[binding.tier] &&
      invoice?.billing_reason === "subscription_update",
  );
  const paid =
    invoice?.status === "paid" &&
    invoice?.paid !== false &&
    !invoice?.lines?.has_more &&
    subscriptionRef === subscription.id &&
    objectId(invoice?.customer) === binding.customerId &&
    (prorationAllowed ||
      (line?.proration !== true &&
        line?.parent?.subscription_item_details?.proration !== true)) &&
    Number(line?.amount) >= 0 &&
    start &&
    end &&
    start <= now &&
    end > start;
  const status = subscription.status;
  if (
    ![
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "paused",
      "incomplete",
      "incomplete_expired",
      "canceled",
    ].includes(status)
  )
    throw Error("Unknown billing status");
  let tools =
    tier === "pro"
      ? [...TOOL_KEYS]
      : binding.tier === tier
        ? binding.tools
        : binding.nextTier === tier
          ? binding.nextTools
          : null;
  if (!validTools(tier, tools))
    throw Error(
      "Owner-confirmed toolbox selection required for tier transition",
    );
  // A remote item change on its own is not evidence that an upgrade was paid.
  if (!paid) {
    if (!binding.tier || !binding.paidUntil)
      return { action: "awaiting_payment", subscriptionId: subscription.id };
    const originalTier = binding.tier;
    if (rank[tier] > rank[originalTier]) {
      tools = binding.tools;
    } else if (tier !== originalTier && !validTools(tier, tools))
      throw Error("Downgrade selection required");
    return {
      action: "sync",
      workspaceId: binding.workspaceId,
      subscriptionId: subscription.id,
      tier: rank[tier] > rank[originalTier] ? originalTier : tier,
      tools,
      anchor: binding.anchor || date(anchor),
      paidUntil: binding.paidUntil,
      status,
      evidence: `stripe-current:${subscription.id}:unpaid`,
      paidInvoiceId: null,
    };
  }
  // A confirmed later invoice must match the current item/price before expanding access.
  return {
    action: "sync",
    workspaceId: binding.workspaceId,
    subscriptionId: subscription.id,
    tier,
    tools,
    anchor: binding.anchor || date(anchor),
    paidUntil: date(
      Math.max(
        end,
        binding.paidUntil && binding.tier === tier
          ? Date.parse(binding.paidUntil) / 1000
          : 0,
      ),
    ),
    status,
    evidence: `stripe-invoice:${invoice.id}`,
    paidInvoiceId: invoice.id,
  };
}
