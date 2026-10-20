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
