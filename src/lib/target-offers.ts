/** Informational target contract. Never consumed by checkout or entitlement grants. */
export const targetOfferVersion = "akisuite-roles-v1" as const;
export type TargetProduct =
  | "akipasa"
  | "akiduermo"
  | "akicoches"
  | "akihq"
  | "akibusiness";
export type TargetScope =
  | "account"
  | "venue"
  | "property"
  | "rental_branch"
  | "workspace"
  | "management";
export type OfferBlocker =
  | "features"
  | "location_scope"
  | "listing_scope"
  | "new_entitlement"
  | "catalogue_pricing"
  | "tax"
  | "sandbox_lifecycle";
const launch = ["new_entitlement", "tax", "sandbox_lifecycle"] as const;

export const targetOffers = [
  {
    id: "roles_v1_pasa_personal",
    name: "AkiPasa Premium",
    product: "akipasa",
    scope: "account",
    monthlyTargetCents: 199,
    blockers: [...launch],
  },
  {
    id: "roles_v1_duermo_personal",
    name: "AkiDuermo Premium",
    product: "akiduermo",
    scope: "account",
    monthlyTargetCents: 199,
    blockers: ["features", "catalogue_pricing", ...launch],
  },
  {
    id: "roles_v1_coches_personal",
    name: "AkiCoches Premium",
    product: "akicoches",
    scope: "account",
    monthlyTargetCents: 199,
    blockers: ["features", "catalogue_pricing", ...launch],
  },
  {
    id: "roles_v1_pasa_listing",
    name: "AkiPasa for Business",
    product: "akipasa",
    scope: "venue",
    monthlyTargetCents: 1499,
    blockers: ["features", "listing_scope", "catalogue_pricing", ...launch],
  },
  {
    id: "roles_v1_duermo_listing",
    name: "AkiDuermo for Business",
    product: "akiduermo",
    scope: "property",
    monthlyTargetCents: 1499,
    blockers: ["features", "listing_scope", "catalogue_pricing", ...launch],
  },
  {
    id: "roles_v1_coches_listing",
    name: "AkiCoches for Business",
    product: "akicoches",
    scope: "rental_branch",
    monthlyTargetCents: 1499,
    blockers: ["features", "listing_scope", "catalogue_pricing", ...launch],
  },
  {
    id: "roles_v1_hq_management",
    name: "AkiHQ",
    product: "akihq",
    scope: "management",
    monthlyTargetCents: 0,
    blockers: [],
  },
  {
    id: "roles_v1_business_standard",
    name: "AkiBusiness Standard",
    product: "akibusiness",
    scope: "workspace",
    monthlyTargetCents: 2499,
    blockers: ["features", "location_scope", "catalogue_pricing", ...launch],
  },
  {
    id: "roles_v1_business_plus",
    name: "AkiBusiness Plus",
    product: "akibusiness",
    scope: "workspace",
    monthlyTargetCents: 4499,
    blockers: ["features", "location_scope", "catalogue_pricing", ...launch],
  },
  {
    id: "roles_v1_business_pro",
    name: "AkiBusiness Pro",
    product: "akibusiness",
    scope: "workspace",
    monthlyTargetCents: 6499,
    blockers: ["features", "location_scope", "catalogue_pricing", ...launch],
  },
] as const satisfies readonly {
  id: string;
  name: string;
  product: TargetProduct;
  scope: TargetScope;
  monthlyTargetCents: number;
  blockers: readonly OfferBlocker[];
}[];
export type TargetOfferId = (typeof targetOffers)[number]["id"];

export function targetOffer(id: string) {
  return targetOffers.find((offer) => offer.id === id);
}

/** No live prices, automatic annual discounts, checkout or inherited grants. */
export function targetOfferReadiness(id: string) {
  const offer = targetOffer(id);
  if (!offer) return null;
  return {
    version: targetOfferVersion,
    status:
      offer.scope === "management"
        ? ("free_management" as const)
        : ("blocked" as const),
    checkoutEnabled: false as const,
    blockers: offer.blockers,
    annual:
      offer.scope === "management"
        ? null
        : { targetCents: null, blocker: "annual_policy" as const },
    stripePriceId: null,
  };
}

/** Structural scope validation only; this is never authorization or proof of payment.
 * Future server grants must independently verify subscription, ownership and membership.
 */
export function targetOfferScopeMatches(id: string, subject: unknown): boolean {
  const offer = targetOffer(id);
  if (
    !offer ||
    offer.scope === "management" ||
    typeof subject !== "object" ||
    subject === null
  )
    return false;
  const scope = subject as Record<string, unknown>;
  if (
    scope.kind !== offer.scope ||
    scope.product !== offer.product ||
    typeof scope.id !== "string"
  )
    return false;
  return offer.scope === "workspace"
    ? /^[a-z0-9][a-z0-9_-]{2,79}$/.test(scope.id)
    : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        scope.id,
      );
}

export const targetOfferBlockerCopy: Record<
  OfferBlocker,
  { en: string; es: string }
> = {
  features: {
    en: "Included benefits and feature acceptance are still being defined.",
    es: "Las prestaciones incluidas y su validación aún están pendientes.",
  },
  location_scope: {
    en: "Access and staff permissions must be verified for one operating location.",
    es: "El acceso y los permisos del equipo deben verificarse para una ubicación operativa.",
  },
  listing_scope: {
    en: "Paid benefits must be verified for one listing only.",
    es: "Las ventajas de pago deben verificarse para un único anuncio.",
  },
  new_entitlement: {
    en: "The new offer's payment and access lifecycle is not activated.",
    es: "El ciclo de pago y acceso de esta nueva oferta no está activado.",
  },
  catalogue_pricing: {
    en: "The live product, price and scope must be reconciled with this target.",
    es: "El producto, precio y alcance actuales deben conciliarse con este objetivo.",
  },
  tax: {
    en: "Tax and invoice treatment still require commercial verification.",
    es: "El tratamiento fiscal y la facturación requieren verificación comercial.",
  },
  sandbox_lifecycle: {
    en: "Isolated checkout, renewal, cancellation and access tests are pending.",
    es: "Quedan pendientes las pruebas aisladas de pago, renovación, cancelación y acceso.",
  },
};
