import * as THREE from "three";
import {
  STARTER_COLORS,
  STARTER_HAIR_TINTS,
} from "../../lib/pals/starter-catalogue";

// Canvas sources are bounded by the two shipped models. Each mounted preview
// still owns its texture/material, so editing World cannot dispose Wardrobe.
const neutralImages = new WeakMap();
function neutralFabric(texture) {
  if (!texture?.image || typeof document === "undefined") return;
  // A texture Source must remain stable after its first GPU upload. Replacing
  // it on every palette edit breaks ownership during context-loss cleanup.
  if (texture.userData.palsNeutralReady) return;
  const original = texture.userData.palsOriginalImage ?? texture.image;
  texture.userData.palsOriginalImage = original;
  let image = neutralImages.get(original);
  if (!image) {
    const width = original.naturalWidth || original.width;
    const height = original.naturalHeight || original.height;
    if (!width || !height) throw new Error("Character texture is not decoded");
    image = document.createElement("canvas");
    image.width = width;
    image.height = height;
    const context = image.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Character palette is unavailable");
    context.drawImage(original, 0, 0);
    const pixels = context.getImageData(0, 0, width, height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      // Retain the authored fabric/hair detail without multiplying its original
      // orange/green pigment into every user-selected palette.
      const grey = Math.round(
        150 +
          (0.2126 * pixels.data[i] +
            0.7152 * pixels.data[i + 1] +
            0.0722 * pixels.data[i + 2]) *
            0.41,
      );
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey;
    }
    context.putImageData(pixels, 0, 0);
    neutralImages.set(original, image);
  }
  // Texture.clone shares Source by default. Do not change the cached asset's image.
  texture.source = new THREE.Source(image);
  texture.userData.palsNeutralReady = true;
  texture.needsUpdate = true;
}
function tint(material, color) {
  neutralFabric(material.map);
  material.color.set(color);
  material.needsUpdate = true;
}
function panelGeometry(mesh, predicate, offset = 0.004) {
  const geometry = mesh.geometry.clone();
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const sourceIndex = geometry.index;
  const indices = [];
  const count = sourceIndex ? sourceIndex.count : positions.count;
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map((j) =>
      sourceIndex ? sourceIndex.getX(i + j) : i + j,
    );
    if (
      triangle.every((n) =>
        predicate(positions.getX(n), positions.getY(n), positions.getZ(n)),
      )
    )
      indices.push(...triangle);
  }
  for (let i = 0; i < positions.count; i++) {
    positions.setXYZ(
      i,
      positions.getX(i) + normals.getX(i) * offset,
      positions.getY(i) + normals.getY(i) * offset,
      positions.getZ(i) + normals.getZ(i) * offset,
    );
  }
  positions.needsUpdate = true;
  geometry.setIndex(indices);
  geometry.clearGroups();
  geometry.computeBoundingSphere();
  return geometry;
}
function makeGarments(model, rain) {
  const outfit = new THREE.Group();
  outfit.name = "AkiPals starter garments";
  const shirts = [];
  model.traverse((node) => {
    if (node.isMesh && /GEO-(?:rain-top|snow-shirt)/.test(node.name))
      shirts.push(node);
  });
  for (const shirt of shirts) {
    const make = (name, predicate) => {
      const mesh = new THREE.Mesh(
        panelGeometry(shirt, predicate),
        new THREE.MeshStandardMaterial({ roughness: 0.84, metalness: 0 }),
      );
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      outfit.add(mesh);
    };
    // The original garment remains underneath every variation. The exported
    // bodies are masked, so replacing a shirt with an empty torso is forbidden.
    const hem = rain ? 1.0 : 0.93;
    make("AkiPals varsity trim", (_x, y) => y < hem || y > 1.32);
    make(
      "AkiPals utility vest",
      (x, y) =>
        Math.abs(x) < (rain ? 0.14 : 0.175) &&
        y > (rain ? 0.98 : 0.94) &&
        y < 1.33,
    );
    make(
      "AkiPals utility centre seam",
      (x, y) => Math.abs(x) < 0.008 && y > (rain ? 0.98 : 0.94) && y < 1.33,
    );
  }
  // Fit a small original Aki diamond badge to the actual front garment surface.
  model.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(-0.055, rain ? 1.23 : 1.25, 1),
    new THREE.Vector3(0, 0, -1),
  );
  const hit = ray.intersectObjects(shirts, true)[0];
  if (hit?.face) {
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.025, 0.025),
      new THREE.MeshStandardMaterial({
        roughness: 0.65,
        side: THREE.DoubleSide,
      }),
    );
    badge.name = "AkiPals crew badge";
    const normal = hit.face.normal
      .clone()
      .transformDirection(hit.object.matrixWorld);
    badge.position.copy(hit.point).addScaledVector(normal, 0.007);
    badge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    badge.rotateZ(Math.PI / 4);
    outfit.add(badge);
  }
  model.add(outfit);
  return outfit;
}
/** Apply only the advertised free options, always from immutable donor geometry. */
export function applyStarterStyle(model, appearance) {
  const rain = appearance.model !== "snow-v4";
  const palette =
    STARTER_COLORS[appearance.starterPalette] ?? STARTER_COLORS.ember;
  const hairColor =
    STARTER_HAIR_TINTS[appearance.starterHairColor] ??
    STARTER_HAIR_TINTS.espresso;
  const hairStyle = appearance.starterHair ?? "original";
  const outfitId = appearance.starterOutfit ?? "crew";
  const garments =
    model.getObjectByName("AkiPals starter garments") ??
    makeGarments(model, rain);
  const tinted = new Set();
  model.traverse((node) => {
    if (!node.isMesh || node.name.startsWith("AkiPals")) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    for (const material of materials) {
      if (tinted.has(material)) continue;
      const name = material.name.toLowerCase();
      const color = /(?:rain\.top|snow\.shirt)/.test(name)
        ? palette.top
        : /(?:rain\.jeans|snow\.pants)/.test(name)
          ? palette.bottom
          : /(?:rain\.hair|snow\.hair)/.test(name)
            ? hairColor
            : /rain\.scarf/.test(name)
              ? palette.trim
              : null;
      if (color) {
        tint(material, color);
        tinted.add(material);
      }
    }
    if (rain) {
      if (/hair_ponytail|hairband/.test(node.name))
        node.visible = hairStyle === "original";
      if (/hair_strand/.test(node.name)) node.visible = hairStyle !== "cropped";
    } else if (/snow-hair_base/.test(node.name)) {
      const position = node.geometry.getAttribute("position");
      node.userData.palsHairPositions ??= new Float32Array(position.array);
      const original = node.userData.palsHairPositions;
      for (let i = 0; i < position.count; i++) {
        const x = original[i * 3],
          y = original[i * 3 + 1],
          z = original[i * 3 + 2];
        // Keep the fitted scalp shell intact. Scaling the whole hair would
        // push it into Snow's head and expose bald patches.
        const crown = Math.max(0, (y - 1.71) / 0.09);
        position.setXYZ(
          i,
          x + (hairStyle === "swept" ? 0.035 * crown : 0),
          hairStyle === "cropped" && y > 1.72 ? 1.72 + (y - 1.72) * 0.48 : y,
          z,
        );
      }
      position.needsUpdate = true;
      node.geometry.computeVertexNormals();
      node.geometry.computeBoundingSphere();
    }
  });
  garments.traverse((node) => {
    if (!node.isMesh) return;
    node.visible = node.name.includes("varsity")
      ? outfitId === "varsity"
      : node.name.includes("utility")
        ? outfitId === "explorer"
        : true;
    node.material.color.set(
      node.name.includes("vest") ? palette.bottom : palette.trim,
    );
  });
}
