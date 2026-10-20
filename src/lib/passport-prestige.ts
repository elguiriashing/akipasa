import { z } from "zod";
export function prestigeEnabled() {
  return process.env.AKIPASA_PRESTIGE_ENABLED === "true";
}
const title = z.string().trim().min(3).max(100);
export const prestigeProgrammeSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{2,63}$/),
  title_es: title,
  title_en: title,
  achievement_keys: z
    .array(z.string().regex(/^[a-z][a-z0-9_]{2,63}$/))
    .min(1)
    .max(1000),
  physical_eligible: z.boolean(),
});
export const prestigeShippingSchema = z.object({
  action: z.literal("shipping_submit"),
  award_id: z.string().uuid(),
  recipient_name: z.string().trim().min(2).max(100),
  address_line1: z.string().trim().min(3).max(200),
  address_line2: z.string().trim().max(200).default(""),
  postal_code: z.string().trim().min(1).max(32),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).default(""),
  country_code: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/),
  phone: z.string().trim().max(40).default(""),
});
export const prestigeMemberSchema = z.discriminatedUnion("action", [
  prestigeShippingSchema,
  z.object({
    action: z.literal("claim"),
    programme_key: z.string().regex(/^[a-z][a-z0-9_]{2,63}$/),
  }),
  z.object({
    action: z.literal("visibility"),
    award_id: z.string().uuid(),
    shared: z.boolean(),
    hall_of_fame: z.boolean(),
    public_alias: z.string().trim().max(40),
  }),
  z.object({
    action: z.literal("request_physical"),
    award_id: z.string().uuid(),
  }),
]);
export type PrestigeRequirement = {
  key: string;
  target: number;
  current: number;
  title_es: string;
  title_en: string;
};
export type PrestigeProgramme = {
  key: string;
  title_es: string;
  title_en: string;
  physical_eligible: boolean;
  active?: boolean;
  definition_current?: boolean;
  requirements: PrestigeRequirement[];
};
export type PrestigeAward = {
  id: string;
  programme_key: string;
  serial: number;
  awarded_at: string;
  title_es: string;
  title_en: string;
  public_id: string;
  public_alias: string | null;
  shared: boolean;
  hall_of_fame: boolean;
  revoked_at: string | null;
  physical_status: string | null;
  delivery_status?: string | null;
  tracking_reference?: string | null;
  has_shipping_address?: boolean;
};
export type PrestigeState = {
  programmes: PrestigeProgramme[];
  awards: PrestigeAward[];
  fulfilment_enabled: boolean;
  shipping_intake_enabled?: boolean;
};
export type PublicPrestigeAward = Pick<
  PrestigeAward,
  | "public_id"
  | "serial"
  | "title_es"
  | "title_en"
  | "public_alias"
  | "awarded_at"
>;
export function escapePrestigeSvg(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
export function prestigeShareSvg(
  award: PublicPrestigeAward,
  locale: "en" | "es",
) {
  const label = escapePrestigeSvg(
      locale === "es" ? award.title_es : award.title_en,
    ),
    alias = escapePrestigeSvg(award.public_alias || "AkiPasa");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="foil"><stop stop-color="#7ae4ff"/><stop offset=".35" stop-color="#f8c7ff"/><stop offset=".7" stop-color="#ffe6a0"/><stop offset="1" stop-color="#86ffc4"/></linearGradient></defs><rect width="1200" height="630" fill="#091c32"/><rect x="30" y="30" width="1140" height="570" rx="32" fill="none" stroke="url(#foil)" stroke-width="5"/><path d="M560 95h80l-10 88-30 27-30-27z M600 210v35m-35 0h70" fill="url(#foil)" stroke="url(#foil)" stroke-width="8"/><text x="600" y="310" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${Math.min(36, Math.floor(1000 / (Math.max(1, label.length) * 0.65)))}">${label}</text><text x="600" y="385" text-anchor="middle" fill="url(#foil)" font-family="sans-serif" font-size="38">${alias}</text><text x="600" y="470" text-anchor="middle" fill="#b3cbdd" font-family="sans-serif" font-size="22">AkiPasa · ${locale === "es" ? "Reconocimiento verificado" : "Verified achievement"} · #${Number(award.serial)}</text><text x="600" y="530" text-anchor="middle" fill="#b3cbdd" font-family="sans-serif" font-size="18">akipasa.com</text></svg>`;
}

export function prestigeDeliveryLabel(
  status: string | null | undefined,
  locale: "en" | "es",
) {
  const labels: Record<string, [string, string]> = {
    disabled: ["Disabled", "Desactivada"],
    awaiting_address: ["Awaiting address", "Esperando dirección"],
    ready: ["Ready for review", "Lista para revisión"],
    preparing: ["Preparing", "En preparación"],
    shipped: ["Shipped", "Enviado"],
    delivered: ["Delivered", "Entregado"],
    cancelled: ["Cancelled", "Cancelado"],
  };
  return (labels[status || "disabled"] || ["Unavailable", "No disponible"])[
    locale === "es" ? 1 : 0
  ];
}
