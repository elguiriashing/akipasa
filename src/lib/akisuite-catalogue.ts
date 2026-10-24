/** Current listing prices plus retained historical plan identifiers. */
import { approvedPricing } from "./approved-pricing";
export const annualDiscount = 0.2;
export const akisuitePlans = {
  akipasa_premium: {
    label: "AkiPasa Premium (for individuals)",
    monthlyCents: approvedPricing.discovery.akipasa.individualCents,
  },
  akibusiness_premium: {
    label: "AkiPasa Premium (for businesses)",
    monthlyCents: approvedPricing.discovery.akipasa.businessCents,
  },
  akiduermo_premium: {
    label: "AkiDuermo Premium (for businesses)",
    monthlyCents: approvedPricing.discovery.akiduermo.businessCents,
  },
  akihq_standard: { label: "AkiHQ Standard", monthlyCents: 2000 },
  akihq_pro: { label: "AkiHQ Pro", monthlyCents: 6000 },
  akihq_business_addon: {
    label: "AkiBusiness Premium for AkiHQ Pro",
    monthlyCents: 799,
  },
  aki_enterprise: { label: "Aki Enterprise", monthlyCents: 7999 },
} as const;
export type AkiSuitePlan = keyof typeof akisuitePlans;
export type AkiSuiteApp = "akipasa" | "akibusiness" | "akiduermo" | "akihq";
export function akiSuiteApp(value: unknown): AkiSuiteApp {
  return value === "akibusiness" || value === "akiduermo" || value === "akihq"
    ? value
    : "akipasa";
}
/** Preserve only a same-locale membership destination through the account layout. */
export function akiSuiteMembershipReturnPath(
  locale: "en" | "es",
  candidate: string | null,
) {
  const fallback = `/${locale}/account`;
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate, "https://akipasa.com");
    if (
      url.origin !== "https://akipasa.com" ||
      ![
        `/${locale}/account/subscription`,
        `/${locale}/account/subscription/operations`,
      ].includes(url.pathname)
    )
      return fallback;
    if (url.pathname.endsWith("/operations")) {
      const ids = url.searchParams.getAll("workspace");
      const workspace =
        ids.length === 1 && /^[a-z0-9][a-z0-9_-]{2,79}$/.test(ids[0])
          ? ids[0]
          : null;
      const tiers = url.searchParams.getAll("tier");
      const tier =
        tiers.length === 1 && ["basico", "standard", "pro"].includes(tiers[0])
          ? tiers[0]
          : null;
      const query = new URLSearchParams();
      if (workspace) query.set("workspace", workspace);
      if (tier) query.set("tier", tier);
      return `${url.pathname}${query.size ? `?${query}` : ""}`;
    }
    const from = url.searchParams.get("from");
    return `${url.pathname}${from ? `?from=${akiSuiteApp(from)}` : ""}`;
  } catch {
    return fallback;
  }
}
export function akiSuitePlanApp(plan: AkiSuitePlan): AkiSuiteApp | "akisuite" {
  if (plan === "aki_enterprise") return "akisuite";
  if (plan.startsWith("akihq")) return "akihq";
  if (plan === "akibusiness_premium") return "akibusiness";
  if (plan === "akiduermo_premium") return "akiduermo";
  return "akipasa";
}
export const enterpriseIncludes = [
  "akipasa_premium",
  "akibusiness_premium",
  "akiduermo_premium",
  "akihq_pro",
] as const;
export function akisuitePriceCents(
  plan: AkiSuitePlan,
  interval: "month" | "year",
): number {
  const legacyAnnual = { akibusiness_premium: 14390, akiduermo_premium: 5750 };
  if (interval === "year" && plan in legacyAnnual)
    return legacyAnnual[plan as keyof typeof legacyAnnual];
  const monthly = akisuitePlans[plan].monthlyCents;
  return interval === "month"
    ? monthly
    : Math.round(monthly * 12 * (1 - annualDiscount));
}
export function businessAddonEligible(
  active: readonly AkiSuitePlan[],
): boolean {
  return active.includes("akihq_pro") && !active.includes("aki_enterprise");
}
export function effectiveAkiSuitePlans(
  active: readonly AkiSuitePlan[],
): Set<AkiSuitePlan> {
  const result = new Set<AkiSuitePlan>(active);
  if (result.has("aki_enterprise"))
    for (const plan of enterpriseIncludes) result.add(plan);
  if (result.has("akihq_pro") && result.has("akihq_business_addon"))
    result.add("akibusiness_premium");
  if (result.has("akihq_pro")) result.add("akihq_standard");
  return result;
}

/** Delinquent or paused subscriptions can still charge again; don't sell a replacement. */
export function blocksAkiSuitePurchase(status: string): boolean {
  return !["canceled", "incomplete_expired"].includes(status);
}

export function overlappingAkiSuitePlan(
  requested: AkiSuitePlan,
  existing: readonly string[],
): boolean {
  const plans = new Set(existing);
  if (plans.has(requested) || plans.has("aki_enterprise")) return true;
  if (requested === "aki_enterprise") return plans.size > 0;
  if (requested === "akipasa_premium") return plans.has("premium");
  if (requested === "akihq_standard" || requested === "akihq_pro")
    return ["akihq_standard", "akihq_pro", "business", "business_pro"].some(
      (plan) => plans.has(plan),
    );
  if (requested === "akibusiness_premium")
    return ["akihq_business_addon", "business", "business_pro"].some((plan) =>
      plans.has(plan),
    );
  if (requested === "akihq_business_addon")
    return ["akibusiness_premium", "business", "business_pro"].some((plan) =>
      plans.has(plan),
    );
  return false;
}

/** Enterprise has both a payer's personal benefit and a workspace's business benefits. */
export function akiSuiteRelevantSubscription(
  requested: AkiSuitePlan,
  workspace: string | null | undefined,
  subscription: { plan_code: string; workspace_id?: string | null },
): boolean {
  if (requested === "akipasa_premium")
    return (
      subscription.plan_code === "akipasa_premium" ||
      subscription.plan_code === "aki_enterprise"
    );
  if (
    requested === "aki_enterprise" &&
    ["akipasa_premium", "aki_enterprise"].includes(subscription.plan_code)
  )
    return true;
  return subscription.workspace_id === workspace;
}
