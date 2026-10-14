// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { setImmediate } from "node:timers/promises";
import { TextDecoder, TextEncoder } from "node:util";
import type { GeolocateControl, Map as NativeMap } from "maplibre-gl";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMapGeolocateControl,
  mapGeolocationLocale,
} from "../src/lib/map-geolocation";

const require = createRequire(import.meta.url);
const packageDirectory = dirname(dirname(require.resolve("maplibre-gl")));
const bundles = [
  "maplibre-gl.js",
  "maplibre-gl-dev.js",
  "maplibre-gl-csp.js",
  "maplibre-gl-csp-dev.js",
];
const originalPermissions = Object.getOwnPropertyDescriptor(
  navigator,
  "permissions",
);
const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  "geolocation",
);
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(
  URL,
  "createObjectURL",
);
const cleanups: (() => void)[] = [];

function restoreProperty(
  target: object,
  key: string,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else Reflect.deleteProperty(target, key);
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  restoreProperty(navigator, "permissions", originalPermissions);
  restoreProperty(navigator, "geolocation", originalGeolocation);
  restoreProperty(URL, "createObjectURL", originalCreateObjectURL);
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

function nativeControl(bundle: string) {
  // Evaluate the actual installed UMD control in an inert DOM, without a map,
  // worker, renderer or external request. A fresh evaluation isolates the
  // vendor's module-level geolocation-support cache between scenarios.
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: () => "blob:inert-map-geolocation-test",
  });
  vi.stubGlobal("TextDecoder", TextDecoder);
  vi.stubGlobal("TextEncoder", TextEncoder);
  vi.stubGlobal(
    "Worker",
    class {
      constructor() {
        throw new Error("Geolocation tests must not create workers");
      }
    },
  );
  vi.stubGlobal("fetch", () => {
    throw new Error("Geolocation tests must not make network requests");
  });
  window.eval(readFileSync(join(packageDirectory, "dist", bundle), "utf8"));
  return (
    window as unknown as {
      maplibregl: { GeolocateControl: typeof GeolocateControl };
    }
  ).maplibregl.GeolocateControl;
}

function mount(
  bundle: string,
  locale: "en" | "es",
  options: {
    permission?: Promise<{ state: PermissionState }>;
    geolocation?: boolean;
    original?: boolean;
  } = {},
) {
  const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>(
    (_success, error) => {
      error?.({ code: 1 } as GeolocationPositionError);
    },
  );
  const watchPosition = vi.fn();
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: options.permission
      ? { query: vi.fn(() => options.permission) }
      : undefined,
  });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value:
      options.geolocation === false
        ? undefined
        : { getCurrentPosition, watchPosition, clearWatch: vi.fn() },
  });
  const NativeGeolocateControl = nativeControl(bundle);
  const listeners = new Map<string, unknown>();
  const strings = mapGeolocationLocale(locale);
  const map = {
    _getUIString: (key: keyof typeof strings) => strings[key],
    on: (event: string, listener: unknown) => listeners.set(event, listener),
    off: (event: string) => listeners.delete(event),
  } as unknown as NativeMap;
  const control = options.original
    ? new NativeGeolocateControl({
        positionOptions: { enableHighAccuracy: false },
        trackUserLocation: false,
      })
    : createMapGeolocateControl(NativeGeolocateControl, locale);
  control.on("error", () => {});
  const container = control.onAdd(map);
  document.body.append(container);
  const button = container.querySelector<HTMLButtonElement>("button")!;
  let removed = false;
  const remove = () => {
    if (!removed) control.onRemove();
    removed = true;
  };
  cleanups.push(remove);
  return {
    control,
    container,
    button,
    getCurrentPosition,
    watchPosition,
    listeners,
    strings,
    remove,
  };
}

