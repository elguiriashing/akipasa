import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  authoredWardrobeCatalogue,
  SUPPORTED_AUTHORED_OPTIONS,
} from "@/lib/pals/catalogue";
import {
  appearanceSchema,
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
  renderHumanAvatar,
  authoredAppearance,
  characterAppearance,
  APPEARANCE_PALETTES,
} from "@/lib/pals/avatar-v2";

describe("AkiPals human avatar identity", () => {
  it("has a valid free starter appearance with an authored model", () => {
    expect(appearanceSchema.safeParse(DEFAULT_APPEARANCE).success).toBe(true);
    expect(DEFAULT_APPEARANCE.model).toBe("rain-v3");
    for (const [key, choices] of Object.entries(APPEARANCE_OPTIONS)) {
      expect(choices).toContain(
        DEFAULT_APPEARANCE[key as keyof typeof DEFAULT_APPEARANCE],
      );
      expect(choices.length).toBeGreaterThan(1);
    }
  });

  it("keeps older saved wardrobe choices on their original model", () => {
    const legacy: Record<string, unknown> = {
      ...DEFAULT_APPEARANCE,
      skin: "deep",
      hair: "bun",
      top: "jacket",
      bottom: "tailored",
      bag: "backpack",
    };
    delete legacy.model;
    expect(appearanceSchema.parse(legacy)).toEqual({
      ...legacy,
      model: "classic-v2",
    });
  });

  it("keeps the server model choices aligned with the local renderer allowlist", () => {
    const renderer = readFileSync("src/components/pals/studio-3d.js", "utf8");
    const models = renderer.match(
      /const PROFESSIONAL_MODELS = \{([\s\S]*?)\n\};/,
    );
    expect(models).not.toBeNull();
    const ids = [
      ...models![1].matchAll(
        /"([a-z]+-v\d+)":\s*"(\/pals\/models\/professional\/[^"\s]+\.glb)"/g,
      ),
    ].map((match) => match[1]);
    expect(APPEARANCE_OPTIONS.model).toEqual(ids);
    expect(APPEARANCE_OPTIONS.model).not.toContain("classic-v2");
  });

  it("projects legacy saves onto authored characters without mutating stored choices", () => {
    for (const bodyStyle of ["feminine", "masculine"] as const) {
      const legacy = {
        ...DEFAULT_APPEARANCE,
        model: "classic-v2" as const,
        bodyStyle,
        hair: "bun" as const,
        top: "jacket" as const,
      };
      const before = structuredClone(legacy);
      const look = authoredAppearance(legacy);
      expect(legacy).toEqual(before);
      expect(look.model).toBe(
        bodyStyle === "masculine" ? "snow-v4" : "rain-v3",
      );
      expect(look.hair).toBe(bodyStyle === "masculine" ? "crop" : "bun");
      expect(look.top).toBe("jacket");
    }
  });

  it("has distinct valid character defaults and closed natural skin swatches", () => {
    for (const model of ["rain-v3", "snow-v4"] as const) {
      expect(appearanceSchema.parse(characterAppearance(model)).model).toBe(
        model,
      );
    }
    expect(characterAppearance("rain-v3")).not.toEqual(
      characterAppearance("snow-v4"),
    );
    expect(Object.keys(APPEARANCE_PALETTES.skin)).toEqual(
      APPEARANCE_OPTIONS.skin,
    );
    expect(APPEARANCE_OPTIONS.skin).not.toContain("blue");
    for (const palette of Object.values(APPEARANCE_PALETTES)) {
      for (const colour of Object.values(palette))
        expect(colour).toMatch(/^#[A-Fa-f0-9]{6}$/);
    }
  });

  it("offers only enumerated fitted authored slots while preserving legacy data", () => {
    for (const model of ["rain-v3", "snow-v4"] as const) {
      const slots = authoredWardrobeCatalogue(model);
      expect(slots.map((slot) => slot.slot)).toEqual(["hair", "top"]);
      for (const slot of slots)
        for (const item of slot.items) {
          expect(APPEARANCE_OPTIONS[slot.slot]).toContain(item.value);
          expect(item.price).toBeNull();
          expect(item.model).toBe(model);
        }
      expect(SUPPORTED_AUTHORED_OPTIONS[model].hair).not.toContain("buzz");
    }
  });

  it("defaults additive material colours for older saves without requiring a backfill", () => {
    const old: Record<string, unknown> = { ...DEFAULT_APPEARANCE };
    delete old.bottomColor;
    delete old.shoeColor;
    const before = structuredClone(old);
    expect(appearanceSchema.parse(old)).toMatchObject({
      bottomColor: "ink",
      shoeColor: "cream",
    });
    expect(old).toEqual(before);
    expect(JSON.stringify(DEFAULT_APPEARANCE).length).toBeLessThan(4096);
    expect(
      appearanceSchema.safeParse({ ...old, bottomColor: "#0000ff" }).success,
    ).toBe(false);
  });

  it("rejects extra fields, injected markup and invalid body values", () => {
    expect(
      appearanceSchema.safeParse({
        ...DEFAULT_APPEARANCE,
        userId: "someone-else",
      }).success,
    ).toBe(false);
    expect(
      appearanceSchema.safeParse({
        ...DEFAULT_APPEARANCE,
        top: "sponsored-premium",
      }).success,
    ).toBe(false);
    expect(
      appearanceSchema.safeParse({
        ...DEFAULT_APPEARANCE,
        hair: "<script>alert(1)</script>",
      }).success,
    ).toBe(false);
  });

  it("renders an accessible SVG that differs across saved looks", () => {
    const starter = renderHumanAvatar(DEFAULT_APPEARANCE);
    expect(starter).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(starter).toContain('role="img"');
    expect(starter).not.toContain("<script");
    const second = renderHumanAvatar({
      ...DEFAULT_APPEARANCE,
      skin: "deep",
      hairColor: "blue",
      hair: "bun",
      shoulders: "wide",
      top: "hoodie",
    });
    expect(second).not.toBe(starter);
    expect(second).toContain("#604034");
    expect(second).toContain("#4E73B6");
    expect(second).toContain("circle");
  });

  it("sanitises SVG IDs to avoid caller-supplied attributes", () => {
    const svg = renderHumanAvatar(DEFAULT_APPEARANCE, 'evil" onload="alert(1)');
    expect(svg).not.toContain("onload=");
    expect(svg).not.toContain("<script");
    expect(svg).toContain("evilonloadalert1");
  });
});
