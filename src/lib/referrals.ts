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

export function referralReviewLabel(kind: string, locale: "en" | "es") {
  const labels: Record<string, [string, string]> = {
    eligible: ["Eligibility recorded", "Elegibilidad registrada"],
    approved: ["Administratively approved", "Aprobación administrativa"],
    held: ["Held", "Retenida"],
    rejected: ["Rejected", "Rechazada"],
    unapproved_or_missing_rule: [
      "Missing prospective terms or commission rule",
      "Faltan condiciones o reglas prospectivas de comisión",
    ],
    invalid_recipient: ["Invalid recipient", "Destinatario no válido"],
    inactive_programme_or_code: [
      "Inactive programme or code",
      "Programa o código inactivo",
    ],
    representative_not_approved: [
      "Representative not approved",
      "Representante no aprobado",
    ],
    billing_hold: [
      "Verified refund or dispute hold",
      "Retención por reembolso o disputa verificada",
    ],
    open_review_case: ["Unresolved review case", "Caso de revisión pendiente"],
  };
  return Object.hasOwn(labels, kind)
    ? labels[kind][locale === "es" ? 1 : 0]
    : locale === "es"
      ? "Revisión necesaria"
      : "Review required";
}

const representativeInvoiceSchema = z.object({
  reference: z.string().regex(/^[a-f0-9]{32}$/),
  code: referralCodeSchema,
  product: z.string().nullable(),
  recorded_at: z.string(),
  currency: z
    .string()
    .regex(/^[a-z]{3}$/)
    .nullable(),
  proposed_cents: z.number().int().nonnegative().nullable(),
  terms_version: z.string().nullable(),
  blockers: z.array(z.string()),
  review_state: z.enum(["eligible", "approved", "held", "rejected"]).nullable(),
  effective_approval: z.boolean(),
  status: z.enum(["pending", "approved", "held", "rejected"]),
  reviews: z
    .array(
      z.object({
        state: z.enum(["eligible", "approved", "held", "rejected"]),
        reviewed_at: z.string(),
      }),
    )
    .max(10),
  reviews_truncated: z.boolean(),
  payable: z.literal(false),
  payouts_enabled: z.literal(false),
});
export const representativeEvidenceSchema = z.object({
  days: z.union([z.literal(30), z.literal(90), z.literal(365)]),
  since: z.string(),
  subscriptions: z
    .array(
      z.object({
        reference: z.string().regex(/^[a-f0-9]{32}$/),
        latest_evidence_at: z.string(),
        invoice_count: z.number().int().nonnegative(),
        invoices_truncated: z.boolean(),
        invoices: z.array(representativeInvoiceSchema).max(10),
      }),
    )
    .max(50),
  subscriptions_truncated: z.boolean(),
  payable: z.literal(false),
  payouts_enabled: z.literal(false),
});
export type RepresentativeEvidence = z.infer<
  typeof representativeEvidenceSchema
>;
