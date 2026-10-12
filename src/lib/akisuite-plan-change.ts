import {
  type AkiSuitePlan,
  overlappingAkiSuitePlan,
} from "./akisuite-catalogue";

/** A replacement uses the existing Stripe item, never a second Checkout subscription. */
export function canReplaceAkiSuitePlan(
  current: AkiSuitePlan,
  requested: AkiSuitePlan,
  others: readonly string[],
) {
  if ((current === "akipasa_premium") !== (requested === "akipasa_premium"))
    return false;
  if (
    current === "akihq_pro" &&
    requested !== "akihq_pro" &&
    others.includes("akihq_business_addon")
  )
    return false;
  return !overlappingAkiSuitePlan(requested, others);
}
