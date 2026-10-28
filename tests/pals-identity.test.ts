import { describe, expect, it } from "vitest";
import {
  appearanceSchema,
  APPEARANCE_OPTIONS,
  DEFAULT_APPEARANCE,
  renderHumanAvatar,
} from "@/lib/pals/avatar-v2";

describe("AkiPals human avatar identity", () => {
  it("has a valid fully customisable free starter appearance", () => {
    expect(appearanceSchema.safeParse(DEFAULT_APPEARANCE).success).toBe(true);
    for (const [key, choices] of Object.entries(APPEARANCE_OPTIONS)) {
      expect(choices).toContain(
        DEFAULT_APPEARANCE[key as keyof typeof DEFAULT_APPEARANCE],
      );
      expect(choices.length).toBeGreaterThan(1);
    }
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
