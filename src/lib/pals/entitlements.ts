import type { CosmeticSource } from "./catalogue";

export type EntitlementStatus = "active" | "revoked" | "expired";

export type Entitlement = {
  id: string;
  itemId: string;
  grantedAt: string;
  obtainedVia: CosmeticSource | "admin";
  sourceType: string;
  sourceId?: string | null;
  expiresAt?: string | null;
  quantity: number;
  status: EntitlementStatus;
  metadata: Record<string, unknown>;
};

export function activeEntitlements(
  entitlements: Entitlement[],
  now = new Date(),
) {
  const time = now.getTime();
  return entitlements.filter(
    (entitlement) =>
      entitlement.status === "active" &&
      (!entitlement.expiresAt || Date.parse(entitlement.expiresAt) > time),
  );
}

export function ownsItem(entitlements: Entitlement[], itemId: string) {
  return activeEntitlements(entitlements).some(
    (entitlement) => entitlement.itemId === itemId && entitlement.quantity > 0,
  );
}

export function entitlementReason(entitlement: Entitlement) {
  return {
    obtainedVia: entitlement.obtainedVia,
    sourceType: entitlement.sourceType,
    sourceId: entitlement.sourceId ?? null,
    grantedAt: entitlement.grantedAt,
    metadata: entitlement.metadata,
  };
}

export function legacyWardrobeEntitlements(
  wardrobe: string[],
  grantedAt: string,
): Entitlement[] {
  return wardrobe.map((itemId, index) => ({
    id: `legacy:${index}:${itemId}`,
    itemId,
    grantedAt,
    obtainedVia: "admin",
    sourceType: "legacy-save",
    sourceId: null,
    quantity: 1,
    status: "active",
    metadata: { migratedFromWardrobe: true },
  }));
}
