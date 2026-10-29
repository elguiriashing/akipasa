import { madridLocalDateTimeSchema } from "./time";

export type VenueCredentialVisit = {
  venue_id: string | null;
  state: string;
  credential_id: string | null;
  created_at: string;
};

type MadridWeek = {
  start: Date;
  end: Date;
};

function madridCalendarDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)),
  );
}

function localMidnight(date: Date) {
  const value = `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}T00:00`;
  return madridLocalDateTimeSchema.parse(value);
}

/** Civil-time Monday boundaries, not fixed UTC offsets or a 168-hour assumption. */
export function currentMadridQuestWeek(now = new Date()): MadridWeek {
  const today = madridCalendarDay(now);
  const daysFromMonday = (today.getUTCDay() + 6) % 7;
  const monday = new Date(today);
  monday.setUTCDate(monday.getUTCDate() - daysFromMonday);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  return {
    start: localMidnight(monday),
    end: localMidnight(nextMonday),
  };
}

export type WeeklyQuestProgress = {
  distinctVerifiedVenues: number;
  milestones: Array<{
    id: "first-venue" | "two-venues";
    target: number;
    completed: number;
    achieved: boolean;
  }>;
};

/**
 * Only existing accepted, venue-credential backed visits appear as progress.
 * A GPS-only acceptance, duplicate, cooldown, untrusted future time or bare
 * page view is never enough. No XP, premium benefit or redemption is written.
 */
export function weeklyCredentialQuestProgress(
  rows: readonly VenueCredentialVisit[],
  now = new Date(),
): WeeklyQuestProgress {
  const { start, end } = currentMadridQuestWeek(now);
  const uniqueVenues = new Set<string>();
  for (const visit of rows) {
    if (visit.state !== "accepted" || !visit.credential_id || !visit.venue_id)
      continue;
    const timestamp = new Date(visit.created_at).getTime();
    if (
      !Number.isFinite(timestamp) ||
      timestamp < start.getTime() ||
      timestamp >= end.getTime() ||
      timestamp > now.getTime()
    )
      continue;
    uniqueVenues.add(visit.venue_id);
  }
  const count = uniqueVenues.size;
  return {
    distinctVerifiedVenues: count,
    milestones: [
      {
        id: "first-venue",
        target: 1,
        completed: Math.min(1, count),
        achieved: count >= 1,
      },
      {
        id: "two-venues",
        target: 2,
        completed: Math.min(2, count),
        achieved: count >= 2,
      },
    ],
  };
}
