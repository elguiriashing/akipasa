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
} from "../src/components/pals/legacy-avatar-geometry.js";
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
          if (frame === "male")
            expect(attributes.position.getY(i)).toBeGreaterThan(1.57);
          expect(Math.abs(attributes.position.getX(i))).toBeLessThanOrEqual(
            0.145,
          );
        }
        expect(node.material.clippingPlanes).toBeNull();
        count++;
      });
      expect(count).toBe(1);
    });
    it(`keeps the ${frame} head smooth across duplicate UV/rig seams without welding geometry`, () => {
      const base = character(frame);
      let geometry;
      base.traverse((node) => {
        if (node.isMesh && /Superhero_/i.test(node.name))
          geometry = node.geometry;
      });
      const retained = Array.from(geometry.index.array);
      const preserved = Object.fromEntries(
        ["skinIndex", "skinWeight", "uv"].map((name) => [
          name,
          Array.from(geometry.getAttribute(name).array),
        ]),
      );
      for (const face of ["oval", "round", "angular"]) {
        applyBaseColors(base, {
          ...DEFAULT_APPEARANCE,
          bodyStyle: frame === "male" ? "masculine" : "feminine",
          face,
        });
        const position = geometry.getAttribute("position"),
          normal = geometry.getAttribute("normal"),
          groups = new Map();
        let seams = 0;
        for (const index of new Set(retained)) {
          const key = [
            position.getX(index),
            position.getY(index),
            position.getZ(index),
          ]
            .map((value) => Math.round(value * 1e6))
            .join(",");
          const value = [
            normal.getX(index),
            normal.getY(index),
            normal.getZ(index),
          ];
          expect(value.every(Number.isFinite)).toBe(true);
          expect(Math.hypot(...value)).toBeCloseTo(1, 5);
          const other = groups.get(key);
          if (other) {
            expect(
              value.reduce((sum, part, i) => sum + part * other[i], 0),
            ).toBeGreaterThan(0.99999);
            seams++;
          } else groups.set(key, value);
        }
        expect(seams).toBeGreaterThan(50);
        expect(Array.from(geometry.index.array)).toEqual(retained);
        for (const name of Object.keys(preserved))
          expect(Array.from(geometry.getAttribute(name).array)).toEqual(
            preserved[name],
          );
      }
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
  it("gives each trouser style tapered knees and cuffs instead of rigid cylinders", () => {
    for (const bottom of ["cargo", "jeans", "tailored", "shorts"]) {
      const wardrobe = makeWardrobe({ ...DEFAULT_APPEARANCE, bottom });
      const legs = wardrobe.children.filter(
        (node) => node.name === "AkiPals tailored trouser leg",
      );
      expect(legs).toHaveLength(2);
      for (const leg of legs) {
        const positions = leg.geometry.attributes.position;
        const widthAt = (row) => {
          const xs = Array.from({ length: 19 }, (_, i) =>
            positions.getX(row * 19 + i),
          );
          return Math.max(...xs) - Math.min(...xs);
        };
        expect(widthAt(24)).toBeLessThan(widthAt(0) * 0.8);
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      }
    }
  });
});
