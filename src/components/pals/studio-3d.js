/* Shared World/Wardrobe renderer: licensed authored GLBs, plus saved classic looks. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

const SKINS = {
  porcelain: "#f2d6c7",
  light: "#e8c1a8",
  warm: "#d6a181",
  olive: "#b78b69",
  brown: "#946547",
  deep: "#664231",
};
const HAIR = {
  black: "#17191e",
  espresso: "#352523",
  chestnut: "#694332",
  auburn: "#a65f43",
  blonde: "#c99a59",
  silver: "#a9afb7",
  pink: "#b77892",
  blue: "#4d6ca3",
};
const EYES = {
  brown: "#573b31",
  hazel: "#8b714a",
  green: "#4e7462",
  blue: "#5689bb",
  grey: "#828a98",
};
const COLORS = {
  orange: "#ff834b",
  ink: "#2a2e3a",
  cream: "#ede2d5",
  mint: "#78bcae",
  purple: "#836ca8",
  red: "#bb5160",
};
const BOTTOMS = {
  cargo: "#2b303a",
  jeans: "#425879",
  tailored: "#25242f",
  shorts: "#54687c",
};
const shoes = { sneakers: "#f0eee7", boots: "#514139", trainers: "#bec8c8" };
const loader = new GLTFLoader();
const models = new Map();
const PROFESSIONAL_MODELS = {
  "rain-v3": "/pals/models/professional/rain-v3-20261031.glb",
  "snow-v4": "/pals/models/professional/snow-v4-20261031.glb",
};

/** GLTFLoader deliberately tolerates image decode failures. Our preview must
 * fail visibly instead of offering to save a grey, incomplete character. */
export function assertProfessionalTextures(gltf) {
  const expected = new Set(
    (gltf.parser.json.materials ?? [])
      .filter((entry) => entry.pbrMetallicRoughness?.baseColorTexture)
      .map((entry) => entry.name),
  );
  const loaded = new Set();
  gltf.scene.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    for (const mat of materials) {
      if (expected.has(mat.name) && mat.map?.image) loaded.add(mat.name);
    }
  });
  if (expected.size < 4 || loaded.size !== expected.size)
    throw new Error("Authored character textures did not finish loading");
}

/** Give each mounted stage its own GPU resources. The bounded source cache can
 * then serve World and Wardrobe without one stage disposing another's mesh. */
export function cloneProfessionalModel(source) {
  const instance = cloneSkeleton(source);
  const materials = new Map();
  const textures = new Map();
  instance.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry = node.geometry.clone();
    const copyMaterial = (original) => {
      if (materials.has(original)) return materials.get(original);
      const copy = original.clone();
      copy.userData.akipalsOwnedTextures = true;
      for (const [key, value] of Object.entries(copy)) {
        if (!value?.isTexture) continue;
        if (!textures.has(value)) {
          const texture = value.clone();
          texture.needsUpdate = true;
          textures.set(value, texture);
        }
        copy[key] = textures.get(value);
      }
      materials.set(original, copy);
      return copy;
    };
    node.material = Array.isArray(node.material)
      ? node.material.map(copyMaterial)
      : copyMaterial(node.material);
    node.castShadow = true;
    node.receiveShadow = true;
  });
  return instance;
}