function deferredPermission() {
  let resolve!: (value: { state: PermissionState }) => void;
  const promise = new Promise<{ state: PermissionState }>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

for (const bundle of bundles) {
  describe(bundle, () => {
    it("reproduces the native disabled unnamed button while permission is pending", () => {
      const permission = deferredPermission();
      const { button, getCurrentPosition, watchPosition, listeners } = mount(
        bundle,
        "en",
        { permission: permission.promise, original: true },
      );
      expect(button.outerHTML).toBe(
        '<button class="maplibregl-ctrl-geolocate" type="button" disabled=""><span class="maplibregl-ctrl-icon" aria-hidden="true"></span></button>',
      );
      expect(listeners.size).toBe(0);
      expect(getCurrentPosition).not.toHaveBeenCalled();
      expect(watchPosition).not.toHaveBeenCalled();
    });

    for (const locale of ["en", "es"] as const) {
      it(`${locale}: names the pending native control without enabling or locating`, () => {
        const permission = deferredPermission();
        const fixture = mount(bundle, locale, {
          permission: permission.promise,
        });
        const { button, strings } = fixture;
        expect(button.disabled).toBe(true);
        expect(button.title).toBe(strings["GeolocateControl.FindMyLocation"]);
        expect(button.getAttribute("aria-label")).toBe(button.title);
        button.click();
        expect(fixture.getCurrentPosition).not.toHaveBeenCalled();
        expect(fixture.watchPosition).not.toHaveBeenCalled();
        expect(fixture.listeners.size).toBe(0);
      });

      it(`${locale}: preserves granted state and the native permission-denied click result`, async () => {
        const permission = deferredPermission();
        const fixture = mount(bundle, locale, {
          permission: permission.promise,
        });
        permission.resolve({ state: "granted" });
        await setImmediate();
        expect(fixture.button.disabled).toBe(false);
        expect(fixture.button.getAttribute("aria-label")).toBe(
          fixture.strings["GeolocateControl.FindMyLocation"],
        );
        expect(fixture.getCurrentPosition).not.toHaveBeenCalled();
        fixture.button.click();
        expect(fixture.getCurrentPosition).toHaveBeenCalledTimes(1);
        expect(fixture.getCurrentPosition.mock.calls[0][2]).toEqual(
          expect.objectContaining({ enableHighAccuracy: false }),
        );
        expect(fixture.watchPosition).not.toHaveBeenCalled();
        expect(fixture.button.disabled).toBe(true);
        expect(fixture.button.title).toBe(
          fixture.strings["GeolocateControl.LocationNotAvailable"],
        );
        expect(fixture.button.getAttribute("aria-label")).toBe(
          fixture.button.title,
        );
        fixture.remove();
        expect(fixture.listeners.size).toBe(0);
      });

      it(`${locale}: lets native denied availability replace the initial name`, async () => {
        const fixture = mount(bundle, locale, {
          permission: Promise.resolve({ state: "denied" }),
        });
        await setImmediate();
        expect(fixture.button.disabled).toBe(true);
        expect(fixture.button.title).toBe(
          fixture.strings["GeolocateControl.LocationNotAvailable"],
        );
        expect(fixture.button.getAttribute("aria-label")).toBe(
          fixture.button.title,
        );
        expect(fixture.getCurrentPosition).not.toHaveBeenCalled();
        expect(fixture.watchPosition).not.toHaveBeenCalled();
      });

      it(`${locale}: preserves disabled unsupported-browser behavior`, async () => {
        const fixture = mount(bundle, locale, { geolocation: false });
        await setImmediate();
        expect(fixture.button.disabled).toBe(true);
        expect(fixture.button.title).toBe(
          fixture.strings["GeolocateControl.LocationNotAvailable"],
        );
        expect(fixture.button.getAttribute("aria-label")).toBe(
          fixture.button.title,
        );
        expect(fixture.getCurrentPosition).not.toHaveBeenCalled();
      });

      it(`${locale}: retains browser geolocation fallback when permission queries reject`, async () => {
        const permission = deferredPermission();
        const fixture = mount(bundle, locale, {
          permission: permission.promise.then(() => {
            throw new Error("Unsupported Permissions API query");
          }),
        });
        permission.resolve({ state: "prompt" });
        await setImmediate();
        expect(fixture.button.disabled).toBe(false);
        expect(fixture.button.getAttribute("aria-label")).toBe(
          fixture.strings["GeolocateControl.FindMyLocation"],
        );
        expect(fixture.getCurrentPosition).not.toHaveBeenCalled();
        expect(fixture.watchPosition).not.toHaveBeenCalled();
      });

      it(`${locale}: removes cleanly before the permission check settles`, async () => {
        const permission = deferredPermission();
        const fixture = mount(bundle, locale, {
          permission: permission.promise,
        });
        fixture.remove();
        permission.resolve({ state: "granted" });
        await setImmediate();
        expect(fixture.container.isConnected).toBe(false);
        expect(fixture.button.disabled).toBe(true);
        expect(fixture.listeners.size).toBe(0);
        expect(fixture.getCurrentPosition).not.toHaveBeenCalled();
        expect(fixture.watchPosition).not.toHaveBeenCalled();
      });
    }

    it("uses the new locale when the existing map lifecycle replaces a control", async () => {
      const english = mount(bundle, "en");
      await setImmediate();
      expect(english.button.title).toBe("Find my location");
      english.remove();
      const spanish = mount(bundle, "es");
      expect(spanish.button.title).toBe("Buscar mi ubicación");
      await setImmediate();
      expect(spanish.button.title).toBe("Buscar mi ubicación");
      expect(spanish.button.disabled).toBe(false);
      expect(english.container.isConnected).toBe(false);
      expect(english.listeners.size).toBe(0);
    });
  });
}
