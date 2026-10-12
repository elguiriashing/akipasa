// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { designs, families, getDesign, SLOTS } from "../src/lib/pals/engine";
import { itemSvg, palSvg } from "../src/lib/pals/art";
import { legacyCatalogue } from "../src/lib/pals/catalogue-legacy";
import {
  familyStyles,
  stylesForItem,
  wardrobeCategories,
} from "../src/lib/pals/style-guide";

function parseSvg(svg: string) {
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(document.querySelector("parsererror")).toBeNull();
  return document;
}

describe("AkiPals original art and outfit compatibility", () => {
  it("offers ten complete collectable styles without granting or selling earned trophies", () => {
    expect(Object.keys(familyStyles).sort()).toEqual(
      families.map((family) => family.id).sort(),
    );
    expect(wardrobeCategories.map((category) => category.slot)).toEqual(SLOTS);
    for (const family of families) {
      const style = familyStyles[family.id];
      const pieces = style.signature.map(getDesign);
      expect(pieces.map((piece) => piece.slot)).toEqual(SLOTS);
      expect(new Set(pieces.map((piece) => piece.id)).size).toBe(4);
      for (const piece of pieces) {
        expect(piece.source).not.toBe("earned");
        expect(stylesForItem(piece.id)).toContain(family.id);
      }
    }
    const catalogue = legacyCatalogue();
    expect(catalogue.items.map((item) => item.id)).toEqual(
      designs.map((design) => design.id),
    );
    for (const item of catalogue.items) {
      expect(item.metadata.styleIds).toEqual(stylesForItem(item.id));
      if (item.prestigious) {
        expect(item.price).toBeNull();
        expect(item.metadata.styleIds).toEqual([]);
      }
    }
  });

  it("renders every item and all base, master and curated family looks as self-contained SVG", () => {
    const vectors = [
      ...designs.map(itemSvg),
      ...families.flatMap((family) => [
        palSvg(family.id, [], `base-${family.id}`),
        palSvg(family.id, family.master, `master-${family.id}`, true),
        palSvg(
          family.id,
          familyStyles[family.id].signature,
          `signature-${family.id}`,
          true,
        ),
      ]),
    ];
    const document = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg">${vectors.join("")}</svg>`,
    );
    expect(document.querySelectorAll('svg[role="img"]').length).toBe(
      vectors.length,
    );
    expect(
      document.querySelector("script, foreignObject, image, animate, filter"),
    ).toBeNull();
    for (const path of document.querySelectorAll("path[d]"))
      expect(path.getAttribute("d")).toMatch(
        /^[MmLlHhVvCcSsQqTtAaZzEe0-9+.,\s-]+$/,
      );
    const ids = [...document.querySelectorAll("[id]")].map(
      (element) => element.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives coats, jackets, patchwork, vests and wraps their own wearable silhouettes", () => {
    const outlines = ["jacket", "coat", "patch", "vest", "robe"].map(
      (shape) => {
        const item = designs.find((design) => design.shape === shape)!;
        const document = parseSvg(itemSvg(item));
        const outline = document.querySelector("path")!.getAttribute("d");
        return outline;
      },
    );
    expect(new Set(outlines).size).toBe(5);
  });

  it("keeps six city keepsakes visually distinct and text-safe", () => {
    const emblems = designs
      .filter((design) => design.city)
      .map((design) => {
        const document = parseSvg(itemSvg(design));
        const emblem = document.querySelector("[data-city-emblem]");
        expect(emblem?.getAttribute("data-city-emblem")).toBe(design.city);
        const mark = emblem?.querySelector("g")?.innerHTML;
        return mark;
      });
    expect(emblems).toHaveLength(6);
    expect(new Set(emblems).size).toBe(6);
    const svg = itemSvg({ ...designs[0], name: '<script>alert("x")</script>' });
    const document = parseSvg(svg);
    expect(document.querySelector("script")).toBeNull();
    expect(document.documentElement.getAttribute("aria-label")).toBe(
      '<script>alert("x")</script>',
    );
  });
});