function material(color, roughness = 0.72, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function addEllipsoid(parent, { x, y, z, rx, ry, rz, mat, details = 20 }) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, details, 16), mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function segment(parent, start, end, a, b, mat, radial = 14) {
  const point1 = new THREE.Vector3(...start);
  const point2 = new THREE.Vector3(...end);
  const length = point1.distanceTo(point2);
  const geometry = new THREE.CylinderGeometry(b, a, length, radial, 1, false);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.copy(point1.clone().add(point2).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    point2.clone().sub(point1).normalize(),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
/** Continuous swept fabric/skin, with tapered rings and shared vertex normals.
 * Garments meet the torso without the old sphere-and-cylinder articulated joints. */
function softLimb(parent, points, radii, mat) {
  const path = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
  );
  const steps = 24,
    sides = 18;
  const frames = path.computeFrenetFrames(steps, false);
  const positions = [],
    indices = [];
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const center = path.getPointAt(t);
    const span = t * (radii.length - 1),
      left = Math.floor(span),
      right = Math.min(left + 1, radii.length - 1);
    const radius = THREE.MathUtils.lerp(radii[left], radii[right], span - left);
    for (let side = 0; side <= sides; side++) {
      const angle = (side / sides) * Math.PI * 2;
      const point = center
        .clone()
        .addScaledVector(frames.normals[step], Math.cos(angle) * radius)
        .addScaledVector(frames.binormals[step], Math.sin(angle) * radius);
      positions.push(point.x, point.y, point.z);
      if (step < steps && side < sides) {
        const a = step * (sides + 1) + side,
          b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  // Closed ends prevent dark, hollow shoulder openings and visible trouser
  // interiors when the user orbits below the default camera position.
  const firstCenter = positions.length / 3;
  const first = path.getPointAt(0),
    last = path.getPointAt(1);
  positions.push(first.x, first.y, first.z, last.x, last.y, last.z);
  const lastRing = steps * (sides + 1);
  for (let side = 0; side < sides; side++) {
    indices.push(firstCenter, side + 1, side);
    indices.push(firstCenter + 1, lastRing + side, lastRing + side + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function curve(parent, pts, radius, mat, divisions = 20) {
  const points = pts.map((v) => new THREE.Vector3(...v));
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      divisions,
      radius,
      7,
      false,
    ),
    mat,
  );
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
export function makeHair(a) {
  const group = new THREE.Group();
  group.name = "AkiPals hairstyle: " + a.hair;
  const color = HAIR[a.hairColor];
  const main = material(color, 0.42);
  const shine = material(new THREE.Color(color).multiplyScalar(1.17), 0.45);
  const crown = {
    x: 0,
    y: 1.728,
    z: -0.014,
    rx: 0.125,
    ry: a.hair === "buzz" ? 0.044 : 0.059,
    rz: 0.127,
    mat: main,
    details: 32,
  };
  // A fitted scalp cap exposes the forehead. The former full ellipsoid
  // extended down across the brows and read as a separate hat.
  const scalp = new THREE.Mesh(
    new THREE.SphereGeometry(
      1,
      32,
      18,
      0,
      Math.PI * 2,
      0,
      a.hair === "buzz" ? 2.3 : 2.15,
    ),
    main,
  );
  scalp.name = "AkiPals fitted scalp cap";
  scalp.position.set(crown.x, crown.y, crown.z);
  scalp.scale.set(crown.rx, crown.ry, crown.rz);
  scalp.castShadow = true;
  scalp.receiveShadow = true;
  group.add(scalp);
  if (["buzz", "crop", "quiff"].includes(a.hair)) {
    for (const side of [-1, 1])
      addEllipsoid(group, {
        x: side * 0.095,
        y: 1.71,
        z: -0.034,
        rx: 0.016,
        ry: 0.036,
        rz: 0.07,
        mat: main,
      });
  }
  // Each style is real 3D geometry with volume, not a sprite or SVG.
  switch (a.hair) {
    case "buzz":
      break;
    case "crop":
    case "quiff": {
      const spikes = a.hair === "quiff" ? 9 : 7;
      for (let i = 0; i < spikes; i++) {
        const x = -0.101 + (i / (spikes - 1)) * 0.202;
        const sweep = Math.sin((i / (spikes - 1)) * Math.PI);
        const lift = (a.hair === "quiff" ? 0.026 : 0.006) * sweep;
        curve(
          group,
          [
            [x, 1.744, 0.078],
            [x * 0.9 + 0.014, 1.765 + lift, 0.075],
            [x * 0.86 + 0.029, 1.754 + lift * 0.6, 0.105],
            [x + 0.018, 1.721, 0.113],
          ],
          0.012 + 0.008 * sweep,
          i % 2 ? main : shine,
          14,
        );
      }
      break;
    }
    case "bob":
    case "long": {
      const bottom = a.hair === "long" ? 1.16 : 1.47;
      for (const side of [-1, 1]) {
        addEllipsoid(group, {
          x: side * 0.115,
          y: (bottom + 1.66) / 2,
          z: -0.035,
          rx: 0.056,
          ry: (1.7 - bottom) / 2,
          rz: 0.105,
          mat: main,
        });
        for (let i = 0; i < 7; i++) {
          const angle = (i / 6) * Math.PI;
          curve(
            group,
            [
              [side * (0.092 + i * 0.004), 1.73, -0.06 + i * 0.02],
              [side * (0.144 + i * 0.004), 1.59, 0.015 + i * 0.006],
              [
                side * (0.136 + i * 0.007),
                bottom,
                0.015 + 0.009 * Math.sin(angle),
              ],
            ],
            0.009,
            i % 2 ? shine : main,
            16,
          );
        }
      }
      break;
    }
    case "bun": {
      addEllipsoid(group, {
        x: 0,
        y: 1.837,
        z: -0.047,
        rx: 0.096,
        ry: 0.08,
        rz: 0.086,
        mat: main,
      });
      for (let i = 0; i < 12; i++) {
        const t = (i * Math.PI) / 6;
        addEllipsoid(group, {
          x: 0.065 * Math.sin(t),
          y: 1.847 + 0.048 * Math.cos(t),
          z: -0.055 + 0.047 * Math.sin(t),
          rx: 0.029,
          ry: 0.034,
          rz: 0.029,
          mat: i % 3 ? main : shine,
        });
      }
      for (const side of [-1, 1])
        curve(
          group,
          [
            [side * 0.112, 1.707, 0.063],
            [side * 0.14, 1.588, 0.088],
            [side * 0.134, 1.469, 0.104],
          ],
          0.009,
          shine,
        );
      break;
    }
    case "curls": {
      for (let ring = 0; ring < 3; ring++) {
        const n = 17 + ring * 3;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          const x = Math.sin(t) * (0.105 + ring * 0.014);
          const z = Math.cos(t) * (0.103 + ring * 0.01);
          const y = 1.748 - ring * 0.054 + 0.02 * Math.cos(t * 3 + ring);
          addEllipsoid(group, {
            x,
            y,
            z,
            rx: 0.026,
            ry: 0.03,
            rz: 0.029,
            mat: i % 4 === 0 ? shine : main,
            details: 12,
          });
        }
      }
      break;
    }
    default:
      break;
  }
  group.position.y = a.bodyStyle === "masculine" ? 0.044 : 0;
  group.scale.x = a.face === "round" ? 1.09 : a.face === "angular" ? 0.95 : 1;
  return group;
}

/** Lightweight first-party sculptural facial overlays for the editable preview. */
/** Natural face details complement the sculpted head and eye meshes. */
function makeFaceDetails(a) {
  const group = new THREE.Group();
  const lips = material("#9c615c", 0.89);
  const skin = material(SKINS[a.skin], 0.86);
  const male = a.bodyStyle === "masculine";
  const noseY = male ? 1.647 : 1.614;
  const mouthY = male ? 1.615 : 1.573;
  const eyeLine = male ? 1.698 : 1.655;
  const iris = material(EYES[a.eyeColor], 0.32);
  const pupil = material("#191b25", 0.23);
  const glint = material("#fff9f0", 0.2);
  for (const side of [-1, 1]) {
    const eyeHeight =
      a.eyes === "wide" ? 0.013 : a.eyes === "almond" ? 0.009 : 0.011;
    addEllipsoid(group, {
      x: side * 0.035,
      y: eyeLine,
      z: male ? 0.082 : 0.077,
      rx: 0.01,
      ry: eyeHeight,
      rz: 0.006,
      mat: iris,
      details: 20,
    });
    addEllipsoid(group, {
      x: side * 0.035,
      y: eyeLine,
      z: male ? 0.087 : 0.082,
      rx: 0.005,
      ry: eyeHeight * 0.64,
      rz: 0.003,
      mat: pupil,
      details: 16,
    });
    addEllipsoid(group, {
      x: side * 0.035 - 0.003,
      y: eyeLine + 0.004,
      z: male ? 0.09 : 0.085,
      rx: 0.002,
      ry: 0.002,
      rz: 0.0015,
      mat: glint,
      details: 12,
    });
  }
  const front = 0.116;
  const noseShape =
    a.nose === "straight"
      ? [0.009, 0.017]
      : a.nose === "button"
        ? [0.016, 0.011]
        : [0.012, 0.013];
  addEllipsoid(group, {
    x: 0,
    y: noseY,
    z: front,
    rx: noseShape[0],
    ry: noseShape[1],
    rz: 0.013,
    mat: skin,
    details: 16,
  });
  const smile =
    a.mouth === "neutral" ? 0.001 : a.mouth === "grin" ? 0.01 : 0.006;
  curve(
    group,
    [
      [-0.022, mouthY + smile, front + 0.003],
      [0, mouthY, front + 0.012],
      [0.022, mouthY + smile, front + 0.003],
    ],
    0.0022,
    lips,
    12,
  );
  return group;
}
/** Construct a tapered torso from an actual lathed fabric mesh. */
function shirtTorso(parent, a, fabric) {
  const width = a.top === "hoodie" ? 1.1 : a.top === "jacket" ? 1.07 : 1;
  const profile = [
    [0, 1.047],
    [0.155 * width, 1.047],
    [0.177 * width, 1.12],
    [0.182 * width, 1.27],
    [0.2 * width, 1.37],
    [0.178 * width, 1.455],
    [0.107 * width, 1.51],
    [0, 1.51],
  ];
  const geometry = new THREE.LatheGeometry(
    profile.map(([radius, y]) => new THREE.Vector2(radius, y)),
    40,
  );
  const mesh = new THREE.Mesh(geometry, fabric);
  mesh.scale.z = 0.73;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function makeWardrobe(a) {
  const group = new THREE.Group();
  group.name = "AkiPals original clothing";
  const textile = material(
    COLORS[a.topColor],
    a.top === "jacket" ? 0.45 : 0.91,
  );
  const trim = material(a.topColor === "cream" ? "#8b8078" : "#f8dac5", 0.81);
  const pants = material(BOTTOMS[a.bottom] || BOTTOMS.cargo, 0.82);
  const dark = material("#22252e", 0.52);
  const gold = material("#f8aa61", 0.42, 0.3);
  const footwear = material(shoes[a.shoes] || shoes.sneakers, 0.45);
  const skin = material(SKINS[a.skin], 0.79);
  // Tapered 3D jersey with a human silhouette, rather than an oval blob.
  shirtTorso(group, a, textile);
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.065, 0.009, 10, 36),
    trim,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.509, 0.022);
  collar.scale.y = 0.9;
  group.add(collar);
  const neckRadius =
    a.neck === "broad" ? 0.063 : a.neck === "slim" ? 0.046 : 0.054;
  softLimb(
    group,
    [
      [0, 1.485, 0.002],
      [0, a.bodyStyle === "masculine" ? 1.592 : 1.58, 0.002],
    ],
    [neckRadius, neckRadius * 0.9],
    skin,
  );
  // Relaxed arms and hands. The old skinned base uses a T-pose for
  // animation authoring; the character-creation studio does not display it.
  for (const side of [-1, 1]) {
    const puffy = a.top === "hoodie" || a.top === "sweater";
    // Start inside the chest so the swept sleeve's cap is buried, rather
    // than leaving a V-shaped opening between the sleeve and collar line.
    const shoulder = [side * 0.09, 1.42, 0.007];
    const upper = [side * 0.229, 1.393, 0.01];
    const elbow = [side * 0.285, 1.263, 0.017];
    const wrist = [side * 0.315, 1.09, 0.07];
    if (a.top === "tee") {
      softLimb(group, [upper, elbow, wrist], [0.06, 0.052, 0.039], skin);
      softLimb(
        group,
        [shoulder, upper, [side * 0.27, 1.31, 0.015]],
        [0.073, 0.071, 0.063],
        textile,
      );
    } else {
      softLimb(
        group,
        [shoulder, upper, elbow, wrist],
        puffy ? [0.084, 0.079, 0.068, 0.05] : [0.074, 0.069, 0.059, 0.046],
        textile,
      );
      softLimb(
        group,
        [[wrist[0], wrist[1] + 0.025, wrist[2] - 0.008], wrist],
        [0.052, 0.05],
        trim,
      );
    }
    addEllipsoid(group, {
      x: side * 0.318,
      y: 1.021,
      z: 0.073,
      rx: 0.05,
      ry: 0.086,
      rz: 0.038,
      mat: skin,
      details: 24,
    });
    // Rounded thumb, angled inward for a friendly idle silhouette.
    addEllipsoid(group, {
      x: side * 0.27,
      y: 1.055,
      z: 0.091,
      rx: 0.025,
      ry: 0.041,
      rz: 0.029,
      mat: skin,
      details: 18,
    });
  }
  if (a.top === "hoodie") {
    addEllipsoid(group, {
      x: 0,
      y: 1.468,
      z: -0.083,
      rx: 0.147,
      ry: 0.121,
      rz: 0.096,
      mat: textile,
    });
    curve(
      group,
      [
        [-0.017, 1.487, 0.141],
        [-0.027, 1.379, 0.15],
      ],
      0.0035,
      trim,
    );
    curve(
      group,
      [
        [0.017, 1.487, 0.141],
        [0.027, 1.379, 0.15],
      ],
      0.0035,
      trim,
    );
    addEllipsoid(group, {
      x: 0,
      y: 1.197,
      z: 0.151,
      rx: 0.131,
      ry: 0.052,
      rz: 0.025,
      mat: textile,
    });
  } else if (a.top === "jacket") {
    curve(
      group,
      [
        [0, 1.515, 0.149],
        [0, 1.33, 0.158],
        [0, 1.095, 0.135],
      ],
      0.006,
      trim,
    );
    curve(
      group,
      [
        [-0.095, 1.493, 0.118],
        [0, 1.401, 0.157],
        [0.094, 1.493, 0.118],
      ],
      0.008,
      dark,
    );
    for (const y of [1.31, 1.25, 1.19])
      addEllipsoid(group, {
        x: 0.01,
        y,
        z: 0.167,
        rx: 0.006,
        ry: 0.006,
        rz: 0.007,
        mat: gold,
        details: 12,
      });
  } else if (a.top === "sweater") {
    for (const y of [1.092, 1.103, 1.114])
      curve(
        group,
        [
          [-0.18, y, 0.08],
          [0, y, 0.14],
          [0.18, y, 0.08],
        ],
        0.004,
        trim,
        14,
      );
  }
  const short = a.bottom === "shorts";
  const wide =
    a.bottom === "cargo" ? 0.114 : a.bottom === "tailored" ? 0.092 : 0.104;
  addEllipsoid(group, {
    x: 0,
    y: 1.055,
    z: 0,
    rx: 0.183,
    ry: 0.085,
    rz: 0.133,
    mat: pants,
  });
  for (const side of [-1, 1]) {
    // A curved thigh/knee/cuff silhouette retains fabric volume without the
    // former rigid, constant-radius cylinders. All wardrobe IDs stay intact.
    const leg = softLimb(
      group,
      [
        [side * 0.095, 1.035, 0],
        [side * 0.108, 0.84, 0.012],
        [side * 0.112, short ? 0.68 : 0.56, 0.024],
        [side * 0.112, short ? 0.59 : 0.15, 0.01],
      ],
      [wide, wide * 0.98, wide * 0.88, wide * 0.73],
      pants,
    );
    leg.name = "AkiPals tailored trouser leg";
    if (short)
      softLimb(
        group,
        [
          [side * 0.112, 0.61, 0],
          [side * 0.112, 0.39, 0.018],
          [side * 0.112, 0.15, 0],
        ],
        [0.062, 0.058, 0.043],
        skin,
      );
    if (a.bottom === "cargo") {
      const pocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.101, 0.133, 0.027),
        pants,
      );
      pocket.position.set(side * 0.178, 0.73, 0.093);
      pocket.castShadow = true;
      group.add(pocket);
      const flap = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.03, 0.035),
        dark,
      );
      flap.position.set(side * 0.178, 0.785, 0.099);
      group.add(flap);
    }
    addEllipsoid(group, {
      x: side * 0.112,
      y: 0.08,
      z: 0.076,
      rx: 0.108,
      ry: 0.082,
      rz: 0.168,
      mat: footwear,
      details: 24,
    });
    if (a.shoes === "boots") {
      segment(
        group,
        [side * 0.112, 0.12, 0.01],
        [side * 0.112, 0.3, 0.01],
        0.077,
        0.068,
        footwear,
        20,
      );
    }
    addEllipsoid(group, {
      x: side * 0.112,
      y: 0.028,
      z: 0.08,
      rx: 0.11,
      ry: 0.027,
      rz: 0.172,
      mat: a.shoes === "boots" ? dark : trim,
      details: 24,
    });
    curve(
      group,
      [
        [side * 0.062, 0.1, 0.192],
        [side * 0.112, 0.115, 0.205],
        [side * 0.16, 0.1, 0.192],
      ],
      0.007,
      trim,
      12,
    );
  }
  if (a.bag === "crossbody") {
    curve(
      group,
      [
        [-0.155, 1.496, 0.128],
        [-0.083, 1.405, 0.171],
        [0.07, 1.244, 0.189],
        [0.148, 1.124, 0.156],
      ],
      0.012,
      dark,
      28,
    );
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.191, 0.141, 0.077),
      dark,
    );
    bag.position.set(0.123, 1.115, 0.207);
    bag.rotation.z = -0.12;
    bag.castShadow = true;
    group.add(bag);
    addEllipsoid(group, {
      x: 0.124,
      y: 1.127,
      z: 0.254,
      rx: 0.02,
      ry: 0.02,
      rz: 0.008,
      mat: gold,
      details: 12,
    });
  } else if (a.bag === "backpack") {
    addEllipsoid(group, {
      x: 0,
      y: 1.302,
      z: -0.171,
      rx: 0.163,
      ry: 0.197,
      rz: 0.088,
      mat: dark,
    });
    for (const s of [-1, 1])
      curve(
        group,
        [
          [s * 0.113, 1.464, -0.103],
          [s * 0.153, 1.305, -0.18],
          [s * 0.134, 1.149, -0.13],
        ],
        0.018,
        gold,
      );
  }
  const headWear = new THREE.Group();
  headWear.name = "AkiPals fitted headwear";
  group.add(headWear);
  if (a.accessory === "glasses") {
    const frame = material("#e4bb8d", 0.34, 0.65);
    const eyeLine = a.bodyStyle === "masculine" ? 1.698 : 1.655;
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.044, 0.007, 8, 24),
        frame,
      );
      ring.position.set(s * 0.046, eyeLine, 0.105);
      ring.scale.set(0.88, 0.72, 1);
      headWear.add(ring);
    }
    segment(
      headWear,
      [-0.012, eyeLine, 0.112],
      [0.012, eyeLine, 0.112],
      0.005,
      0.005,
      frame,
      8,
    );
  } else if (a.accessory === "earrings") {
    const frame = material("#f0b978", 0.23, 0.75);
    for (const s of [-1, 1]) {
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.029, 0.005, 8, 22),
        frame,
      );
      hoop.position.set(
        s * 0.108,
        a.bodyStyle === "masculine" ? 1.635 : 1.591,
        0.005,
      );
      hoop.rotation.y = s * 0.4;
      headWear.add(hoop);
    }
  } else if (a.accessory === "cap") {
    const hat = material("#232936", 0.64);
    addEllipsoid(headWear, {
      x: 0,
      y: a.bodyStyle === "masculine" ? 1.831 : 1.787,
      z: 0.003,
      rx: 0.137,
      ry: 0.08,
      rz: 0.134,
      mat: hat,
    });
    addEllipsoid(headWear, {
      x: 0,
      y: a.bodyStyle === "masculine" ? 1.791 : 1.747,
      z: 0.115,
      rx: 0.118,
      ry: 0.014,
      rz: 0.093,
      mat: hat,
    });
  }
  return group;
}

