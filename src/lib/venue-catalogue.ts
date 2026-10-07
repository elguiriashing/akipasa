export const euAllergens = [
  ["gluten", "🌾", "Gluten", "Gluten"],
  ["crustaceans", "🦐", "Crustáceos", "Crustaceans"],
  ["eggs", "🥚", "Huevos", "Eggs"],
  ["fish", "🐟", "Pescado", "Fish"],
  ["peanuts", "🥜", "Cacahuetes", "Peanuts"],
  ["soy", "🫘", "Soja", "Soy"],
  ["milk", "🥛", "Leche", "Milk"],
  ["nuts", "🌰", "Frutos de cáscara", "Tree nuts"],
  ["celery", "🌿", "Apio", "Celery"],
  ["mustard", "🟡", "Mostaza", "Mustard"],
  ["sesame", "⚪", "Sésamo", "Sesame"],
  ["sulphites", "🍷", "Sulfitos", "Sulphites"],
  ["lupin", "🌼", "Altramuces", "Lupin"],
  ["molluscs", "🦪", "Moluscos", "Molluscs"],
] as const;

export type AllergenKey = (typeof euAllergens)[number][0];
export type AllergenState =
  | "unknown"
  | "contains"
  | "may_contain"
  | "not_in_recipe";

export type CatalogueText = {
  es: string;
  en: string;
  _translation?: {
    sourceLocale: "es" | "en";
    sourceHash: string;
    esHash?: string;
    enHash?: string;
  };
};
export type CatalogueLayout =
  | "menu"
  | "cards"
  | "services"
  | "rentals"
  | "experiences";
export type CatalogueItemKind =
  | "food"
  | "drink"
  | "product"
  | "service"
  | "rental"
  | "experience"
  | "ticket"
  | "package";

export type CatalogueItem = {
  id: string;
  name: CatalogueText;
  description: CatalogueText;
  kind: CatalogueItemKind;
  visible: boolean;
  containsFood: boolean;
  availability: "available" | "sold_out" | "seasonal" | "on_request";
  priceMode: "fixed" | "from" | "on_request";
  priceCents: number | null;
  unit: "each" | "person" | "session" | "hour" | "day" | "night" | "month" | "kg";
  durationMinutes?: number | null;
  capacity?: number | null;
  variants: Array<{
    id: string;
    label: CatalogueText;
    priceCents: number;
    unit: CatalogueItem["unit"];
  }>;
  allergens: {
    states: Record<AllergenKey, AllergenState>;
    cereals: string[];
    nuts: string[];
    crossContact: "unknown" | "possible" | "assessed";
    ingredients: CatalogueText;
    notes: CatalogueText;
    reviewedAt?: string | null;
    reviewConfirmed?: boolean;
  };
};

export type VenueCatalogueDocument = {
  schemaVersion: "1";
  title: CatalogueText;
  description: CatalogueText;
  layout: CatalogueLayout;
  sections: Array<{
    id: string;
    title: CatalogueText;
    items: CatalogueItem[];
  }>;
};

export function catalogueTextHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function seedTextTranslationMetadata(
  pair: CatalogueText,
  preferredLocale: "es" | "en",
) {
  const esValue = pair.es.trim();
  const enValue = pair.en.trim();

  // Exact bilingual copies are commonly the non-blocking fallback from a
  // translator outage. Do not certify them as translated or catalogue saves
  // will never retry them. Proper nouns may be retried, which is harmless.
  if (esValue && esValue === enValue) {
    delete pair._translation;
    return;
  }

  if (pair._translation?.esHash && pair._translation?.enHash) return;
  const sourceLocale =
    pair[preferredLocale].trim() || !pair[preferredLocale === "es" ? "en" : "es"].trim()
      ? preferredLocale
      : preferredLocale === "es"
        ? "en"
        : "es";
  const source = pair[sourceLocale].trim();
  pair._translation = {
    sourceLocale,
    sourceHash: catalogueTextHash(source),
    esHash: catalogueTextHash(pair.es.trim()),
    enHash: catalogueTextHash(pair.en.trim()),
  };
}

export function seedCatalogueTranslationMetadata(
  input: VenueCatalogueDocument,
  preferredLocale: "es" | "en",
): VenueCatalogueDocument {
  const document = JSON.parse(JSON.stringify(input)) as VenueCatalogueDocument;
  seedTextTranslationMetadata(document.title, preferredLocale);
  seedTextTranslationMetadata(document.description, preferredLocale);

  for (const section of document.sections) {
    seedTextTranslationMetadata(section.title, preferredLocale);
    for (const item of section.items) {
      seedTextTranslationMetadata(item.name, preferredLocale);
      seedTextTranslationMetadata(item.description, preferredLocale);
      for (const variant of item.variants) {
        seedTextTranslationMetadata(variant.label, preferredLocale);
      }
      seedTextTranslationMetadata(item.allergens.ingredients, preferredLocale);
      seedTextTranslationMetadata(item.allergens.notes, preferredLocale);
    }
  }

  return document;
}

export const defaultAllergenStates = Object.fromEntries(
  euAllergens.map(([key]) => [key, "unknown"]),
) as Record<AllergenKey, AllergenState>;

export function blankCatalogue(locale: "es" | "en"): VenueCatalogueDocument {
  const title =
    locale === "es"
      ? { es: "Carta y servicios", en: "Menu & services" }
      : { es: "Carta y servicios", en: "Menu & services" };
  return {
    schemaVersion: "1",
    title,
    description: { es: "", en: "" },
    layout: "menu",
    sections: [],
  };
}

export function blankCatalogueItem(): CatalogueItem {
  return {
    id: crypto.randomUUID(),
    name: { es: "", en: "" },
    description: { es: "", en: "" },
    kind: "product",
    visible: true,
    containsFood: false,
    availability: "available",
    priceMode: "fixed",
    priceCents: 0,
    unit: "each",
    variants: [],
    allergens: {
      states: { ...defaultAllergenStates },
      cereals: [],
      nuts: [],
      crossContact: "unknown",
      ingredients: { es: "", en: "" },
      notes: { es: "", en: "" },
      reviewedAt: null,
      reviewConfirmed: false,
    },
  };
}

export function parseCatalogueDocument(
  value: unknown,
  locale: "es" | "en",
): VenueCatalogueDocument {
  if (!value || typeof value !== "object") return blankCatalogue(locale);
  const candidate = value as Partial<VenueCatalogueDocument>;
  if (
    candidate.schemaVersion !== "1" ||
    !Array.isArray(candidate.sections) ||
    !candidate.title ||
    !candidate.description
  )
    return blankCatalogue(locale);

  const document = candidate as VenueCatalogueDocument;
  return {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        allergens: {
          ...item.allergens,
          reviewConfirmed:
            Boolean(item.allergens.reviewConfirmed) ||
            Boolean(item.allergens.reviewedAt),
        },
      })),
    })),
  };
}
