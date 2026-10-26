/** Shared discovery trust policy v1. Inputs must come from server-owned records. */
export type DiscoveryProduct = "pasa" | "duermo" | "coches";
export type AgeAssurance = "unknown" | "declared_underage" | "verified_adult";
export type ExperienceEvidence = {
  profileId: string;
  listingId: string;
  product: DiscoveryProduct;
  kind: "visit" | "stay" | "rental";
  status: "accepted" | "completed" | "cancelled" | "pending";
  occurredAt: string;
  revoked: boolean;
};

export const reviewWindowMs = 7 * 24 * 60 * 60 * 1000;

export function optionalTrackingAllowed(age: AgeAssurance, consent: boolean) {
  return age === "verified_adult" && consent;
}

export function adultContentAllowed(age: AgeAssurance) {
  return age === "verified_adult";
}

export function checkInAllowed(age: AgeAssurance, accountAllowed: boolean) {
  return age === "verified_adult" && accountAllowed;
}

export function reviewEligibility(input: {
  profileId: string;
  listingId: string;
  product: DiscoveryProduct;
  age: AgeAssurance;
  accountAllowed: boolean;
  profileComplete: boolean;
  conflictOfInterest: boolean;
  evidence: ExperienceEvidence | null;
  now: number;
}):
  | "eligible"
  | "verification_required"
  | "profile_required"
  | "conflict_of_interest"
  | "experience_required"
  | "experience_expired" {
  if (!checkInAllowed(input.age, input.accountAllowed))
    return "verification_required";
  if (!input.profileComplete) return "profile_required";
  if (input.conflictOfInterest) return "conflict_of_interest";
  const evidence = input.evidence;
  const expected = {
    pasa: ["visit", "accepted"],
    duermo: ["stay", "completed"],
    coches: ["rental", "completed"],
  } as const;
  const requirement = expected[input.product];
  if (
    !evidence ||
    !requirement ||
    evidence.revoked ||
    evidence.profileId !== input.profileId ||
    evidence.listingId !== input.listingId ||
    evidence.product !== input.product ||
    evidence.kind !== requirement[0] ||
    evidence.status !== requirement[1]
  )
    return "experience_required";
  const occurredAt = Date.parse(evidence.occurredAt);
  if (
    !Number.isFinite(input.now) ||
    !Number.isFinite(occurredAt) ||
    occurredAt > input.now
  )
    return "experience_required";
  return input.now - occurredAt >= reviewWindowMs
    ? "experience_expired"
    : "eligible";
}
