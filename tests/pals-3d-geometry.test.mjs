import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { Box3 } from "three";
import {
  applyBaseColors,
  makeHair,
  makeWardrobe,
  prepareBase,
} from "../src/components/pals/studio-3d.js";
import { DEFAULT_APPEARANCE } from "../src/lib/pals/avatar-v2";

const loaded = new Map();
beforeAll(async () => {
  for (const frame of ["female", "male"]) {
    const buffer = readFileSync(`public/pals/models/akipals-base-${frame}.glb`);
    const bytes = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    loaded.set(frame, (await new GLTFLoader().parseAsync(bytes, "")).scene);
  }
});
function character(frame = "female") {
  const base = clone(loaded.get(frame));
  prepareBase(base);
  return base;
}
function vertices(base, name = /Superhero_/i) {
  let positions;
  base.traverse((node) => {
    if (node.isMesh && name.test(node.name))
      positions = Array.from(node.geometry.attributes.position.array);
  });
  return positions;
}

describe("AkiPals actual 3D geometry, independent of WebGL", () => {
  for (const frame of ["female", "male"]) {
    it(`retains only head triangles on the ${frame} base at every avatar height`, () => {
      const base = character(frame);
      let count = 0;
      base.traverse((node) => {
        if (!node.isMesh || !/Superhero_/i.test(node.name)) return;
        const { index, attributes } = node.geometry;
        expect(index.count).toBeGreaterThan(100);
        for (const i of index.array) {
          expect(attributes.position.getY(i)).toBeGreaterThanOrEqual(1.5);
          expect(Math.abs(attributes.position.getX(i))).toBeLessThanOrEqual(
            0.145,
          );
        }
        expect(node.material.clippingPlanes).toBeNull();
        count++;
      });
      expect(count).toBe(1);
    });
  }
  for (const [key, value, mesh] of [
    ["face", "round", /Superhero_/i],
    ["eyes", "wide", /Eyes/i],
    ["brows", "bold", /Eyebrows/i],
    ["ears", "prominent", /Superhero_/i],
    ["chin", "square", /Superhero_/i],
    ["neck", "broad", /Superhero_/i],
  ]) {
    it(`changes real mesh vertices for ${key} and restores without cumulative distortion`, () => {
      const base = character();
      applyBaseColors(base, DEFAULT_APPEARANCE);
      const start = vertices(base, mesh);
      expect(start.length).toBeGreaterThan(100);
      applyBaseColors(base, { ...DEFAULT_APPEARANCE, [key]: value });
      expect(vertices(base, mesh)).not.toEqual(start);
      applyBaseColors(base, DEFAULT_APPEARANCE);
      expect(vertices(base, mesh)).toEqual(start);
      expect(vertices(base, mesh).every(Number.isFinite)).toBe(true);
    });
  }
  it("does not deform the shared GLB cache when editing an avatar", () => {
    const original = vertices(loaded.get("female"));
    const base = character();
    applyBaseColors(base, {
      ...DEFAULT_APPEARANCE,
      face: "round",
      ears: "prominent",
    });
    expect(vertices(loaded.get("female"))).toEqual(original);
  });
  it("fits hair and glasses to both body frames", () => {
    const female = makeHair(DEFAULT_APPEARANCE);
    const male = makeHair({ ...DEFAULT_APPEARANCE, bodyStyle: "masculine" });
    expect(male.position.y - female.position.y).toBeCloseTo(0.044);
    const eyeLines = [];
    for (const bodyStyle of ["feminine", "masculine"]) {
      const wardrobe = makeWardrobe({
        ...DEFAULT_APPEARANCE,
        bodyStyle,
        accessory: "glasses",
      });
      eyeLines.push(
        wardrobe
          .getObjectByName("AkiPals fitted headwear")
          .children.filter((node) => node.geometry?.type === "TorusGeometry")
          .map((node) => node.position.y),
      );
    }
    expect(eyeLines[0]).toEqual([1.655, 1.655]);
    expect(eyeLines[1]).toEqual([1.698, 1.698]);
  });
  it("keeps relaxed arms inside a standing silhouette and provides distinct boot geometry", () => {
    const sneakers = makeWardrobe(DEFAULT_APPEARANCE);
    const boots = makeWardrobe({ ...DEFAULT_APPEARANCE, shoes: "boots" });
    expect(boots.children.length).toBeGreaterThan(sneakers.children.length);
    for (const garment of [sneakers, boots]) {
      const bounds = new Box3().setFromObject(garment);
      expect(bounds.min.x).toBeGreaterThan(-0.45);
      expect(bounds.max.x).toBeLessThan(0.45);
      expect(bounds.min.y).toBeGreaterThan(-0.03);
    }
  });
});
