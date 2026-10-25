import { z } from "zod";

export const deletionChecks = [
  "identityVerified",
  "sessionsReviewed",
  "storageCleared",
  "providersResolved",
  "businessContinuityResolved",
  "retentionRecorded",
  "confirmationContactVerified",
] as const;

export const deletionReviewSchema = z.object({
  requestId: z.string().uuid(),
  targetProfile: z.string().uuid(),
  evidence: z.string().trim().min(30).max(4000),
  legalHold: z.boolean(),
  checks: z.object({
    identityVerified: z.boolean(),
    sessionsReviewed: z.boolean(),
    storageCleared: z.boolean(),
    providersResolved: z.boolean(),
    businessContinuityResolved: z.boolean(),
    retentionRecorded: z.boolean(),
    confirmationContactVerified: z.boolean(),
  }),
});

export function deletionReady(review: z.infer<typeof deletionReviewSchema>) {
  return !review.legalHold && deletionChecks.every((key) => review.checks[key]);
}

// The caller obtains a one-use, exact-target grant from the administrator RPC.
// Provider cleanup and legal/tenant decisions are human prerequisites, never
// inferred from an absent profile or a successful Auth response.
export async function executeReviewedIdentityDeletion(
  target: string,
  confirmedTarget: string,
  acquire: () => Promise<{ profile: string; lease: string }>,
  erase: (profile: string) => Promise<void>,
  finish: (lease: string, succeeded: boolean) => Promise<void>,
) {
  if (
    !z.string().uuid().safeParse(target).success ||
    target !== confirmedTarget
  )
    throw new Error("Exact account confirmation required");
  const grant = await acquire();
  if (
    grant.profile !== target ||
    !z.string().uuid().safeParse(grant.lease).success
  )
    throw new Error("Deletion grant mismatch");
  try {
    await erase(target);
  } catch {
    await finish(grant.lease, false);
    throw new Error("Identity deletion failed; review before retrying");
  }
  // A failed finalisation must remain visible for manual reconciliation. Never
  // repeat an Auth deletion automatically or report completion on this failure.
  await finish(grant.lease, true);
}
