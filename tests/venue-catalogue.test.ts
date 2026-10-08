import { describe, expect, it } from "vitest";
import {
  blankCatalogue,
  blankCatalogueItem,
  catalogueTextForDisplay,
  catalogueTextHash,
  deterministicCatalogueTranslation,
  euAllergens,
  polishCatalogueTranslation,
  seedCatalogueTranslationMetadata,
} from "../src/lib/venue-catalogue";

describe("venue catalogue foundations", () => {
  it("tracks all 14 EU allergen groups distinctly", () => {
    expect(euAllergens).toHaveLength(14);
    expect(new Set(euAllergens.map(([key]) => key)).size).toBe(14);
  });

  it("starts food safety declarations as unknown rather than safe", () => {
    const item = blankCatalogueItem();
    expect(Object.values(item.allergens.states)).toHaveLength(14);
    expect(new Set(Object.values(item.allergens.states))).toEqual(
      new Set(["unknown"]),
    );
    expect(item.allergens.crossContact).toBe("unknown");
    expect(item.allergens.reviewConfirmed).toBe(false);
  });

  it("seeds translation hashes without changing existing bilingual copy", () => {
    const doc = blankCatalogue("es");
    doc.title = { es: "Carta", en: "Menu" };
    doc.sections = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: { es: "Bebidas", en: "Drinks" },
        items: [],
      },
    ];

    const seeded = seedCatalogueTranslationMetadata(doc, "es");

    expect(seeded.title.es).toBe("Carta");
    expect(seeded.title.en).toBe("Menu");
    expect(seeded.title._translation).toEqual({
      sourceLocale: "es",
      sourceHash: catalogueTextHash("Carta"),
      esHash: catalogueTextHash("Carta"),
      enHash: catalogueTextHash("Menu"),
    });
    expect(seeded.sections[0].title._translation?.enHash).toBe(
      catalogueTextHash("Drinks"),
    );
    expect(doc.title._translation).toBeUndefined();
  });

  it("does not certify identical bilingual fallback copy as translated", () => {
    const doc = blankCatalogue("en");
    doc.sections = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: { es: "Nuts", en: "Nuts" },
        items: [],
      },
    ];

    const seeded = seedCatalogueTranslationMetadata(doc, "en");

    expect(seeded.sections[0].title._translation).toBeUndefined();
  });

  it("uses menu meaning rather than literal hardware translations", () => {
    expect(
      deterministicCatalogueTranslation("en", "es", "Nuts", "section_title"),
    ).toBe("Frutos secos");
    expect(
      deterministicCatalogueTranslation(
        "en",
        "es",
        "Dry Fruits and Nuts",
        "section_title",
      ),
    ).toBe("Frutas deshidratadas y frutos secos");
    expect(
      polishCatalogueTranslation(
        "en",
        "es",
        "a cold can of coke",
        "Un frío puede de coque",
        "item_description",
      ),
    ).toBe("Una lata fría de Coca-Cola");
    expect(
      polishCatalogueTranslation(
        "en",
        "es",
        "this is a nut",
        "Esto es una tuerca",
        "item_description",
      ),
    ).toBe("Esto es un fruto seco");
  });

  it("keeps authored menu item names instead of translating brand identity", () => {
    expect(
      catalogueTextForDisplay(
        {
          en: "Wonder Burger",
          es: "Maravilla Burger",
          _translation: {
            sourceLocale: "en",
            sourceHash: catalogueTextHash("Wonder Burger"),
          },
        },
        "es",
        "item_name",
      ),
    ).toBe("Wonder Burger");
    expect(
      catalogueTextForDisplay(
        {
          en: "almond",
          es: "almendra incorrecta",
          _translation: {
            sourceLocale: "en",
            sourceHash: catalogueTextHash("almond"),
          },
        },
        "es",
        "item_name",
      ),
    ).toBe("Almendra");
  });

  it("uses the populated language as provenance for legacy one-language copy", () => {
    const doc = blankCatalogue("en");
    doc.title = { es: "Carta de Juan", en: "" };

    const seeded = seedCatalogueTranslationMetadata(doc, "en");

    expect(seeded.title._translation?.sourceLocale).toBe("es");
    expect(seeded.title._translation?.sourceHash).toBe(
      catalogueTextHash("Carta de Juan"),
    );
  });

  it("supports the product layouts needed by different venue types", () => {
    const doc = blankCatalogue("es");
    expect(doc.schemaVersion).toBe("1");
    expect(doc.layout).toBe("menu");
    expect(doc.sections).toEqual([]);
  });
});
