import {
  type AkiSuitePlan,
  akisuitePriceCents,
  akisuitePlans,
  businessAddonEligible,
} from "./akisuite-catalogue";
import { stripeRetrieve } from "./stripe";

// New checkout stays behind the independent billing, feature and tax release gates.
export type AkiSuiteInterval = "month" | "year";

/** New plan IDs are deliberately independent of legacy premium/business/business_pro price IDs. */
const priceEnvironment: Record<
  AkiSuitePlan,
  Record<AkiSuiteInterval, string>
> = {
  akipasa_premium: {
    month: "STRIPE_AKISUITE_AKIPASA_PREMIUM_MONTH_PRICE_ID",
    year: "STRIPE_AKISUITE_AKIPASA_PREMIUM_YEAR_PRICE_ID",
  },
  akibusiness_premium: {
    month: "STRIPE_AKISUITE_AKIBUSINESS_PREMIUM_MONTH_PRICE_ID",
    year: "STRIPE_AKISUITE_AKIBUSINESS_PREMIUM_YEAR_PRICE_ID",
  },
  akiduermo_premium: {
    month: "STRIPE_AKISUITE_AKIDUERMO_PREMIUM_MONTH_PRICE_ID",
    year: "STRIPE_AKISUITE_AKIDUERMO_PREMIUM_YEAR_PRICE_ID",
  },
  akihq_standard: {
    month: "STRIPE_AKISUITE_AKIHQ_STANDARD_MONTH_PRICE_ID",
    year: "STRIPE_AKISUITE_AKIHQ_STANDARD_YEAR_PRICE_ID",
  },
  akihq_pro: {
    month: "STRIPE_AKISUITE_AKIHQ_PRO_MONTH_PRICE_ID",
    year: "STRIPE_AKISUITE_AKIHQ_PRO_YEAR_PRICE_ID",
  },
  akihq_business_addon: {
    month: "STRIPE_AKISUITE_AKIHQ_BUSINESS_ADDON_MONTH_PRICE_ID",
    year: "STRIPE_AKISUITE_AKIHQ_BUSINESS_ADDON_YEAR_PRICE_ID",
  },
  aki_enterprise: {
    month: "STRIPE_AKISUITE_ENTERPRISE_MONTH_PRICE_ID",
    year: "STRIPE_AKISUITE_ENTERPRISE_YEAR_PRICE_ID",
  },
};

type StripeRecurringPrice = {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  tax_behavior?: string;
  product:
    | string
    | {
        id: string;
        active?: boolean;
        tax_code?: string | null;
        metadata?: Record<string, string>;
      };
  metadata?: Record<string, string>;
  recurring?: { interval: string; interval_count: number };
};

/** Resolved server-side: a client cannot supply Stripe prices or grant entitlements. */
export function configuredAkiSuitePriceId(
  plan: AkiSuitePlan,
  interval: AkiSuiteInterval,
): string {
  const envName = priceEnvironment[plan][interval];
  const id = process.env[envName];
  if (!id || !/^price_[A-Za-z0-9]+$/.test(id))
    throw new Error(`${envName} is not configured`);
  return id;
}

/** Call immediately before new Checkout; never run for legacy subscriptions. */
export async function verifiedAkiSuitePriceId(
  plan: AkiSuitePlan,
  interval: AkiSuiteInterval,
  activePlans: readonly AkiSuitePlan[] = [],
): Promise<string> {
  if (plan === "akihq_business_addon" && !businessAddonEligible(activePlans))
    throw new Error("An active AkiHQ Pro workspace subscription is required");
  const id = configuredAkiSuitePriceId(plan, interval);
  const price = await stripeRetrieve<StripeRecurringPrice>(
    `/prices/${encodeURIComponent(id)}?expand[]=product`,
  );
  const productId =
    typeof price.product === "string" ? price.product : price.product?.id;
  if (
    price.id !== id ||
    !price.active ||
    price.currency !== "eur" ||
    price.unit_amount !== akisuitePriceCents(plan, interval) ||
    price.recurring?.interval !== interval ||
    price.recurring.interval_count !== 1 ||
    price.metadata?.akisuite_plan !== plan ||
    price.metadata?.akisuite_interval !== interval ||
    !productId ||
    typeof price.product === "string" ||
    !price.product.active ||
    price.product.metadata?.akisuite_plan !== plan ||
    !process.env[`AKISUITE_TAX_CODE_${plan.toUpperCase()}`] ||
    price.product.tax_code !==
      process.env[`AKISUITE_TAX_CODE_${plan.toUpperCase()}`] ||
    !["inclusive", "exclusive"].includes(
      process.env.AKISUITE_TAX_BEHAVIOR || "",
    ) ||
    price.tax_behavior !== process.env.AKISUITE_TAX_BEHAVIOR
  )
    throw new Error(
      "AkiSuite Stripe price does not match the approved catalogue",
    );
  return id;
}

export function matchConfiguredAkiSuitePriceId(
  priceId: string | null,
): { plan: AkiSuitePlan; interval: AkiSuiteInterval } | null {
  if (!priceId) return null;
  for (const plan of Object.keys(akisuitePlans) as AkiSuitePlan[]) {
    for (const interval of ["month", "year"] as const) {
      if (process.env[priceEnvironment[plan][interval]] === priceId)
        return { plan, interval };
    }
  }
  return null;
}
