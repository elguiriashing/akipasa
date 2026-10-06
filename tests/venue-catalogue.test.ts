import { describe, expect, it } from "vitest";
import {
  blankCatalogue,
  blankCatalogueItem,
  euAllergens,
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

  it("supports the product layouts needed by different venue types", () => {
    const doc = blankCatalogue("es");
    expect(doc.schemaVersion).toBe("1");
    expect(doc.layout).toBe("menu");
    expect(doc.sections).toEqual([]);
  });
});
