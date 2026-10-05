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

export function campaignAvailable(
  campaign: Campaign,
  context: { now?: Date; region?: string | null; city?: string | null } = {},
) {
  const time = (context.now ?? new Date()).getTime();
  if (campaign.activeFrom && Date.parse(campaign.activeFrom) > time) return false;
  if (campaign.activeUntil && Date.parse(campaign.activeUntil) <= time) return false;
  if (campaign.regions?.length && (!context.region || !campaign.regions.includes(context.region)))
    return false;
  if (campaign.cities?.length && (!context.city || !campaign.cities.includes(context.city)))
    return false;
  return true;
}

export function itemPurchasable(item: CosmeticItem) {
  return Boolean(item.price) && !item.prestigious &&
    !["achievement","passport","city","adventure"].includes(item.source);
}

export function validateCatalogue(catalogue: Catalogue) {
  const itemIds = new Set<string>();
  const collectionIds = new Set<string>();
  const brandIds = new Set<string>();
  const campaignIds = new Set<string>();

  for (const brand of catalogue.brands) {
    if (brandIds.has(brand.id)) throw new Error(`Duplicate brand: ${brand.id}`);
    brandIds.add(brand.id);
  }
  for (const campaign of catalogue.campaigns) {
    if (campaignIds.has(campaign.id)) throw new Error(`Duplicate campaign: ${campaign.id}`);
    campaignIds.add(campaign.id);
  }
  for (const collection of catalogue.collections) {
    if (collectionIds.has(collection.id))
      throw new Error(`Duplicate collection: ${collection.id}`);
    collectionIds.add(collection.id);
  }
  for (const item of catalogue.items) {
    if (itemIds.has(item.id)) throw new Error(`Duplicate cosmetic item: ${item.id}`);
    itemIds.add(item.id);
    if (item.prestigious && item.price)
      throw new Error(`Prestigious item cannot be sold: ${item.id}`);
  }

  for (const campaign of catalogue.campaigns) {
    if (campaign.brandId && !brandIds.has(campaign.brandId))
      throw new Error(`Unknown brand ${campaign.brandId} for campaign ${campaign.id}`);
    for (const collectionId of campaign.collectionIds)
      if (!collectionIds.has(collectionId))
        throw new Error(`Unknown collection ${collectionId} for campaign ${campaign.id}`);
  }

  for (const collection of catalogue.collections) {
    if (collection.brandId && !brandIds.has(collection.brandId))
      throw new Error(`Unknown brand ${collection.brandId} for collection ${collection.id}`);
    if (collection.campaignId && !campaignIds.has(collection.campaignId))
      throw new Error(`Unknown campaign ${collection.campaignId} for collection ${collection.id}`);
    for (const itemId of collection.itemIds)
      if (!itemIds.has(itemId))
        throw new Error(`Unknown item ${itemId} in collection ${collection.id}`);
  }

  for (const item of catalogue.items) {
    if (!collectionIds.has(item.collectionId))
      throw new Error(`Unknown collection ${item.collectionId} for ${item.id}`);
    if (item.brandId && !brandIds.has(item.brandId))
      throw new Error(`Unknown brand ${item.brandId} for ${item.id}`);
    if (item.campaignId && !campaignIds.has(item.campaignId))
      throw new Error(`Unknown campaign ${item.campaignId} for ${item.id}`);
  }
  return true;
}
