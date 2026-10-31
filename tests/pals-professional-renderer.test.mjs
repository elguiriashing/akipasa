import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from "three";
import {
  assertProfessionalTextures,
  cloneProfessionalModel,
} from "../src/components/pals/studio-3d.js";

describe("professional character resource ownership", () => {
  it("rejects the partial grey result GLTFLoader returns when a colour texture fails", () => {
    const scene = new Group();
    const names = ["skin", "hair", "jeans", "eyes"];
    for (const name of names) {
      const material = new MeshStandardMaterial({
        map: new Texture({ width: 2, height: 2 }),
      });
      material.name = name;
      scene.add(new Mesh(new BoxGeometry(), material));
    }
    const gltf = {
      scene,
      parser: {
        json: {
          materials: names.map((name) => ({
            name,
            pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
          })),
        },
      },
    };
    expect(() => assertProfessionalTextures(gltf)).not.toThrow();
    scene.children[0].material.map = null;
    expect(() => assertProfessionalTextures(gltf)).toThrow(
      "textures did not finish loading",
    );
  });
  it("preserves the full authored mesh/materials while giving mounted stages separate GPU resources", () => {
    const authored = new Group();
    const texture = new Texture({ width: 2, height: 2 });
    const material = new MeshStandardMaterial({
      map: texture,
      color: "#a68b73",
    });
    for (const part of ["head", "body", "shirt"])
      authored.add(
        Object.assign(new Mesh(new BoxGeometry(), material), { name: part }),
      );
    const wardrobe = cloneProfessionalModel(authored);
    const world = cloneProfessionalModel(authored);
    expect(wardrobe.children.map((child) => child.name)).toEqual([
      "head",
      "body",
      "shirt",
    ]);
    expect(wardrobe.children[0].material.color.getHex()).toBe(
      material.color.getHex(),
    );
    expect(wardrobe.children[0].geometry.attributes.position.array).toEqual(
      authored.children[0].geometry.attributes.position.array,
    );
    expect(wardrobe.children[0].geometry).not.toBe(
      authored.children[0].geometry,
    );
    expect(world.children[0].geometry).not.toBe(wardrobe.children[0].geometry);
    expect(world.children[0].material).not.toBe(wardrobe.children[0].material);
    expect(world.children[0].material.map).not.toBe(
      wardrobe.children[0].material.map,
    );
    expect(wardrobe.children[0].material.map).not.toBe(texture);
    expect(wardrobe.children[0].material.map.image).toBe(texture.image);
    expect(wardrobe.children[0].material).toBe(wardrobe.children[1].material);
    wardrobe.children[0].geometry.attributes.position.setY(0, 99);
    wardrobe.children[0].material.color.set("red");
    expect(world.children[0].geometry.attributes.position.getY(0)).not.toBe(99);
    expect(world.children[0].material.color.getHex()).toBe(
      material.color.getHex(),
    );
  });
});
