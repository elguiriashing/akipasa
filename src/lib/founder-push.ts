/** Server-only allowlist; never derive founder permission from email, app state,
 * client metadata, or Firebase topic subscriptions. */
export function founderUserIds(value: string | undefined): Set<string> {
  return new Set(
    (value || "")
      .split(",")
      .map((id) => id.trim().toLowerCase())
      .filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          id,
        ),
      ),
  );
}
export function founderPushEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return (
    env.AKIPASA_PUSH_ENABLED === "true" &&
    founderUserIds(env.AKIPASA_PUSH_FOUNDER_IDS).size > 0
  );
}
export function claimPushUrl(claimId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(claimId)) throw new Error("Invalid claim ID");
  return (
    "https://akipasa.com/en/staff/moderation?queue=claims&claim=" +
    encodeURIComponent(claimId)
  );
}
