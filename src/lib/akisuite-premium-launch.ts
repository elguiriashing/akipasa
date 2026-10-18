/** Fail-closed consumer Premium launch gate. Do not expose private rollout controls to clients. */
export function personalPremiumLaunchOpen(): boolean {
  if (process.env.AKISUITE_PERSONAL_PREMIUM_FORCE_OFF === "true") return false;
  const points = Number(process.env.AKISUITE_ADOPTION_EARNED_POINTS);
  const threshold = Number(process.env.AKISUITE_ADOPTION_UNLOCK_THRESHOLD);
  return (
    process.env.AKISUITE_PERSONAL_PREMIUM_ENABLED === "true" &&
    Number.isFinite(points) &&
    Number.isFinite(threshold) &&
    threshold > 0 &&
    points >= threshold
  );
}
