import {
  akisuitePlans,
  effectiveAkiSuitePlans,
  type AkiSuitePlan,
} from "./akisuite-catalogue";

export type SuiteSubscriptionRow = {
  stripe_subscription_id?: string;
  plan_code: string;
  billing_interval: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  workspace_id?: string | null;
};
export type SuiteGrantRow = {
  plan_code: string;
  grant_kind: string;
  expires_at: string | null;
  starts_at?: string;
};
export function resolveMembershipHub(
  legacy: SuiteSubscriptionRow[],
  suite: SuiteSubscriptionRow[],
  grants: SuiteGrantRow[],
  now: number,
) {
  const paid = [...legacy, ...suite].filter(
    (record) =>
      ["active", "trialing"].includes(record.status) &&
      (!record.current_period_end ||
        Date.parse(record.current_period_end) > now),
  );
  const codes = new Set([
    ...paid.map((record) => record.plan_code),
    ...grants
      .filter(
        (g) =>
          (!g.starts_at || Date.parse(g.starts_at) <= now) &&
          (!g.expires_at || Date.parse(g.expires_at) > now),
      )
      .map((g) => g.plan_code),
  ]);
  const activePlans = [...codes].filter(
    (code): code is AkiSuitePlan => code in akisuitePlans,
  );
  if (codes.has("premium")) activePlans.push("akipasa_premium");
  if (codes.has("business"))
    activePlans.push("akihq_standard", "akibusiness_premium");
  if (codes.has("business_pro"))
    activePlans.push("akihq_pro", "akibusiness_premium");
  const included = effectiveAkiSuitePlans(activePlans);
  return {
    enterprise: included.has("aki_enterprise"),
    apps: {
      akipasa: included.has("akipasa_premium"),
      akibusiness: included.has("akibusiness_premium"),
      akiduermo: included.has("akiduermo_premium"),
      akihq: included.has("akihq_pro")
        ? "pro"
        : included.has("akihq_standard")
          ? "standard"
          : "free",
    },
    activePlans,
    paid,
  };
}
