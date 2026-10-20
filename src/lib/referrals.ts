import { z } from "zod";

export const referralCodeSchema = z.string().regex(/^[A-Z0-9]{8,24}$/);
export const referralProductSchema = z.enum([
  "akipasa",
  "akiduermo",
  "akicoches",
  "akihq",
  "akibusiness",
]);
export function referralCode(value: unknown): string | null {
  const parsed = referralCodeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
/** Deliberately ignores arbitrary hosts, user IDs and monetary values from URLs. */
export function referralShareUrl(code: string, locale: "en" | "es") {
  return `https://akipasa.com/${locale}/referrals?ref=${referralCodeSchema.parse(code)}`;
}
export const referralDashboardSchema = z.object({
  codes: z.array(
    z.object({
      code: referralCodeSchema,
      revoked: z.boolean(),
      expires_at: z.string().nullable(),
    }),
  ),
  referrals: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  invoice_count: z.number().int().nonnegative(),
  available_programmes: z.array(
    z.object({ id: z.string().uuid(), name: z.string() }),
  ),
  recent_activity: z.array(
    z.object({
      kind: z.enum(["paid", "refund_hold", "dispute_hold"]),
      recorded_at: z.string(),
    }),
  ),
  held: z.literal(true),
  payouts_enabled: z.literal(false),
});

export function referralCaseLabel(kind: string, locale: "en" | "es") {
  const labels: Record<string, [string, string]> = {
    attribution_dispute: ["Attribution dispute", "Disputa de atribución"],
    fraud: ["Possible fraud", "Posible fraude"],
    refund: ["Refund", "Reembolso"],
    other: ["Other", "Otro"],
  };
  return Object.hasOwn(labels, kind)
    ? labels[kind][locale === "es" ? 1 : 0]
    : labels.other[locale === "es" ? 1 : 0];
}
export function referralEvidenceLabel(kind: string, locale: "en" | "es") {
  const labels: Record<string, [string, string]> = {
    paid: ["Verified paid invoice", "Factura pagada verificada"],
    refund_hold: ["Refund hold", "Retención por reembolso"],
    dispute_hold: ["Dispute hold", "Retención por disputa"],
  };
  return Object.hasOwn(labels, kind)
    ? labels[kind][locale === "es" ? 1 : 0]
    : locale === "es"
      ? "Revisión pendiente"
      : "Review pending";
}