/** Keep only the head triangles in object space. A world-space clipping plane
 * sliced short/tall avatars at the wrong height and could expose the T-pose. */
export function prepareBase(base) {
  base.updateMatrixWorld(true);
  base.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry = node.geometry.clone();
    const position = node.geometry.getAttribute("position");
    node.userData.originalPositions = new Float32Array(position.array);
    if (/Superhero_|Retopology/i.test(node.name)) {
      const old = node.geometry.index;
      const kept = [];
      const skinIndex = node.geometry.getAttribute("skinIndex"),
        skinWeight = node.geometry.getAttribute("skinWeight");
      const headBone = node.skeleton.bones.find((bone) => bone.name === "Head");
      const headOrigin = node.worldToLocal(
        headBone.getWorldPosition(new THREE.Vector3()),
      );
      // Each donor has a different neck height. Retain the jaw, but replace
      // the low-poly flared neck/shoulder remnants with our continuous neck.
      const neckJoin = Math.max(1.5, headOrigin.y - 0.022);
      const headBones = new Set(
        node.skeleton.bones.flatMap((bone, index) =>
          /^(Head|neck_01)$/.test(bone.name) ? [index] : [],
        ),
      );
      const headWeight = (index) => {
        let weight = 0;
        for (let part = 0; part < 4; part++) {
          if (headBones.has(skinIndex.array[index * 4 + part]))
            weight += skinWeight.array[index * 4 + part];
        }
        return weight;
      };
      const count = old ? old.count : position.count;
      for (let i = 0; i < count; i += 3) {
        const triangle = [0, 1, 2].map((j) => (old ? old.getX(i + j) : i + j));
        if (
          triangle.every(
            (index) =>
              position.getY(index) >= neckJoin &&
              Math.abs(position.getX(index)) <= 0.145 &&
              headWeight(index) > 0.5,
          )
        )
          kept.push(...triangle);
      }
      node.geometry.setIndex(kept);
    }
  });
}

