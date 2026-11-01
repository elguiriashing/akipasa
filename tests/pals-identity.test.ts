import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  appearanceSchema,
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
  renderHumanAvatar,
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

  it("retains legacy styling data but projects only an authored model", () => {
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
      model: "rain-v3",
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
