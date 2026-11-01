import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  appearanceSchema,
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
} from "@/lib/pals/avatar-v2";
import {
  authoredModelId,
  STARTER_OUTFITS,
  STARTER_HAIR,
  STARTER_PALETTES,
  STARTER_HAIR_COLORS,
  PALS_RUNTIME_VERSION,
} from "@/lib/pals/starter-catalogue";
import { identityPreviewHtml } from "@/components/pals/identity-preview";

describe("authored-only starter wardrobe", () => {
  it.each([undefined, "classic-v2", "rain-v3"])(
    "maps retired/missing input %s to Rain without exposing Classic",
    (model) => {
      expect(authoredModelId(model)).toBe("rain-v3");
      expect(
        appearanceSchema.parse({ ...DEFAULT_APPEARANCE, model }).model,
      ).toBe("rain-v3");
      expect(APPEARANCE_OPTIONS.model).not.toContain("classic-v2");
    },
  );
  it("accepts all 540 bounded starter combinations for both authored models", () => {
    let total = 0;
    for (const model of APPEARANCE_OPTIONS.model)
      for (const starterOutfit of STARTER_OUTFITS)
        for (const starterHair of STARTER_HAIR)
          for (const starterPalette of STARTER_PALETTES)
            for (const starterHairColor of STARTER_HAIR_COLORS) {
              const appearance = {
                ...DEFAULT_APPEARANCE,
                model,
                starterOutfit,
                starterHair,
                starterPalette,
                starterHairColor,
              };
              expect(appearanceSchema.parse(appearance)).toEqual(appearance);
              expect(
                Buffer.byteLength(JSON.stringify({ appearance, save: true })),
              ).toBeLessThan(4096);
              total++;
            }
    expect(total).toBe(540);
  });
  it.each([
    "starterOutfit",
    "starterHair",
    "starterPalette",
    "starterHairColor",
  ])("rejects unapproved %s values", (key) => {
    expect(
      appearanceSchema.safeParse({
        ...DEFAULT_APPEARANCE,
        [key]: "https://untrusted.invalid/asset",
      }).success,
    ).toBe(false);
  });
  it("does not import or request the retired geometry from the live runtime", () => {
    const source = readFileSync("src/components/pals/studio-3d.js", "utf8");
    expect(source).not.toMatch(
      /akipals-base-|makeWardrobe|prepareBase|legacy-avatar-geometry/,
    );
    expect(source).toContain("parser.textureLoader = textures");
    expect(source).toContain("root.visible = false");
  });
  it("ships coherent versioned World/Wardrobe and accessible retry without fabricated counters", () => {
    for (const locale of ["en", "es"] as const) {
      const html = identityPreviewHtml("controlled-nonce", locale);
      expect(html).toContain(PALS_RUNTIME_VERSION);
      expect(html).toContain('id="stage-retry"');
      expect(html).toContain('aria-orientation="vertical"');
      expect(html).toContain('aria-current="page"');
      expect(html).not.toMatch(/Level 12|1,250|320 \/ 500|data-tab="Face"/);
    }
    expect(
      readFileSync("src/components/pals/WorldExplorer.tsx", "utf8"),
    ).toContain("PALS_RUNTIME_VERSION");
  });
});