/** Rebuild smooth normals without welding UV/rig vertices. Recomputing normals
 * independently at each duplicate seam destroys the donor's smooth cheek/jaw
 * shading. Only the retained head triangles contribute; hidden body faces and
 * separate eye/brow meshes must not influence the portrait. */
function smoothHeadNormals(geometry) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const indices = geometry.index.array;
  const keys = new Map(),
    sums = new Map();
  const used = new Set(indices);
  for (const index of used) {
    const key = [
      position.getX(index),
      position.getY(index),
      position.getZ(index),
    ]
      .map((value) => Math.round(value * 1e6))
      .join(",");
    keys.set(index, key);
    if (!sums.has(key)) sums.set(key, new THREE.Vector3());
  }
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (let offset = 0; offset < indices.length; offset += 3) {
    const first = indices[offset],
      second = indices[offset + 1],
      third = indices[offset + 2];
    a.fromBufferAttribute(position, first);
    b.fromBufferAttribute(position, second);
    c.fromBufferAttribute(position, third);
    // The unnormalized cross product weights each face by its actual area.
    b.sub(a).cross(c.sub(a));
    for (const index of [first, second, third])
      sums.get(keys.get(index)).add(b);
  }
  for (const sum of sums.values()) {
    if (sum.lengthSq() < 1e-18) sum.set(0, -1, 0);
    else sum.normalize();
  }
  for (const index of used) {
    const sum = sums.get(keys.get(index));
    normal.setXYZ(index, sum.x, sum.y, sum.z);
  }
  normal.needsUpdate = true;
}

