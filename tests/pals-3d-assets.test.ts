import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appearanceSchema, DEFAULT_APPEARANCE } from "@/lib/pals/avatar-v2";

/** Structural GLB checks; real rendering is separately covered by Chromium. */
function inspectGLB(frame: "female" | "male") {
  const bytes = readFileSync(
    "public/pals/models/akipals-base-" + frame + ".glb",
  );
  expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  expect(bytes.length).toBeGreaterThan(100_000);
  expect(bytes.length).toBeLessThan(2_000_000);
  const chunkSize = bytes.readUInt32LE(12);
  expect(bytes.readUInt32LE(16)).toBe(0x4e4f534a);
  const json = JSON.parse(bytes.subarray(20, 20 + chunkSize).toString("utf8"));
  return json as {
    asset: { version: string };
    skins: Array<{ joints: number[] }>;
    meshes: Array<{ primitives: unknown[] }>;
    nodes: Array<{ name?: string }>;
    buffers: Array<{ uri?: string }>;
  };
}

describe("AkiPals licensed 3D model fixtures", () => {
  for (const frame of ["female", "male"] as const) {
    it("contains a real rigged " + frame + " mesh", () => {
      const model = inspectGLB(frame);
      expect(model.asset.version).toBe("2.0");
      expect(model.skins.some((skin) => skin.joints.length >= 50)).toBe(true);
      expect(model.meshes.length).toBeGreaterThan(0);
      expect(model.nodes.some((node) => node.name === "Head")).toBe(true);
      expect(model.buffers.every((buffer) => !buffer.uri)).toBe(true);
    });
  }
  it("supports validated saved body frame and clothing options", () => {
    expect(appearanceSchema.parse(DEFAULT_APPEARANCE).bodyStyle).toBe(
      "feminine",
    );
    const look = appearanceSchema.parse({
      ...DEFAULT_APPEARANCE,
      bodyStyle: "masculine",
      top: "jacket",
      bottom: "tailored",
      shoes: "boots",
      bag: "backpack",
      accessory: "glasses",
    });
    expect(look.bottom).toBe("tailored");
    expect(
      appearanceSchema.safeParse({
        ...look,
        bag: "somebody-elses-paid-bag",
      }).success,
    ).toBe(false);
  });
  it("upgrades legacy appearance records with starter wardrobe defaults", () => {
    const legacy: Record<string, unknown> = { ...DEFAULT_APPEARANCE };
    delete legacy.bodyStyle;
    delete legacy.bottom;
    delete legacy.shoes;
    delete legacy.bag;
    delete legacy.accessory;
    const look = appearanceSchema.parse(legacy);
    expect(look.bodyStyle).toBe("feminine");
    expect(look.bottom).toBe("cargo");
    expect(look.shoes).toBe("sneakers");
    expect(look.bag).toBe("crossbody");
    expect(look.accessory).toBe("none");
  });
});
