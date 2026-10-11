/**
 * The Staff overview is a summary of the same moderation queues that Staff can
 * review. Null means a counter could not be loaded, not an empty queue.
 */
export type StaffModerationCounts = {
  venues: number | null;
  events: number | null;
  offers: number | null;
  community: number | null;
  claims: number | null;
};

export function summarizeStaffModerationCounts(counts: StaffModerationCounts) {
  const values = [
    counts.venues,
    counts.events,
    counts.offers,
    counts.community,
    counts.claims,
  ];
  const complete = values.every(
    (count): count is number =>
      typeof count === "number" && Number.isSafeInteger(count) && count >= 0,
  );
  const pending = complete
    ? (values as number[]).reduce((total, count) => total + count, 0)
    : null;
  return { pending, complete, claims: counts.claims, venues: counts.venues };
}
