import type { Event } from "./domain";
import type { Locale } from "./config";
import { msg } from "./messages";

export function eventPriceLabel(
  event: Pick<Event, "priceCents" | "currency" | "priceDisplayMode">,
  locale: Locale,
): string | null {
  if (event.priceDisplayMode === "hide") return null;
  if (event.priceCents === 0) return msg(locale).free;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: event.currency,
    minimumFractionDigits: event.priceCents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(event.priceCents / 100);
}
