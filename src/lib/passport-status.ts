import type { Locale } from "./config";

const labels = {
  claim: {
    ready: { en: "Ready to redeem", es: "Lista para canjear" },
    redeemed: { en: "Redeemed", es: "Canjeada" },
    expired: { en: "Expired", es: "Caducada" },
  },
  enrollment: {
    active: { en: "In progress", es: "En curso" },
    completed: { en: "Completed", es: "Completado" },
    redeemed: { en: "Reward claimed", es: "Recompensa solicitada" },
    expired: { en: "Expired", es: "Caducado" },
  },
} as const;

export function passportStatusLabel(
  kind: keyof typeof labels,
  value: unknown,
  locale: Locale,
) {
  if (typeof value !== "string")
    return locale === "es" ? "Estado desconocido" : "Unknown status";
  const item = labels[kind][value as keyof (typeof labels)[typeof kind]] as
    | Record<Locale, string>
    | undefined;
  return (
    item?.[locale] ||
    (locale === "es" ? "Estado desconocido" : "Unknown status")
  );
}