/** Bounded local sculpt deformations; always start from the original vertex
 * positions so switching looks never accumulates distortion in the cached GLB. */
export function applyBaseColors(base, a) {
  base.traverse((node) => {
    if (!node.isMesh) return;
    const eye = /eyes/i.test(node.name);
    const brow = /brow/i.test(node.name);
    const color = eye ? "#fff2e4" : brow ? HAIR[a.hairColor] : SKINS[a.skin];
    if (node.material?.userData?.akipalsMutable) node.material.dispose();
    node.material = material(color, eye ? 0.22 : 0.78);
    node.material.userData.akipalsMutable = true;
    node.visible = true;
    node.castShadow = true;
    node.receiveShadow = true;
    const position = node.geometry.getAttribute("position");
    const original = node.userData.originalPositions;
    if (!original) return;
    const masculine = a.bodyStyle === "masculine";
    const eyeY = masculine ? 1.698 : 1.655;
    const chinY = masculine ? 1.586 : 1.543;
    const faceWidth =
      a.face === "round" ? 1.09 : a.face === "angular" ? 0.95 : 1;
    for (let i = 0; i < position.count; i++) {
      let x = original[i * 3],
        y = original[i * 3 + 1],
        z = original[i * 3 + 2];
      if (eye) {
        const centerX = x < 0 ? -0.035 : 0.035;
        x = centerX + (x - centerX) * (a.eyes === "almond" ? 1.12 : 1);
        y =
          eyeY +
          (y - eyeY) *
            (a.eyes === "wide" ? 1.2 : a.eyes === "almond" ? 0.78 : 1);
      } else if (brow) {
        const browY = eyeY + 0.023;
        y = browY + (y - browY) * (a.brows === "bold" ? 1.4 : 0.8);
        if (a.brows === "arched")
          y += 0.011 * Math.sin(Math.min(Math.abs(x) / 0.065, 1) * Math.PI);
      } else if (y >= 1.5) {
        // Donor neck topology was authored for a T-pose torso, not this
        // portrait. Collapse its cut boundary into a level, narrow join inside
        // the authored neck instead of exposing triangular shoulder scraps.
        if (y < chinY + 0.022) {
          y = chinY + 0.008;
          x = THREE.MathUtils.clamp(x, -0.039, 0.039);
          z = THREE.MathUtils.clamp(z, -0.035, 0.037);
        }
        const chinInfluence = Math.max(0, 1 - Math.abs(y - chinY) / 0.055);
        x *=
          1 +
          chinInfluence *
            (a.chin === "pointed" ? -0.15 : a.chin === "square" ? 0.12 : 0);
        const earInfluence =
          Math.max(0, Math.min(1, (Math.abs(x) - 0.075) / 0.025)) *
          Math.max(0, 1 - Math.abs(y - (eyeY - 0.018)) / 0.07);
        x *=
          1 +
          earInfluence *
            (a.ears === "prominent" ? 0.18 : a.ears === "small" ? -0.16 : 0);
        const neckInfluence = Math.max(0, 1 - (y - chinY) / 0.06);
        x *=
          1 +
          neckInfluence *
            (a.neck === "broad" ? 0.22 : a.neck === "slim" ? -0.18 : 0);
      }
      position.setXYZ(i, x * faceWidth, y, z);
    }
    position.needsUpdate = true;
    node.geometry.computeVertexNormals();
    if (!eye && !brow) smoothHeadNormals(node.geometry);
    node.geometry.computeBoundingSphere();
  });
}
function clearGroup(group) {
  if (!group) return;
  group.parent?.remove(group);
  const skeletons = new Set();
  const textures = new Set();
  group.traverse((node) => {
    if (node.skeleton) skeletons.add(node.skeleton);
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      for (const mat of materials) {
        if (mat.userData.akipalsOwnedTextures) {
          for (const value of Object.values(mat))
            if (value?.isTexture) textures.add(value);
        }
        mat.dispose?.();
      }
    }
  });
  for (const skeleton of skeletons) skeleton.dispose();
  for (const texture of textures) texture.dispose();
}
function create(container, { mode = "studio" } = {}) {
  const isWorld = mode === "world";
  if (!container || !container.isConnected)
    throw new Error("3D stage not mounted");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: isWorld ? "low-power" : "default",
  });
  renderer.setPixelRatio(
    Math.min(isWorld ? 1.25 : 2, window.devicePixelRatio || 1),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = isWorld ? 1.42 : 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute(
    "aria-label",
    document.documentElement.lang === "es"
      ? "Personaje 3D interactivo. Arrastra para girar, desliza o pellizca para acercar."
      : "Interactive 3D character. Drag to rotate, scroll or pinch to zoom.",
  );
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.style.cssText =
    "width:100%;height:100%;display:block;touch-action:none;";
  container.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isWorld ? 39 : 33, 1, 0.05, 90);
  // Reserve breathing room for the stage badge and bottom touch controls.
  camera.position.set(0, isWorld ? 1.23 : 1.34, isWorld ? 2.62 : 4.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, isWorld ? 0.99 : 1.04, 0);
  controls.enabled = !isWorld;
  controls.enablePan = false;
  controls.enableDamping = !prefersReducedMotion && !isWorld;
  controls.dampingFactor = 0.07;
  controls.minDistance = 2.05;
  controls.maxDistance = 4.8;
  controls.minPolarAngle = 0.67;
  controls.maxPolarAngle = 2.07;
  controls.update();
  scene.add(
    new THREE.HemisphereLight(
      isWorld ? "#eaf5ff" : "#f1f5ff",
      isWorld ? "#725146" : "#504b57",
      isWorld ? 2.3 : 1.65,
    ),
  );
  const light = (color, intensity, x, y, z, shadow = false) => {
    const l = new THREE.DirectionalLight(color, intensity);
    l.position.set(x, y, z);
    l.castShadow = shadow;
    if (shadow) {
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.camera.left = -3;
      l.shadow.camera.right = 3;
      l.shadow.camera.top = 4;
      l.shadow.camera.bottom = -3;
      l.shadow.bias = -0.0002;
    }
    scene.add(l);
  };
  if (isWorld) {
    light("#ffe1c7", 3.2, -2.5, 4, 3, true);
    light("#ff8c58", 2.4, 2, 3, -3, false);
    light("#afc9ff", 0.86, -3, 1, -1, false);
  } else {
    light("#fff0e5", 2.65, -2.5, 4, 3, true);
    light("#ffab7e", 1.65, 2, 3, -3, false);
    light("#c4d8ff", 1.2, 3, 2, 2, false);
  }
  const stageMat = new THREE.MeshStandardMaterial({
    color: "#1a1c27",
    roughness: 0.43,
    metalness: 0.11,
  });
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.84, 0.87, 0.07, 64),
    stageMat,
  );
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  if (!isWorld) scene.add(floor);
  const ringMat = new THREE.MeshBasicMaterial({
    color: "#da835b",
    transparent: true,
    opacity: 0.4,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.76, 0.008, 6, 80),
    ringMat,
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.058;
  if (!isWorld) scene.add(ring);
  const root = new THREE.Group();
  scene.add(root);
  // A friendly six-head silhouette. Hair, facial details and accessories use
  // the same neck pivot, preserving fit while the body/height controls change.
  const head = new THREE.Group();
  head.position.y = 1.5 * (1 - 1.4);
  head.scale.set(1.38, 1.4, 1.35);
  root.add(head);
  let base = null,
    professional = null,
    cloth = null,
    hair = null,
    faceDetails = null,
    loadNumber = 0,
    active = true,
    contextLost = false,
    raf = 0;
  let faceType = null,
    previousStyle = null,
    requestedStyle = null;
  let worldWalking = false,
    worldHeading = 0,
    worldTurn = 0,
    worldBaseY = 0,
    worldFrame = 0;
  const resize = () => {
    if (!active) return;
    const w = Math.max(container.clientWidth, 1),
      h = Math.max(container.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  };
  const requestRender = () => {
    if (active && !contextLost && !document.hidden && !raf)
      raf = requestAnimationFrame(tick);
  };
  const tick = () => {
    raf = 0;
    if (!active || contextLost || document.hidden) return;
    let worldAnimating = false;
    if (isWorld) {
      const difference = Math.atan2(
        Math.sin(worldHeading - worldTurn),
        Math.cos(worldHeading - worldTurn),
      );
      const turning = Math.abs(difference) > 0.001;
      worldTurn =
        prefersReducedMotion || !turning
          ? worldHeading
          : worldTurn + difference * 0.09;
      root.rotation.y = worldTurn;
      worldAnimating = !prefersReducedMotion && (worldWalking || turning);
      if (worldWalking && !prefersReducedMotion) {
        worldFrame += 0.016;
        root.position.y =
          worldBaseY + Math.abs(Math.sin(worldFrame * 11)) * 0.025;
        root.rotation.z = Math.sin(worldFrame * 5.5) * 0.025;
      } else {
        root.position.y = worldBaseY;
        root.rotation.z = 0;
      }
    }
    controls.update();
    renderer.render(scene, camera);
    // OrbitControls emits change while damping settles. An idle portrait needs
    // no perpetual animation loop, especially inside an Android WebView.
    // World GPS animates only walking or a settling heading; an idle/off/hidden
    // world character keeps the same demand-driven lifetime as the Wardrobe.
    if (worldAnimating) requestRender();
  };
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else requestRender();
  };
  controls.addEventListener("change", requestRender);
  document.addEventListener("visibilitychange", visibility);
  const loseContext = (event) => {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(raf);
    raf = 0;
    container.dataset.rendered = "error";
    container.dispatchEvent(
      new CustomEvent("akipals:error", {
        detail: {
          message:
            "3D preview paused. Waiting for graphics to recover. Your saved look is unchanged.",
        },
      }),
    );
  };
  const restoreContext = () => {
    contextLost = false;
    if (requestedStyle) void setAppearance(JSON.parse(requestedStyle));
  };
  renderer.domElement.addEventListener("webglcontextlost", loseContext);
  renderer.domElement.addEventListener("webglcontextrestored", restoreContext);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  async function setAppearance(a) {
    requestedStyle = JSON.stringify(a);
    // Missing model identifies a real pre-upgrade save. Never reinterpret that
    // person's selected hair/clothing as a different authored character.
    const modelId = a.model ?? "classic-v2";
    const professionalUrl = Object.hasOwn(PROFESSIONAL_MODELS, modelId)
      ? PROFESSIONAL_MODELS[modelId]
      : undefined;
    const model = professionalUrl
      ? modelId
      : a.bodyStyle === "masculine"
        ? "male"
        : "female";
    const number = ++loadNumber;
    container.dataset.rendered = "loading";
    container.dispatchEvent(new CustomEvent("akipals:loading"));
    try {
      if (modelId !== "classic-v2" && !professionalUrl)
        throw new Error("Unknown character model");
      if (professionalUrl) {
        if (!professional || faceType !== model) {
          let pending = models.get(model);
          if (!pending) {
            pending = loader
              .loadAsync(professionalUrl)
              .then((gltf) => {
                assertProfessionalTextures(gltf);
                return gltf;
              })
              .catch((error) => {
                models.delete(model);
                throw error;
              });
            models.set(model, pending);
          }
          const cached = await pending;
          if (!active || contextLost || number !== loadNumber) return;
          const next = cloneProfessionalModel(cached.scene);
          clearGroup(professional);
          professional = next;
          root.add(professional);
          faceType = model;
        }
        clearGroup(base);
        clearGroup(cloth);
        clearGroup(hair);
        clearGroup(faceDetails);
        base = cloth = hair = faceDetails = null;
        head.visible = false;
        // Rain and Snow retain their authored face, hair and outfit. Uniform
        // height is the sole supported geometry adjustment for these assets.
        const scale =
          a.height === "tall" ? 1.055 : a.height === "short" ? 0.94 : 1;
        root.scale.setScalar(scale);
        worldBaseY = 0;
      } else {
        if (!base || faceType !== model) {
          let pending = models.get(model);
          if (!pending) {
            pending = loader
              .loadAsync("/pals/models/akipals-base-" + model + ".glb")
              .catch((error) => {
                models.delete(model);
                throw error;
              });
            models.set(model, pending);
          }
          const cached = await pending;
          if (!active || contextLost || number !== loadNumber) return;
          clearGroup(base);
          base = cloneSkeleton(cached.scene);
          prepareBase(base);
          head.add(base);
          faceType = model;
        }
        if (!active || contextLost || number !== loadNumber) return;
        clearGroup(professional);
        professional = null;
        head.visible = true;
        applyBaseColors(base, a);
        clearGroup(cloth);
        clearGroup(hair);
        clearGroup(faceDetails);
        cloth = makeWardrobe(a);
        hair = makeHair(a);
        faceDetails = makeFaceDetails(a);
        // The masculine donor's jaw sits higher than the feminine donor. Bring
        // it toward the common garment collar instead of stretching the neck.
        head.position.y = 1.5 * (1 - 1.4) - (model === "male" ? 0.048 : 0);
        root.add(cloth);
        head.add(hair, faceDetails);
        const headWear = cloth.getObjectByName("AkiPals fitted headwear");
        headWear.position.copy(head.position);
        headWear.scale.copy(head.scale);
        const frameWidth =
          a.build === "broad" ? 1.1 : a.build === "slim" ? 0.91 : 1;
        root.scale.set(
          frameWidth *
            (a.shoulders === "wide"
              ? 1.04
              : a.shoulders === "narrow"
                ? 0.95
                : 1),
          a.height === "tall" ? 1.055 : a.height === "short" ? 0.94 : 1,
          frameWidth * 0.96,
        );
        worldBaseY = a.height === "short" ? 0.01 : 0;
      }
      if (!active || contextLost || number !== loadNumber) return;
      root.position.y = worldBaseY;
      previousStyle = JSON.stringify(a);
      renderer.render(scene, camera);
      requestRender();
      container.dataset.rendered = "true";
      container.dataset.model = model;
      container.dataset.modelId = modelId;
      container.dispatchEvent(
        new CustomEvent("akipals:rendered", { detail: { model, modelId } }),
      );
    } catch (error) {
      if (active && number === loadNumber) {
        container.dataset.rendered = "error";
        container.dispatchEvent(
          new CustomEvent("akipals:error", {
            detail: { message: "The 3D model could not load. Please retry." },
          }),
        );
      }
      console.error("AkiPals 3D stage load failure", error);
    }
  }
  return {
    setAppearance,
    setMotion({ walking = false, headingDegrees } = {}) {
      if (!isWorld) return;
      worldWalking = Boolean(walking);
      if (Number.isFinite(headingDegrees))
        worldHeading = (headingDegrees * Math.PI) / 180;
      requestRender();
    },
    rotate(angle = Math.PI / 4) {
      camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      controls.update();
      requestRender();
    },
    screenshot() {
      if (contextLost || container.dataset.rendered !== "true")
        throw new Error("3D preview is not ready");
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    },
    get currentStyle() {
      return previousStyle;
    },
    dispose() {
      active = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", loseContext);
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        restoreContext,
      );
      controls.removeEventListener("change", requestRender);
      controls.dispose();
      clearGroup(base);
      clearGroup(professional);
      clearGroup(cloth);
      clearGroup(hair);
      clearGroup(faceDetails);
      floor.geometry.dispose();
      ring.geometry.dispose();
      floor.material.dispose();
      ring.material.dispose();
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
if (typeof window !== "undefined") {
  window.AkiPals3D = { mount: create };
  window.dispatchEvent(new Event("akipals:3d-ready"));
}
