import { designs } from "./engine";
import type { Catalogue, CosmeticCollection, CosmeticItem, CosmeticSource } from "./catalogue";

const ORIGINALS = "akipasa-originals";
const CITY = "city-keepsakes";
const EXPLORER = "explorer-story";

function legacySource(source: "starter" | "shop" | "earned", city?: string): CosmeticSource {
  if (city) return "city";
  if (source === "earned") return "achievement";
  return source;
}

export function legacyCatalogue(): Catalogue {
  const items: CosmeticItem[] = designs.map((design) => ({
    id: design.id,
    name: design.name,
    collectionId: design.city ? CITY : design.source === "earned" ? EXPLORER : ORIGINALS,
    slot: design.slot,
    rarity: design.rarity,
    render: {
      kind: "legacy-shape",
      shape: design.shape,
      colour: design.colour,
      trim: design.trim,
    },
    compatibleFamilies: "all",
    source: legacySource(design.source, design.city),
    unlockRuleIds: [],
    price:
      design.source === "shop" || design.source === "starter"
        ? { currency: "threads", amount: design.price }
        : null,
    cityId: design.city?.toLocaleLowerCase("en").normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? null,
    eventId: null,
    venueId: null,
    brandId: null,
    campaignId: null,
    stat: design.stat,
    prestigious: design.source === "earned",
    metadata: { legacy: true },
  }));

  const collections: CosmeticCollection[] = [
    {
      id: ORIGINALS,
      title: "AkiPasa Originals",
      description: "The core AkiPals wardrobe and signature looks.",
      itemIds: items.filter((item) => item.collectionId === ORIGINALS).map((item) => item.id),
      unlockMethod: "mixed",
      metadata: { legacy: true, firstParty: true },
    },
    {
      id: CITY,
      title: "City Keepsakes",
      description: "Prestigious city-linked pieces earned through real AkiPasa progress.",
      itemIds: items.filter((item) => item.collectionId === CITY).map((item) => item.id),
      unlockMethod: "earned",
      metadata: { legacy: true, firstParty: true },
    },
    {
      id: EXPLORER,
      title: "Explorer Story",
      description: "Milestone pieces tied to verified AkiPasa achievements.",
      itemIds: items.filter((item) => item.collectionId === EXPLORER).map((item) => item.id),
      unlockMethod: "earned",
      metadata: { legacy: true, firstParty: true },
    },
  ];

  return { items, collections, brands: [], campaigns: [] };
}
