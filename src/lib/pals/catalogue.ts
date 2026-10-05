import type { Family, Rarity, Slot, Stat } from "./engine";

export type CosmeticSource =
  | "starter" | "shop" | "achievement" | "passport" | "city" | "adventure"
  | "event" | "seasonal" | "premium" | "sponsored" | "promotional" | "purchase";

export type Currency = "threads" | "scrap" | "real_money";
export type EffectKind = "glow" | "particles" | "holographic" | "flames" | "snow" | "leaves" | "electricity" | "trail";

export type CosmeticRender =
  | { kind: "legacy-shape"; shape: string; colour: string; trim: string }
  | { kind: "svg"; assetKey: string }
  | { kind: "effect"; effect: EffectKind; config?: Record<string, unknown> };

export type CosmeticItem = {
  id: string;
  name: string;
  collectionId: string;
  slot: Slot | "effect";
  rarity: Rarity;
  render: CosmeticRender;
  compatibleFamilies: Family[] | "all";
  source: CosmeticSource;
  releaseAt?: string | null;
  retireAt?: string | null;
  unlockRuleIds: string[];
  price?: { currency: Currency; amount: number } | null;
  cityId?: string | null;
  eventId?: string | null;
  venueId?: string | null;
  brandId?: string | null;
  campaignId?: string | null;
  stat?: Stat | null;
  prestigious?: boolean;
  metadata: Record<string, unknown>;
};

export type CollectionUnlockMethod =
  | "mixed" | "shop" | "earned" | "campaign" | "premium" | "promotional";

export type CosmeticCollection = {
  id: string;
  title: string;
  description: string;
  artworkKey?: string | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  cities?: string[];
  regions?: string[];
  brandId?: string | null;
  campaignId?: string | null;
  itemIds: string[];
  unlockMethod: CollectionUnlockMethod;
  commerce?: { externalUrl?: string | null; productKey?: string | null } | null;
  metadata: Record<string, unknown>;
};

export type Brand = {
  id: string;
  name: string;
  logoAssetKey?: string | null;
  website?: string | null;
  metadata: Record<string, unknown>;
};

export type Campaign = {
  id: string;
  title: string;
  brandId?: string | null;
  collectionIds: string[];
  activeFrom?: string | null;
  activeUntil?: string | null;
  regions?: string[];
  cities?: string[];
  unlockRuleIds: string[];
  externalCommerceUrl?: string | null;
  analyticsKey?: string | null;
  metadata: Record<string, unknown>;
};

export type Catalogue = {
  items: CosmeticItem[];
  collections: CosmeticCollection[];
  brands: Brand[];
  campaigns: Campaign[];
};

export function itemAvailable(item: CosmeticItem, now = new Date()) {
  const time = now.getTime();
  return (!item.releaseAt || Date.parse(item.releaseAt) <= time) &&
    (!item.retireAt || Date.parse(item.retireAt) > time);
}

export function itemPurchasable(item: CosmeticItem) {
  return Boolean(item.price) && !item.prestigious &&
    !["achievement","passport","city","adventure"].includes(item.source);
}

export function validateCatalogue(catalogue: Catalogue) {
  const ids = new Set<string>();
  for (const item of catalogue.items) {
    if (ids.has(item.id)) throw new Error(`Duplicate cosmetic item: ${item.id}`);
    ids.add(item.id);
    if (item.prestigious && item.price) throw new Error(`Prestigious item cannot be sold: ${item.id}`);
  }
  const collectionIds = new Set(catalogue.collections.map((c) => c.id));
  for (const item of catalogue.items)
    if (!collectionIds.has(item.collectionId))
      throw new Error(`Unknown collection ${item.collectionId} for ${item.id}`);
  return true;
}
