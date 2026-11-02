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

describe("authored appearance fitting", () => {
  const look = {
    hair: "long",
    hairColor: "pink",
    skin: "brown",
    eyeColor: "blue",
    top: "tee",
    topColor: "mint",
    bottomColor: "purple",
    shoeColor: "cream",
  };
  function authoredMesh(name, materialName) {
    const m = new MeshStandardMaterial({
      map: new Texture({ width: 2, height: 2 }),
    });
    m.name = materialName;
    return Object.assign(
      new Mesh(new BoxGeometry(0.1, 0.1, 0.1).translate(0, 1.7, 0), m),
      { name },
    );
  }
  it("uses actual Rain hair meshes and restores original vertices across switches", async () => {
    const { applyProfessionalAppearance } = await import(
      "../src/components/pals/studio-3d.js"
    );
    const group = new Group();
    const tail = authoredMesh(
      "GEO-rain-hair_ponytail-mobile",
      "MAT-rain.hair.mobile.1001",
    );
    const fringe = authoredMesh(
      "GEO-rain-hair_strand-mobile",
      "MAT-rain.hair.mobile.1001",
    );
    group.add(tail, fringe);
    const original = tail.geometry.attributes.position.array.slice();
    expect(
      applyProfessionalAppearance(group, { ...look, hair: "crop" }, "rain-v3")
        .hair,
    ).toBe("crop");
    expect(tail.visible).toBe(false);
    expect(fringe.visible).toBe(false);
    applyProfessionalAppearance(group, { ...look, hair: "bun" }, "rain-v3");
    expect(tail.visible).toBe(true);
    expect(tail.geometry.attributes.position.array).not.toEqual(original);
    applyProfessionalAppearance(group, look, "rain-v3");
    expect(tail.geometry.attributes.position.array).toEqual(original);
  });
  it("projects unsupported Snow hair to a fitted preset and preserves authored maps", async () => {
    const { applyProfessionalAppearance } = await import(
      "../src/components/pals/studio-3d.js"
    );
    const group = new Group();
    const hair = authoredMesh(
      "GEO-snow-hair_base-mobile",
      "snow.hair.mobile.1001",
    );
    group.add(hair);
    const map = hair.material.map;
    const original = hair.geometry.attributes.position.array.slice();
    expect(
      applyProfessionalAppearance(group, { ...look, hair: "bun" }, "snow-v4")
        .hair,
    ).toBe("crop");
    expect(hair.geometry.attributes.position.array).not.toEqual(original);
    expect(hair.material.map).toBe(map);
    expect(hair.material.userData.akipalsDye.value.getHexString()).toBe(
      "b77892",
    );
    applyProfessionalAppearance(group, { ...look, hair: "quiff" }, "snow-v4");
    expect(hair.geometry.attributes.position.array).toEqual(original);
  });
  it("dyes named independent zones with iris protection and leaves cornea unchanged", async () => {
    const { applyProfessionalAppearance } = await import(
      "../src/components/pals/studio-3d.js"
    );
    const group = new Group();
    const names = [
      "snow.shirt.mobile.1001",
      "snow.pants.mobile.1001",
      "snow.shoe.mobile.1001",
      "snow.eyes.mobile.1001",
      "snow.eyes_cornea.mobile.1001",
    ];
    for (const name of names) group.add(authoredMesh(name, name));
    applyProfessionalAppearance(group, look, "snow-v4");
    expect(
      group.children.slice(0, 4).every((n) => n.material.userData.akipalsDye),
    ).toBe(true);
    expect(group.children[4].material.userData.akipalsDye).toBeUndefined();
    const shader = { uniforms: {}, fragmentShader: "#include <map_fragment>" };
    group.children[3].material.onBeforeCompile(shader);
    expect(shader.fragmentShader).toContain("akiIris");
    expect(shader.uniforms.akipalsDye).toBe(
      group.children[3].material.userData.akipalsDye,
    );
  });
});

describe("authored portrait framing", () => {
  it("frames Rain and Snow heads using their distinct authored depth, with bounded portrait zoom", async () => {
    const { authoredStageFraming } = await import(
      "../src/components/pals/studio-3d.js"
    );
    const rain = authoredStageFraming("head", "rain-v3");
    const snow = authoredStageFraming("head", "snow-v4");
    expect(rain.target[1]).toBeGreaterThan(1.5);
    expect(rain.target[1]).toBeLessThan(1.7);
    expect(rain.target[2]).toBeGreaterThan(snow.target[2]);
    expect(rain.position[2] - rain.target[2]).toBeCloseTo(1.3);
    expect(rain.minDistance).toBeLessThan(1.3);
    expect(rain.maxDistance).toBeGreaterThan(1.3);
    expect(
      authoredStageFraming("head", "rain-v3", 1.055).target[1],
    ).toBeCloseTo(rain.target[1] * 1.055);
  });
  it("returns full-body studio framing after leaving portrait view", async () => {
    const { authoredStageFraming } = await import(
      "../src/components/pals/studio-3d.js"
    );
    const frame = authoredStageFraming("full", "rain-v3");
    expect(frame.target[1]).toBeCloseTo(1.04);
    expect(frame.position[2]).toBe(3.6);
    expect(frame.minDistance).toBe(2.05);
    expect(frame.maxDistance).toBe(4.8);
  });
});
