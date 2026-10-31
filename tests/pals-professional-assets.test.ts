import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Glb = {
  asset: { version: string };
  buffers: Array<{ uri?: string }>;
  images: Array<{ uri?: string; bufferView?: number }>;
  meshes: Array<{
    name: string;
    primitives: Array<{
      indices: number;
      attributes: { POSITION: number; TEXCOORD_0: number };
      material: number;
    }>;
  }>;
  nodes: Array<{ name?: string }>;
  materials: Array<{
    name: string;
    pbrMetallicRoughness?: { baseColorTexture?: { index: number } };
  }>;
  accessors: Array<{ count: number; min?: number[]; max?: number[] }>;
  skins?: unknown[];
  animations?: unknown[];
};

describe("licensed authored AkiPals characters", () => {
  const manifest = JSON.parse(
    readFileSync("public/pals/models/professional/manifest.json", "utf8"),
  ) as {
    models: Array<{
      id: string;
      url: string;
      bytes: number;
      sha256: string;
      license: string;
      credit: string;
      archiveSha256: string;
    }>;
  };

  for (const id of ["rain-v3", "snow-v4"]) {
    it(`${id} contains a complete textured authored body within the mobile budget`, () => {
      const entry = manifest.models.find((model) => model.id === id)!;
      expect(entry).toBeDefined();
      expect(entry.url).toBe(`/pals/models/professional/${id}-20261031.glb`);
      const bytes = readFileSync("public" + entry.url);
      expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
      expect(bytes.readUInt32LE(4)).toBe(2);
      expect(bytes.readUInt32LE(8)).toBe(bytes.length);
      expect(bytes.length).toBe(entry.bytes);
      expect(bytes.length).toBeGreaterThan(500_000);
      expect(bytes.length).toBeLessThanOrEqual(12 * 1024 * 1024);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        entry.sha256,
      );
      const jsonLength = bytes.readUInt32LE(12);
      const model = JSON.parse(
        bytes.subarray(20, 20 + jsonLength).toString(),
      ) as Glb;
      expect(model.asset.version).toBe("2.0");
      expect(model.buffers.every((buffer) => !buffer.uri)).toBe(true);
      expect(model.images.length).toBeGreaterThanOrEqual(4);
      expect(
        model.images.every(
          (image) => !image.uri && Number.isInteger(image.bufferView),
        ),
      ).toBe(true);
      expect(
        model.materials.filter(
          (material) => material.pbrMetallicRoughness?.baseColorTexture,
        ).length,
      ).toBeGreaterThanOrEqual(4);
      for (const part of ["body", "head", "hair", "shoe"])
        expect(
          model.meshes.some((mesh) => mesh.name.toLowerCase().includes(part)),
        ).toBe(true);
      expect(
        model.nodes.some((node) =>
          /WGT-|META-|RIG-|nomask|viewport/.test(node.name ?? ""),
        ),
      ).toBe(false);
      expect(model.skins?.length ?? 0).toBe(0);
      expect(model.animations?.length ?? 0).toBe(0);
      const primitives = model.meshes.flatMap((mesh) => mesh.primitives);
      const triangles = primitives.reduce(
        (total, primitive) =>
          total + model.accessors[primitive.indices].count / 3,
        0,
      );
      expect(triangles).toBeGreaterThan(20_000);
      expect(triangles).toBeLessThanOrEqual(125_000);
      const positions = primitives.map(
        (primitive) => model.accessors[primitive.attributes.POSITION],
      );
      const minY = Math.min(...positions.map((position) => position.min![1]));
      const maxY = Math.max(...positions.map((position) => position.max![1]));
      expect(minY).toBeCloseTo(0, 3);
      expect(maxY).toBeCloseTo(1.8, 3);
      expect(entry.license).toBe("CC-BY-4.0");
      expect(entry.credit).toContain(
        "Rig (CC) Blender Foundation | studio.blender.org",
      );
      expect(entry.archiveSha256).toMatch(/^[a-f0-9]{64}$/);
    });
  }
});
