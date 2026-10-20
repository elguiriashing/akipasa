import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { matchConfiguredAkiSuitePriceId } from "@/lib/akisuite-stripe";
import {
  stripeBillingPlanForPrice,
  stripeObjectId,
  stripeRetrieve,
} from "@/lib/stripe";

type VerifiedReferralInvoice = {
  eventId: string;
  created: number;
  profileId: string;
  customerId: string;
  subscriptionId: string;
  productCode: string;
  invoice: Record<string, unknown>;
};
/** Only called inside the signed, leased webhook after authoritative subscription reconciliation. */
export async function recordVerifiedReferralInvoice(
  input: VerifiedReferralInvoice,
) {
  if (process.env.AKISUITE_REFERRALS_READY !== "true") return;
  const invoice = input.invoice;
  if (
    invoice.status !== "paid" ||
    invoice.paid === false ||
    !Number.isSafeInteger(invoice.amount_paid) ||
    Number(invoice.amount_paid) <= 0 ||
    stripeObjectId(invoice.customer) !== input.customerId
  )
    return;
  const lines = invoice.lines as
    | {
        data?: Array<{
          price?: unknown;
          pricing?: { price_details?: { price?: unknown } };
          currency?: unknown;
        }>;
        has_more?: boolean;
      }
    | undefined;
  // A delayed invoice must use its own priced lines, never a later subscription upgrade.
  // Mixed/unknown/truncated invoices are held outside automatic attribution for review.
  if (!lines?.data?.length || lines.has_more !== false) return;
  const products = lines.data.map((line) => {
    if (line.currency !== invoice.currency) return null;
    const id =
      stripeObjectId(line.pricing?.price_details?.price) ||
      stripeObjectId(line.price);
    return (
      stripeBillingPlanForPrice(id)?.plan ||
      matchConfiguredAkiSuitePriceId(id)?.plan ||
      null
    );
  });
  if (products.some((product) => !product) || new Set(products).size !== 1)
    return;
  const invoicedProduct = products[0]!;
  const { error } = await createSupabaseServiceClient().rpc(
    "suite_record_referral_billing",
    {
      p_event: input.eventId,
      p_kind: "paid",
      p_profile: input.profileId,
      p_customer: input.customerId,
      p_subscription: input.subscriptionId,
      p_invoice: stripeObjectId(invoice),
      p_product: invoicedProduct,
      p_initial: invoice.billing_reason === "subscription_create",
      p_amount: invoice.amount_paid,
      p_currency: invoice.currency,
      p_created: new Date(input.created * 1000).toISOString(),
    },
  );
  if (error) throw error;
}
/** Conservative customer-level hold: resolving charge-to-invoice ambiguity must never release money. */
export async function recordVerifiedReferralHold(event: {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
}) {
  if (process.env.AKISUITE_REFERRALS_READY !== "true") return;
  if (!["charge.refunded", "charge.dispute.created"].includes(event.type))
    return;
  const chargeId =
    event.type === "charge.refunded"
      ? stripeObjectId(event.data.object)
      : stripeObjectId(event.data.object.charge);
  if (!chargeId || !/^ch_[A-Za-z0-9]+$/.test(chargeId))
    throw new Error("Referral charge identity is missing");
  const charge = await stripeRetrieve<Record<string, unknown>>(
    `/charges/${encodeURIComponent(chargeId)}`,
  );
  if (
    event.type === "charge.refunded" &&
    (!Number.isSafeInteger(charge.amount_refunded) ||
      Number(charge.amount_refunded) <= 0)
  )
    return;
  const customerId = stripeObjectId(charge.customer);
  if (!customerId) return;
  const service = createSupabaseServiceClient();
  const customer = await service
    .from("billing_customers")
    .select("profile_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (customer.error) throw customer.error;
  if (!customer.data) return;
  const { error } = await service.rpc("suite_record_referral_billing", {
    p_event: event.id,
    p_kind: event.type === "charge.refunded" ? "refund_hold" : "dispute_hold",
    p_profile: customer.data.profile_id,
    p_customer: customerId,
    p_subscription: null,
    p_invoice: null,
    p_product: null,
    p_amount: null,
    p_currency: null,
    p_created: new Date(event.created * 1000).toISOString(),
  });
  if (error) throw error;
}
