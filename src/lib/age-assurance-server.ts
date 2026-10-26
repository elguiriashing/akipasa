import type { SupabaseClient } from "@supabase/supabase-js";

/** Source readiness is separate from rollout; no provider is configured yet. */
export function ageAssuranceEnforced() {
  return process.env.AKISUITE_AGE_ASSURANCE_ENFORCED === "true";
}

/** Never accepts DOB, editable metadata, cookies or a client "verified" flag. */
export async function accountAgeVerified(db: SupabaseClient): Promise<boolean> {
  if (process.env.AKISUITE_AGE_ASSURANCE_SCHEMA_READY !== "true") return false;
  try {
    const { data, error } = await db.rpc("my_age_assurance");
    return !error && data?.adult_verified === true;
  } catch {
    return false;
  }
}
