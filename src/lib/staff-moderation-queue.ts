import type { Locale } from "./config";

export const STAFF_MODERATION_QUEUES = [
  "venues",
  "events",
  "offers",
  "community",
  "claims",
  "rentals",
] as const;
export type StaffModerationQueue = (typeof STAFF_MODERATION_QUEUES)[number];
export const STAFF_QUEUE_PAGE_SIZE = 20;
export const STAFF_QUEUE_MAX_PAGE = 10001;

export function parseStaffQueuePage(value: unknown) {
  return typeof value === "string" && /^\d{1,5}$/.test(value)
    ? Math.min(STAFF_QUEUE_MAX_PAGE, Math.max(1, Number(value)))
    : 1;
}

export function parseStaffQueue(value: unknown): StaffModerationQueue {
  return typeof value === "string" &&
    STAFF_MODERATION_QUEUES.includes(value as StaffModerationQueue)
    ? (value as StaffModerationQueue)
    : "venues";
}

export function staffQueueForTarget(value: unknown): StaffModerationQueue {
  switch (value) {
    case "event":
      return "events";
    case "offer":
      return "offers";
    case "submission":
      return "community";
    case "venue_claim":
      return "claims";
    case "rental_company":
      return "rentals";
    default:
      return "venues";
  }
}

type Notice = {
  updated?: "decision" | "review" | "automatic-mode";
  error?: "decision" | "review" | "automatic-mode";
  mail?: "sent" | "not_sent";
};
export function staffModerationHref(
  locale: Locale,
  queue: StaffModerationQueue,
  page = 1,
  notice: Notice = {},
) {
  const query = new URLSearchParams({ queue });
  if (page > 1 || queue === "claims")
    query.set("page", String(parseStaffQueuePage(String(page))));
  if (notice.updated) query.set("updated", notice.updated);
  if (notice.error) query.set("error", notice.error);
  if (queue === "claims" && notice.mail) query.set("mail", notice.mail);
  return `/${locale}/staff/moderation?${query}`;
}

export function staffQueueStateLabel(
  value: string | null | undefined,
  locale: Locale,
) {
  const states: Record<string, { en: string; es: string }> = {
    pending: { en: "Pending review", es: "Pendiente de revisión" },
    pending_review: { en: "Pending review", es: "Pendiente de revisión" },
    approved: { en: "Approved", es: "Aprobado" },
    published: { en: "Published", es: "Publicado" },
    rejected: { en: "Rejected", es: "Rechazado" },
  };
  return Object.hasOwn(states, value || "")
    ? states[value!][locale]
    : locale === "es"
      ? "Estado no disponible"
      : "Status unavailable";
}
