import type { Occurrence } from "./domain";

export function requestedOccurrenceId(value: unknown) {
  return typeof value === "string" && /^[a-z0-9-]{1,100}$/i.test(value)
    ? value
    : undefined;
}

export function selectEventOccurrence(
  occurrences: Occurrence[],
  requested: unknown,
  now = new Date(),
) {
  const requestedId = requestedOccurrenceId(requested);
  return (
    (requestedId
      ? occurrences.find((occurrence) => occurrence.id === requestedId)
      : undefined) ||
    occurrences.find(
      (occurrence) =>
        occurrence.status !== "cancelled" && new Date(occurrence.endsAt) > now,
    ) ||
    occurrences[0]
  );
}

export function occurrenceHref(path: string, occurrenceId: string) {
  const query = new URLSearchParams({ occurrence: occurrenceId });
  return `${path}?${query}`;
}
