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
    founderPushStartedAt(env.AKIPASA_PUSH_STARTED_AT) !== null &&
    founderUserIds(env.AKIPASA_PUSH_FOUNDER_IDS).size > 0
  );
}
/** Every activation starts a new future-only window. Never infer it from startup
 * or deploy time: a missing/malformed/future operator timestamp fails closed. */
export function founderPushStartedAt(value: string | undefined): string | null {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  )
    return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > Date.now()) return null;
  const normalized = new Date(timestamp).toISOString();
  return normalized ===
    (value.includes(".") ? value : value.replace("Z", ".000Z"))
    ? normalized
    : null;
}
export function founderPushEnrollmentEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return (
    env.AKIPASA_PUSH_ENROLLMENT_ENABLED === "true" &&
    founderUserIds(env.AKIPASA_PUSH_FOUNDER_IDS).size > 0
  );
}
export function founderPushTestEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return (
    founderPushEnrollmentEnabled(env) &&
    env.AKIPASA_PUSH_TEST_ENABLED === "true"
  );
}
export function claimPushUrl(claimId: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      claimId,
    )
  )
    throw new Error("Invalid claim ID");
  return (
    "https://akipasa.com/en/staff/moderation?queue=claims&claim=" +
    encodeURIComponent(claimId)
  );
}
