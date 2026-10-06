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

export type CatalogueText = { es: string; en: string };
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
  return candidate as VenueCatalogueDocument;
}
