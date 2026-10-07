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


function normalizeComparableCatalogueText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

function setEnglishSourceSpanishTarget(pair: CatalogueText, spanish: string) {
  const english = pair.en.trim();
  pair.es = spanish;
  pair._translation = {
    sourceLocale: "en",
    sourceHash: catalogueTextHash(english),
    esHash: catalogueTextHash(pair.es.trim()),
    enHash: catalogueTextHash(english),
  };
}

function normalizeFoodPair(pair: CatalogueText) {
  const english = normalizeComparableCatalogueText(pair.en);
  if (!english) return;

  const exactSpanish: Record<string, string> = {
    nuts: "Frutos secos",
    "tree nuts": "Frutos de cáscara",
    "dry fruits and nuts": "Frutas deshidratadas y frutos secos",
    "dried fruits and nuts": "Frutas deshidratadas y frutos secos",
    drinks: "Bebidas",
    beverages: "Bebidas",
    burgers: "Hamburguesas",
    burger: "Hamburguesa",
    almond: "Almendra",
    almonds: "Almendras",
    peanut: "Cacahuete",
    peanuts: "Cacahuetes",
  };

  const exact = exactSpanish[english];
  if (exact) {
    setEnglishSourceSpanishTarget(pair, exact);
    return;
  }

  const cokeCan = english.match(
    /^(?:a\s+)?(?:(cold|chilled)\s+)?can\s+of\s+(?:coke|coca[- ]?cola)([.!?]*)$/,
  );
  if (cokeCan) {
    const cold = cokeCan[1] ? " fría" : "";
    const punctuation = cokeCan[2] || "";
    setEnglishSourceSpanishTarget(
      pair,
      `Una lata${cold} de Coca-Cola${punctuation}`,
    );
  }
}

export function normalizeCatalogueFoodTranslations(
  input: VenueCatalogueDocument,
): VenueCatalogueDocument {
  const document = JSON.parse(JSON.stringify(input)) as VenueCatalogueDocument;

  for (const section of document.sections) {
    const foodSection = section.items.some(
      (item) =>
        item.kind === "food" ||
        item.kind === "drink" ||
        Boolean(item.containsFood),
    );

    if (foodSection) normalizeFoodPair(section.title);

    for (const item of section.items) {
      const foodItem =
        item.kind === "food" ||
        item.kind === "drink" ||
        Boolean(item.containsFood);
      if (!foodItem) continue;

      normalizeFoodPair(item.name);
      normalizeFoodPair(item.description);
      for (const variant of item.variants) normalizeFoodPair(variant.label);
      normalizeFoodPair(item.allergens.ingredients);
      normalizeFoodPair(item.allergens.notes);
    }
  }

  return document;
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
  const normalized = normalizeCatalogueFoodTranslations(document);
  return {
    ...normalized,
    sections: normalized.sections.map((section) => ({
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
