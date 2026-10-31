import type { DiscoveryResult } from "./domain";
import type { Locale } from "./config";
import { spainLocations } from "./locations";
import { madridLocalDateTimeSchema, windowBounds } from "./time";

/** Launch presets only; discovery remains available nationwide through existing Map/Search. */
export const tonightAreas = [
  { key: "fuengirola", ...spainLocations.fuengirola },
  { key: "mijas", ...spainLocations.mijas },
  {
    key: "benalmadena",
    es: "Benalmádena",
    en: "Benalmádena",
    latitude: 36.5920669488551,
    longitude: -4.52491812657954,
  },
  {
    key: "torremolinos",
    es: "Torremolinos",
    en: "Torremolinos",
    latitude: 36.6216216,
    longitude: -4.5013116,
  },
  { key: "marbella", ...spainLocations.marbella },
  { key: "malaga", ...spainLocations.malaga },
] as const;

export const tonightIntents = [
  { key: "all", es: "Cualquier plan", en: "Any plan" },
  { key: "dancing", es: "Bailar", en: "Dancing" },
  { key: "live-music", es: "Música en directo", en: "Live music" },
  { key: "cocktails", es: "Cócteles", en: "Cocktails" },
  { key: "food", es: "Comer", en: "Food" },
  { key: "sports", es: "Deporte", en: "Sports" },
  { key: "social", es: "Conocer gente", en: "Social activities" },
  { key: "surprise", es: "Sorpréndeme", en: "Something different" },
] as const;

export type TonightIntent = (typeof tonightIntents)[number]["key"];
export type TonightBudget = "any" | "free" | "15" | "30" | "60";
export type TonightCompany = "solo" | "date" | "friends";
export type TonightStart = "now" | "18" | "20" | "22" | "0";

export type TonightPreferences = {
  intent: TonightIntent;
  area: (typeof tonightAreas)[number]["key"];
  radiusKm: 5 | 15 | 25 | 50;
  budget: TonightBudget;
  company: TonightCompany;
  people: 1 | 2 | 4 | 6 | 8;
  start: TonightStart;
};

type RawQuery = Record<string, string | string[] | undefined>;

function one(query: RawQuery, key: string) {
  const value = query[key];
  return typeof value === "string" ? value : "";
}

/** User-provided GET parameters are allowlisted before reaching the repository. */
export function parseTonightPreferences(query: RawQuery): TonightPreferences {
  const intent = one(query, "intent");
  const area = one(query, "area");
  const radius = Number(one(query, "radius"));
  const budget = one(query, "budget");
  const company = one(query, "company");
  const people = Number(one(query, "people"));
  const start = one(query, "start");
  return {
    intent: tonightIntents.find((entry) => entry.key === intent)?.key || "all",
    area: tonightAreas.find((entry) => entry.key === area)?.key || "fuengirola",
    radiusKm: ([5, 15, 25, 50] as number[]).includes(radius)
      ? (radius as TonightPreferences["radiusKm"])
      : 15,
    budget: (["any", "free", "15", "30", "60"] as string[]).includes(budget)
      ? (budget as TonightBudget)
      : "any",
    company: (["solo", "date", "friends"] as string[]).includes(company)
      ? (company as TonightCompany)
      : "friends",
    people: ([1, 2, 4, 6, 8] as number[]).includes(people)
      ? (people as TonightPreferences["people"])
      : 4,
    start: (["now", "18", "20", "22", "0"] as string[]).includes(start)
      ? (start as TonightStart)
      : "now",
  };
}

export function tonightArea(preferences: TonightPreferences) {
  return (
    tonightAreas.find((area) => area.key === preferences.area) ||
    tonightAreas[0]
  );
}

/** Retry the same bounded plan without replaying arbitrary incoming query values. */
export function tonightPlanHref(
  locale: Locale,
  preferences: TonightPreferences,
) {
  const query = new URLSearchParams({
    intent: preferences.intent,
    area: preferences.area,
    radius: String(preferences.radiusKm),
    budget: preferences.budget,
    company: preferences.company,
    people: String(preferences.people),
    start: preferences.start,
  });
  return `/${locale}/tonight?${query}`;
}

export function tonightMaximumPriceCents(budget: TonightBudget) {
  return budget === "any" ? undefined : Number(budget) * 100 || 0;
}

function publishedText(result: DiscoveryResult) {
  const { title, description } = result.event;
  return [title.es, title.en, description.es, description.en]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Conservative matching: no unsupported guess that a pub has DJs or live sport. */
export function matchesTonightIntent(
  result: DiscoveryResult,
  intent: TonightIntent,
) {
  if (intent === "all" || intent === "surprise") return true;
  const text = publishedText(result);
  if (intent === "dancing")
    return /\b(dj|dancing|dance|disco|discoteca|baile|fiesta|techno|reggaeton|reggaetón|club night)\b/i.test(
      text,
    );
  if (intent === "live-music")
    return (
      result.event.category === "music" &&
      /\b(live|concert|gig|actuación|concierto|directo|jam|en vivo)\b/i.test(
        text,
      )
    );
  if (intent === "cocktails")
    return /\b(cocktails?|c[oó]ctel(?:es)?|mixolog[ií]a)\b/i.test(text);
  if (intent === "food") return result.event.category === "food";
  if (intent === "sports")
    return /\b(sports?|deportes?|football|f[uú]tbol|partido|match|rugby|f1)\b/i.test(
      text,
    );
  return ["social", "workshop"].includes(result.event.category);
}

function madridArrival(start: TonightStart, now: Date) {
  const [nightStart, nightEnd] = windowBounds("tonight", now);
  if (start === "now") return { arrival: now, nightStart, nightEnd };
  // Midnight belongs to the following calendar day of this same night.
  // Compare instants rather than end-hour numbers: 22:30 is after 22:00,
  // and an overnight event can continue after 06:00 or cross a DST boundary.
  const date = start === "0" ? nightEnd : nightStart;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const hour = start === "0" ? "00" : start;
  const selected = madridLocalDateTimeSchema.parse(
    `${parts.year}-${parts.month}-${parts.day}T${hour}:00`,
  );
  return {
    arrival: new Date(Math.max(now.getTime(), selected.getTime())),
    nightStart,
    nightEnd,
  };
}

/**
 * Filter a real discovery response, not a second event source.
 * A selected group size is never interpreted as capacity or a confirmed booking.
 * Preserve the existing organic/sponsored ranking and sponsorship labels.
 */
export function selectTonightEvents<T extends { result: DiscoveryResult }>(
  items: readonly T[],
  preferences: TonightPreferences,
  now = new Date(),
): T[] {
  const maxPrice = tonightMaximumPriceCents(preferences.budget);
  const { arrival, nightStart, nightEnd } = madridArrival(
    preferences.start,
    now,
  );
  return items
    .filter(({ result }) => {
      const start = new Date(result.occurrence.startsAt).getTime();
      const end = new Date(result.occurrence.endsAt).getTime();
      if (
        result.occurrence.status !== "scheduled" ||
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start >= end ||
        end <= arrival.getTime() ||
        end <= nightStart.getTime() ||
        start >= nightEnd.getTime()
      )
        return false;
      if (
        maxPrice !== undefined &&
        (result.event.priceDisplayMode === "hide" ||
          result.event.priceCents > maxPrice)
      )
        return false;
      if (!matchesTonightIntent(result, preferences.intent)) return false;
      return true;
    })
    .slice(0, 18);
}
