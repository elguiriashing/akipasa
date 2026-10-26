import {
  accountAgeVerified,
  ageAssuranceEnforced,
} from "./age-assurance-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { onboardingEnabled, type OnboardingStatus } from "./account-onboarding";

export async function readOnboardingStatus(
  supabase: SupabaseClient,
): Promise<OnboardingStatus> {
  if (!onboardingEnabled()) return "exempt";
  const { data, error } = await supabase.rpc("my_account_onboarding");
  if (
    error ||
    !["exempt", "pending", "complete", "underage"].includes(data?.status)
  )
    throw new Error("Account eligibility is temporarily unavailable");
  return data.status as OnboardingStatus;
}

/** Tracking-only safeguard; never changes existing account or paid access. */
export async function accountTrackingAllowed(
  supabase: SupabaseClient,
  userId: string,
) {
  const status = await readOnboardingStatus(supabase);
  if (status === "pending" || status === "underage") return false;
  if (ageAssuranceEnforced()) return accountAgeVerified(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select("birth_year")
    .eq("id", userId)
    .maybeSingle();
  if (error) return false;
  const birthYear = data?.birth_year;
  // A year alone cannot prove adulthood. Only suppress clearly under-18 ages;
  // do not send the existing demographic value to analytics providers.
  return !(
    typeof birthYear === "number" &&
    Number.isInteger(birthYear) &&
    birthYear >= 1900 &&
    new Date().getUTCFullYear() - birthYear < 18
  );
}
