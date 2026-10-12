/** Staged commercial catalogue, not live Stripe entitlement mapping. */
export const annualDiscount = 0.2;
export const akisuitePlans = {
  akipasa_premium: { label: "AkiPasa Premium", monthlyCents: 199 },
  akibusiness_premium: { label: "AkiBusiness Premium", monthlyCents: 1499 },
  akiduermo_premium: { label: "AkiDuermo Premium", monthlyCents: 599 },
  akihq_standard: { label: "AkiHQ Standard", monthlyCents: 2000 },
  akihq_pro: { label: "AkiHQ Pro", monthlyCents: 6000 },
  akihq_business_addon: {
    label: "AkiBusiness Premium for AkiHQ Pro",
    monthlyCents: 799,
  },
  aki_enterprise: { label: "Aki Enterprise", monthlyCents: 7999 },
} as const;
export type AkiSuitePlan = keyof typeof akisuitePlans;
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
  return result;
}
