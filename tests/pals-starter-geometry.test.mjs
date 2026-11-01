import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LoadingManager, TextureLoader } from "three";
import {
  cloneProfessionalModel,
  createAuthoredLoader,
} from "../src/components/pals/studio-3d.js";
import { applyStarterStyle } from "../src/components/pals/starter-style.js";
import { DEFAULT_APPEARANCE } from "../src/lib/pals/avatar-v2";

const sources = new Map();
beforeAll(async () => {
  for (const id of ["rain-v3", "snow-v4"]) {
    const bytes = readFileSync(
      `public/pals/models/professional/${id}-20261031.glb`,
    );
    const jsonLength = bytes.readUInt32LE(12);
    const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
    // Geometry-only Node proof. Actual embedded-image decoding belongs to the
    // separate real WebGL browser gate, not a synthetic texture claim here.
    for (const material of json.materials) {
      for (const field of [
        "normalTexture",
        "occlusionTexture",
        "emissiveTexture",
      ])
        delete material[field];
      if (material.pbrMetallicRoughness) {
        delete material.pbrMetallicRoughness.baseColorTexture;
        delete material.pbrMetallicRoughness.metallicRoughnessTexture;
      }
    }
    json.images = [];
    json.textures = [];
    json.samplers = [];
    const text = Buffer.from(JSON.stringify(json));
    const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32);
    text.copy(padded);
    const binaryChunk = bytes.subarray(20 + jsonLength);
    const header = Buffer.alloc(20);
    header.write("glTF");
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(20 + padded.length + binaryChunk.length, 8);
    header.writeUInt32LE(padded.length, 12);
    header.writeUInt32LE(0x4e4f534a, 16);
    const rebuilt = Buffer.concat([header, padded, binaryChunk]);
    sources.set(
      id,
      (
        await new GLTFLoader().parseAsync(
          rebuilt.buffer.slice(
            rebuilt.byteOffset,
            rebuilt.byteOffset + rebuilt.byteLength,
          ),
          "",
        )
      ).scene,
    );
  }
});

describe("starter styles fitted to actual authored geometry", () => {
  it("selects the standard HTML image texture loader without changing global browser APIs", () => {
    const loader = createAuthoredLoader();
    const parser = {
      options: { manager: new LoadingManager(), crossOrigin: "anonymous" },
    };
    loader.pluginCallbacks.at(-1)(parser);
    expect(parser.textureLoader).toBeInstanceOf(TextureLoader);
    expect(parser.textureLoader.crossOrigin).toBe("anonymous");
  });
  for (const id of ["rain-v3", "snow-v4"]) {
    it(`${id}: every starter garment/hair switch retains coverage and restores geometry`, () => {
      const source = sources.get(id),
        model = cloneProfessionalModel(source);
      const originalHair = new Map();
      model.traverse((node) => {
        if (node.isMesh && /hair/.test(node.name))
          originalHair.set(
            node.name,
            Array.from(node.geometry.attributes.position.array),
          );
      });
      for (const starterOutfit of ["crew", "varsity", "explorer"]) {
        for (const starterHair of ["original", "swept", "cropped"]) {
          applyStarterStyle(model, {
            ...DEFAULT_APPEARANCE,
            model: id,
            starterOutfit,
            starterHair,
          });
          const baseTop = [];
          model.traverse((node) => {
            if (node.isMesh && /GEO-(rain-top|snow-shirt)/.test(node.name))
              baseTop.push(node);
          });
          expect(baseTop.length).toBeGreaterThan(0);
          expect(baseTop.every((node) => node.visible)).toBe(true);
          const garments = model.getObjectByName("AkiPals starter garments");
          expect(garments).toBeTruthy();
          expect(
            garments.children.every((node) =>
              Array.from(node.geometry.attributes.position.array).every(
                Number.isFinite,
              ),
            ),
          ).toBe(true);
          for (const node of garments.children.filter((node) =>
            /vest|trim/.test(node.name),
          ))
            expect(node.geometry.index.count).toBeGreaterThan(0);
        }
      }
      applyStarterStyle(model, {
        ...DEFAULT_APPEARANCE,
        model: id,
        starterHair: "original",
      });
      model.traverse((node) => {
        if (originalHair.has(node.name))
          expect(Array.from(node.geometry.attributes.position.array)).toEqual(
            originalHair.get(node.name),
          );
      });
      expect(
        source.getObjectByName("AkiPals starter garments"),
      ).toBeUndefined();
      const second = cloneProfessionalModel(source);
      expect(
        second.getObjectByName("AkiPals starter garments"),
      ).toBeUndefined();
    });
  }
});
