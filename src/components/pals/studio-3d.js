/* AkiPals 3D: real, first-party, commercially licensed rigged GLBs + authored wardrobe geometry. */
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
function makeHair(a) {
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
    ry: a.hair === "buzz" ? 0.044 : 0.08,
    rz: 0.127,
    mat: main,
    details: 32,
  };
  addEllipsoid(group, crown);
  // Each style is real 3D geometry with volume, not a sprite or SVG.
  switch (a.hair) {
    case "buzz":
      break;
    case "crop":
    case "quiff": {
      const spikes = a.hair === "quiff" ? 13 : 9;
      for (let i = 0; i < spikes; i++) {
        const x = -0.101 + (i / (spikes - 1)) * 0.202;
        const lift = a.hair === "quiff" ? 0.065 : 0.024;
        curve(
          group,
          [
            [x, 1.744, 0.078],
            [x * 0.9, 1.777 + lift, 0.086],
            [x * 0.86 + 0.023, 1.768 + lift * 0.6, 0.103],
            [x + 0.018, 1.721, 0.113],
          ],
          0.016 + 0.004 * (i % 3),
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
function makeWardrobe(a) {
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
  addEllipsoid(group, {
    x: 0,
    y: 1.482,
    z: 0.023,
    rx: 0.115,
    ry: 0.026,
    rz: 0.09,
    mat: trim,
    details: 28,
  });
  addEllipsoid(group, {
    x: 0,
    y: 1.51,
    z: 0.025,
    rx: 0.067,
    ry: 0.047,
    rz: 0.062,
    mat: skin,
    details: 24,
  });
  // Relaxed arms and hands. The old skinned base uses a T-pose for
  // animation authoring; the character-creation studio does not display it.
  for (const side of [-1, 1]) {
    const puffy = a.top === "hoodie" || a.top === "sweater";
    const radius = puffy ? 0.082 : 0.066;
    const shoulder = [side * 0.205, 1.436, 0.007];
    const elbow = [side * 0.294, 1.268, 0.015];
    const wrist = [side * 0.315, 1.09, 0.07];
    addEllipsoid(group, {
      x: side * 0.21,
      y: 1.44,
      z: 0.008,
      rx: radius * 1.2,
      ry: radius * 1.2,
      rz: radius * 1.1,
      mat: textile,
    });
    if (a.top === "tee") {
      segment(group, shoulder, elbow, radius, radius * 0.88, textile);
      segment(group, elbow, wrist, 0.055, 0.042, skin);
    } else {
      segment(group, shoulder, elbow, radius, radius * 0.94, textile);
      segment(group, elbow, wrist, radius * 0.94, radius * 0.72, textile);
      addEllipsoid(group, {
        x: wrist[0],
        y: wrist[1] + 0.014,
        z: wrist[2],
        rx: radius * 0.79,
        ry: 0.024,
        rz: radius * 0.77,
        mat: trim,
      });
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
    a.bottom === "cargo" ? 0.127 : a.bottom === "tailored" ? 0.092 : 0.105;
  addEllipsoid(group, {
    x: 0,
    y: 1.019,
    z: 0,
    rx: 0.193,
    ry: 0.135,
    rz: 0.133,
    mat: pants,
  });
  for (const side of [-1, 1]) {
    const top = [side * 0.1, 1.02, 0];
    const ankle = [side * 0.112, short ? 0.59 : 0.15, 0.01];
    segment(
      group,
      top,
      ankle,
      wide,
      wide * (a.bottom === "cargo" ? 1.05 : 0.88),
      pants,
      20,
    );
    if (short)
      segment(
        group,
        [side * 0.112, 0.61, 0],
        [side * 0.112, 0.15, 0],
        0.062,
        0.049,
        skin,
        14,
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
      rz: 0.191,
      mat: footwear,
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
  if (a.accessory === "glasses") {
    const frame = material("#e4bb8d", 0.34, 0.65);
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.044, 0.007, 8, 24),
        frame,
      );
      ring.position.set(s * 0.056, 1.649, 0.127);
      group.add(ring);
    }
    segment(
      group,
      [-0.012, 1.649, 0.135],
      [0.012, 1.649, 0.135],
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
      hoop.position.set(s * 0.128, 1.571, 0.005);
      hoop.rotation.y = s * 0.4;
      group.add(hoop);
    }
  } else if (a.accessory === "cap") {
    const hat = material("#232936", 0.64);
    addEllipsoid(group, {
      x: 0,
      y: 1.787,
      z: 0.003,
      rx: 0.137,
      ry: 0.08,
      rz: 0.134,
      mat: hat,
    });
    addEllipsoid(group, {
      x: 0,
      y: 1.747,
      z: 0.115,
      rx: 0.118,
      ry: 0.014,
      rz: 0.093,
      mat: hat,
    });
  }
  return group;
}

function applyBaseColors(base, a) {
  base.traverse((node) => {
    if (!node.isMesh) return;
    let c = SKINS[a.skin];
    if (/eyes/i.test(node.name)) c = EYES[a.eyeColor];
    else if (/brow|face/i.test(node.name) && !/female|male/i.test(node.name))
      c = HAIR[a.hairColor];
    if (node.material?.userData?.akipalsMutable) node.material.dispose();
    node.material = material(c, /eyes/i.test(node.name) ? 0.22 : 0.78);
    node.material.userData.akipalsMutable = true;
    // Keep the original sculpted head, eyes and brows; suppress the uncostumed
    // rigged T-pose beneath the first-party 3D clothes and hands.
    const isBody = /Superhero_|Retopology/i.test(node.name);
    if (isBody) {
      node.material.clippingPlanes = [
        new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.5),
      ];
      node.material.clipShadows = true;
    }
    node.visible = true;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  const head = base.getObjectByName("Head");
  if (head) {
    const size =
      a.face === "round"
        ? [1.09, 0.98, 1]
        : a.face === "angular"
          ? [0.92, 1.05, 0.98]
          : [1, 1, 1];
    head.scale.set(...size);
  }
}
function clearGroup(group) {
  if (!group) return;
  group.parent?.remove(group);
  group.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      for (const mat of materials) mat.dispose?.();
    }
  });
}
function create(container) {
  if (!container || !container.isConnected)
    throw new Error("3D stage not mounted");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.42;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive 3D character. Drag to rotate, scroll or pinch to zoom.",
  );
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.style.cssText =
    "width:100%;height:100%;display:block;touch-action:none;";
  container.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.05, 90);
  camera.position.set(0, 1.33, 3.42);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.99, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 2.05;
  controls.maxDistance = 4.8;
  controls.minPolarAngle = 0.67;
  controls.maxPolarAngle = 2.07;
  controls.update();
  scene.add(new THREE.HemisphereLight("#eaf5ff", "#725146", 2.3));
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
  light("#ffe1c7", 3.2, -2.5, 4, 3, true);
  light("#ff8c58", 2.4, 2, 3, -3, false);
  light("#afc9ff", 0.86, -3, 1, -1, false);
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
  scene.add(floor);
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
  scene.add(ring);
  const root = new THREE.Group();
  scene.add(root);
  let base = null,
    cloth = null,
    hair = null,
    faceDetails = null,
    loadNumber = 0,
    active = true,
    raf = 0;
  let faceType = null,
    previousStyle = null;
  const resize = () => {
    if (!active) return;
    const w = Math.max(container.clientWidth, 1),
      h = Math.max(container.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  let frame = 0;
  const tick = () => {
    if (!active) return;
    raf = requestAnimationFrame(tick);
    frame += 0.016;
    if (!prefersReducedMotion) {
      root.position.y = Math.sin(frame * 0.8) * 0.007;
    }
    controls.update();
    renderer.render(scene, camera);
  };
  tick();
  async function setAppearance(a) {
    const model = a.bodyStyle === "masculine" ? "male" : "female";
    const number = ++loadNumber;
    try {
      if (!base || faceType !== model) {
        let cached = models.get(model);
        if (!cached) {
          cached = await loader.loadAsync(
            "/pals/models/akipals-base-" + model + ".glb",
          );
          models.set(model, cached);
        }
        if (!active || number !== loadNumber) return;
        if (base) root.remove(base);
        base = cloneSkeleton(cached.scene);
        root.add(base);
        faceType = model;
      }
      if (!active || number !== loadNumber) return;
      applyBaseColors(base, a);
      clearGroup(cloth);
      clearGroup(hair);
      clearGroup(faceDetails);
      cloth = makeWardrobe(a);
      hair = makeHair(a);
      faceDetails = makeFaceDetails(a);
      root.add(cloth, hair, faceDetails);
      const frameWidth =
        a.build === "broad" ? 1.1 : a.build === "slim" ? 0.91 : 1;
      root.scale.set(
        frameWidth *
          (a.shoulders === "wide" ? 1.04 : a.shoulders === "narrow" ? 0.95 : 1),
        a.height === "tall" ? 1.055 : a.height === "short" ? 0.94 : 1,
        frameWidth * 0.96,
      );
      root.position.y = a.height === "short" ? 0.01 : 0;
      previousStyle = JSON.stringify(a);
      container.dataset.rendered = "true";
      container.dispatchEvent(
        new CustomEvent("akipals:rendered", { detail: { model } }),
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
    rotate(angle = Math.PI / 4) {
      camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      controls.update();
    },
    screenshot() {
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
      controls.dispose();
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
window.AkiPals3D = { mount: create };
window.dispatchEvent(new Event("akipals:3d-ready"));
