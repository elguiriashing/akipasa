import type { SupabaseClient } from "@supabase/supabase-js";

export const featureFlagKeys = [
  "community_submissions",
  "loyalty_check_ins",
  "promotion_requests",
] as const;

export type FeatureFlagKey = (typeof featureFlagKeys)[number];
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const defaultFeatureFlags: FeatureFlags = {
  community_submissions: true,
  loyalty_check_ins: true,
  promotion_requests: true,
};

export function resolveFeatureFlags(
  rows:
    | Array<{
        key: string;
        enabled: boolean;
      }>
    | null
    | undefined,
): FeatureFlags {
  const resolved = { ...defaultFeatureFlags };
  for (const row of rows || []) {
    if (featureFlagKeys.includes(row.key as FeatureFlagKey)) {
      resolved[row.key as FeatureFlagKey] = row.enabled;
    }
  }
  return resolved;
}

export async function loadFeatureFlags(
  supabase: SupabaseClient,
): Promise<FeatureFlags> {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("key,enabled");
  return error ? { ...defaultFeatureFlags } : resolveFeatureFlags(data);
}
