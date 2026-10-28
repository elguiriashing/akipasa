import type { Locale } from "./config";

export type PlanShortcut = "today" | "tonight" | "weekend" | "free";

export function madridToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** Existing discovery URL contract, no new tracking or GPS request. */
export function planShortcutHref(
  locale: Locale,
  location: {
    locality: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  },
  shortcut: PlanShortcut,
  now = new Date(),
) {
  const params = new URLSearchParams({
    locality: location.locality,
    locationName: location.name,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    radius: String(location.radius),
    time: shortcut === "tonight" || shortcut === "weekend" ? shortcut : "all",
  });
  if (shortcut === "today") {
    const today = madridToday(now);
    params.set("dateFrom", today);
    params.set("dateTo", today);
  }
  if (shortcut === "free") params.set("price", "free");
  return `/${locale}?${params.toString()}#results`;
}
