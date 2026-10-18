import { createSupabasePublicClient } from "./supabase/public";

/** Read-only, server-owned rollout gate. Missing row, configuration or network fails closed.
 * The adoption/Excel integration will turn on this existing feature flag later.
 * Never infer eligibility from a browser query, cookie, or a guessed threshold.
 */
export async function personalPremiumVisible(): Promise<boolean> {
  try {
    const { data, error } = await createSupabasePublicClient()
      .from("feature_flags")
      .select("enabled")
      .eq("key", "personal_premium_unlocked")
      .maybeSingle();
    return !error && data?.enabled === true;
  } catch {
    return false;
  }
}
