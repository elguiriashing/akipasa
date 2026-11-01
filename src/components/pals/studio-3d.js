/* Authored-only shared World/Wardrobe renderer. No retired avatar fallback. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

import {
  authoredModelId,
  PALS_RUNTIME_VERSION,
} from "../../lib/pals/starter-catalogue";
import { applyStarterStyle } from "./starter-style";

// HTMLImageElement decoding avoids the separate fetch/createImageBitmap path.
// This also works under the document's img-src blob policy without weakening CSP.
export function createAuthoredLoader() {
  const loader = new GLTFLoader();
  loader.register((parser) => {
    const textures = new THREE.TextureLoader(parser.options.manager);
    textures.setCrossOrigin(parser.options.crossOrigin);
    textures.setRequestHeader(parser.options.requestHeader ?? {});
    parser.textureLoader = textures;
    return { name: "AKIPALS_HTML_IMAGE_TEXTURES" };
  });
  return loader;
}
const loader = createAuthoredLoader();
const models = new Map();
const PROFESSIONAL_MODELS = {
  "rain-v3": "/pals/models/professional/rain-v3-20261031.glb",
  "snow-v4": "/pals/models/professional/snow-v4-20261031.glb",
};

async function loadAuthoredModel(model) {
  if (models.has(model)) return models.get(model);
  const url = PROFESSIONAL_MODELS[model];
  const controller = new AbortController();
  let timer;
  const pending = Promise.race([
    (async () => {
      const response = await fetch(url, {
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error("Character download failed (" + response.status + ")");
      const buffer = await response.arrayBuffer();
      if (
        new TextDecoder().decode(
          new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength)),
        ) !== "glTF"
      )
        throw new Error("Character download was not a GLB");
      const gltf = await loader.parseAsync(
        buffer,
        url.slice(0, url.lastIndexOf("/") + 1),
      );
      assertProfessionalTextures(gltf);
      return gltf;
    })(),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("Character loading timed out"));
      }, 30000);
    }),
  ])
    .catch((error) => {
      models.delete(model);
      throw error;
    })
    .finally(() => clearTimeout(timer));
  models.set(model, pending);
  return pending;
}

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
  let professional = null,
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
    let modelId;
    try {
      modelId = authoredModelId(a.model);
    } catch {
      modelId = null;
    }
    const model = modelId;
    const number = ++loadNumber;
    container.dataset.rendered = "loading";
    container.dispatchEvent(new CustomEvent("akipals:loading"));
    // No stale model (including an earlier choice) is visible during loading/error.
    root.visible = false;
    container.dataset.modelId = "";
    renderer.render(scene, camera);
    try {
      if (!modelId) throw new Error("Unknown character model");
      if (!professional || faceType !== model) {
        const cached = await loadAuthoredModel(model);
        if (!active || contextLost || number !== loadNumber) return;
        const next = cloneProfessionalModel(cached.scene);
        clearGroup(professional);
        professional = next;
        root.add(professional);
        faceType = model;
      }
      applyStarterStyle(professional, { ...a, model: modelId });
      root.scale.setScalar(
        a.height === "tall" ? 1.055 : a.height === "short" ? 0.94 : 1,
      );
      worldBaseY = 0;
      if (!active || contextLost || number !== loadNumber) return;
      root.position.y = worldBaseY;
      previousStyle = JSON.stringify({ ...a, model: modelId });
      root.visible = true;
      container.dataset.starterStyle = [
        a.starterOutfit || "crew",
        a.starterHair || "original",
        a.starterPalette || "ember",
        a.starterHairColor || "espresso",
      ].join("/");
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
        root.visible = false;
        renderer.render(scene, camera);
        container.dataset.rendered = "error";
        container.dataset.modelId = "";
        container.dispatchEvent(
          new CustomEvent("akipals:error", {
            detail: { message: "The 3D model could not load. Please retry." },
          }),
        );
      }
      console.warn(
        "AkiPals model load",
        PALS_RUNTIME_VERSION,
        modelId,
        error instanceof Error ? error.message : "unavailable",
      );
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
      clearGroup(professional);
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
