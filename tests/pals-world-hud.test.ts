// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  permission: "prompt",
  watch: vi.fn(() => 7),
  clear: vi.fn(),
  current: vi.fn(),
  permissionChanged: null as null | (() => void),
  remove: vi.fn(),
  fetch: vi.fn(),
  success: null as null | PositionCallback,
  error: null as null | PositionErrorCallback,
  maps: [] as Array<{ center: number[]; padding?: unknown }>,
  markers: [] as Array<{ position?: number[]; element: HTMLElement }>,
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}));
vi.mock("maplibre-gl", () => {
  class Map {
    node: HTMLElement;
    center: number[];
    canvas = document.createElement("canvas");
    padding?: unknown;
    scrollZoom = { enable: vi.fn() };
    touchZoomRotate = { enable: vi.fn(), disableRotation: vi.fn() };
    constructor(options: { container: HTMLElement; center: number[] }) {
      this.node = options.container;
      this.center = options.center;
      this.node.appendChild(this.canvas);
      state.maps.push(this);
    }
    setPadding(value: unknown) {
      this.padding = value;
    }
    addControl() {}
    isStyleLoaded() {
      return true;
    }
    on(name: string, callback: () => void) {
      if (name === "load") queueMicrotask(callback);
      return this;
    }
    getSource() {
      return null;
    }
    getCenter() {
      return { lng: this.center[0], lat: this.center[1] };
    }
    getZoom() {
      return 16;
    }
    getBearing() {
      return 0;
    }
    getCanvas() {
      return this.canvas;
    }
    project(value: number[]) {
      return { x: value[0] * 100000, y: value[1] * 100000 };
    }
    jumpTo(options: { center?: number[] }) {
      if (options.center) this.center = options.center;
    }
    zoomTo() {}
    remove = state.remove;
  }
  class Marker {
    element: HTMLElement;
    position?: number[];
    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      state.markers.push(this);
    }
    setLngLat(value: number[]) {
      this.position = value;
      return this;
    }
    addTo(map: Map) {
      map.node.appendChild(this.element);
      return this;
    }
    getElement() {
      return this.element;
    }
    remove() {
      this.element.remove();
    }
  }
  return { Map, Marker, AttributionControl: class {} };
});
import { WorldExplorer } from "../src/components/pals/WorldExplorer";
function sample(accuracy = 10, age = 0): GeolocationPosition {
  return {
    timestamp: Date.now() - age,
    coords: {
      latitude: 36.543,
      longitude: -4.623,
      accuracy,
      heading: null,
      speed: null,
      altitude: null,
      altitudeAccuracy: null,
    },
    toJSON() {
      return {};
    },
  } as GeolocationPosition;
}
async function fix(value = sample()) {
  await act(async () => state.success!(value));
}
async function enter() {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  await fix();
  await screen.findByRole("button", { name: "Explore Verified place" });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.permission = "prompt";
  state.maps.length = 0;
  state.markers.length = 0;
  state.success = null;
  state.error = null;
  state.current.mockReset();
  state.permissionChanged = null;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("fetch", state.fetch);
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: {
      query: async () => ({
        get state() {
          return state.permission;
        },
        addEventListener(_event: string, callback: () => void) {
          state.permissionChanged = callback;
        },
        removeEventListener() {},
      }),
    },
  });
  state.watch.mockImplementation(((
    success: PositionCallback,
    error: PositionErrorCallback,
  ) => {
    state.success = success;
    state.error = error;
    return 7;
  }) as typeof state.watch);
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      watchPosition: state.watch,
      clearWatch: state.clear,
      getCurrentPosition: state.current,
    },
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  Object.assign(window, {
    AkiPals3D: {
      mount: () => ({ setAppearance: async () => {}, dispose() {} }),
    },
  });
  state.fetch.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url === "/pals/identity"
        ? { appearance: {} }
        : {
            venues: [
              {
                id: "real-1",
                slug: "verified-place",
                name: "Verified place",
                latitude: 36.544,
                longitude: -4.624,
                claimStatus: "claimed",
              },
            ],
          },
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (window as Window & { AkiPals3D?: unknown }).AkiPals3D;
});
it("starts the browser permission flow automatically but requires a real fix before any map, avatar or venue read", async () => {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  expect(
    screen.queryByRole("button", { name: "Enable location" }),
  ).not.toBeInTheDocument();
  expect(state.maps).toHaveLength(0);
  expect(state.fetch).not.toHaveBeenCalled();
  expect(state.maps).toHaveLength(0);
  await fix();
  await screen.findByRole("button", { name: "Explore Verified place" });
  expect(state.maps[0].center).toEqual([-4.623, 36.543]);
  expect(state.maps[0].padding).toEqual({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  expect(
    screen.queryByRole("button", { name: "Stop location tracking" }),
  ).not.toBeInTheDocument();
  expect(
    state.fetch.mock.calls.some(([url]) =>
      String(url).includes("lat=36.54&lng=-4.62"),
    ),
  ).toBe(true);
});
it("reuses a granted permission without rendering a placeholder location", async () => {
  state.permission = "granted";
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  expect(state.maps).toHaveLength(0);
  expect(state.fetch).not.toHaveBeenCalled();
  await fix();
  await screen.findByRole("button", { name: "Explore Verified place" });
  expect(state.maps).toHaveLength(1);
});
it("waits for an improving initial fix instead of spawning or cancelling on weak samples", async () => {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  await fix(sample(500));
  await fix(sample(10, 31000));
  expect(state.maps).toHaveLength(0);
  expect(state.fetch).not.toHaveBeenCalled();
  expect(state.clear).not.toHaveBeenCalled();
  await fix();
  await screen.findByRole("button", { name: "Explore Verified place" });
});
it("keeps the actual venue destination and selection without moving the player camera", async () => {
  await enter();
  fireEvent.click(
    screen.getByRole("button", { name: "Explore Verified place" }),
  );
  expect(screen.getByRole("link", { name: "View place ↗" })).toHaveAttribute(
    "href",
    "/en/venues/verified-place",
  );
  expect(state.maps[0].center).toEqual([-4.623, 36.543]);
  fireEvent.click(screen.getByRole("button", { name: "Back to World" }));
  expect(state.maps[0].center).toEqual([-4.623, 36.543]);
});
it("removes world on hide and reacquires fresh granted GPS on return", async () => {
  state.permission = "granted";
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  await fix();
  await screen.findByRole("button", { name: "Explore Verified place" });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  fireEvent(document, new Event("visibilitychange"));
  expect(state.clear).toHaveBeenCalledWith(7);
  expect(
    screen.queryByLabelText("Your AkiPal game character"),
  ).not.toBeInTheDocument();
  expect(state.remove).toHaveBeenCalled();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  fireEvent(document, new Event("visibilitychange"));
  await waitFor(() => expect(state.watch).toHaveBeenCalledTimes(2));
  expect(
    screen.queryByRole("region", {
      name: "AkiPals interactive exploration map",
    }),
  ).not.toBeInTheDocument();
  await fix();
  await screen.findByRole("button", { name: "Explore Verified place" });
  expect(state.maps).toHaveLength(2);
});
it("fails closed on denied GPS and retains the edit-only wardrobe exit", async () => {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  await act(async () => state.error!({ code: 1 } as GeolocationPositionError));
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(state.maps).toHaveLength(0);
  expect(state.fetch).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: "Wardrobe" })).toHaveAttribute(
    "href",
    "/pals",
  );
});
it("provides Spanish waiting status without an extra location button or coordinate reads", async () => {
  render(
    React.createElement(WorldExplorer, {
      styleUrl: "/style.json",
      locale: "es",
    }),
  );
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  expect(
    screen.queryByRole("button", { name: "Activar ubicación" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Armario" })).toHaveAttribute(
    "href",
    "/pals?lang=es",
  );
  expect(state.watch).toHaveBeenCalledOnce();
  expect(state.fetch).not.toHaveBeenCalled();
});

it("expires an actual stale last fix when no stationary refresh succeeds", async () => {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  await fix(sample(10, 29900));
  await screen.findByRole("button", { name: "Explore Verified place" });
  await screen.findByRole("button", { name: "Try again" });
  expect(state.current).toHaveBeenCalledOnce();
  expect(state.clear).toHaveBeenCalledWith(7);
  expect(
    screen.queryByRole("region", {
      name: "AkiPals interactive exploration map",
    }),
  ).not.toBeInTheDocument();
});
it("refreshes a stationary fix using a new sensor timestamp without repeated coarse reads", async () => {
  state.current.mockImplementation((success: PositionCallback) =>
    success(sample()),
  );
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  await fix(sample(10, 20001));
  await screen.findByRole("button", { name: "Explore Verified place" });
  await waitFor(() => expect(state.current).toHaveBeenCalledOnce());
  expect(
    state.fetch.mock.calls.filter(([url]) =>
      String(url).startsWith("/pals/world/venues"),
    ),
  ).toHaveLength(1);
  expect(
    screen.queryByRole("button", { name: "Try again" }),
  ).not.toBeInTheDocument();
});
it("pauses the real world immediately when browser permission is revoked", async () => {
  state.permission = "granted";
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  await fix();
  await screen.findByRole("button", { name: "Explore Verified place" });
  await act(async () => {
    state.permission = "denied";
    state.permissionChanged!();
  });
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(state.clear).toHaveBeenCalledWith(7);
  expect(
    screen.queryByRole("region", {
      name: "AkiPals interactive exploration map",
    }),
  ).not.toBeInTheDocument();
});

it("keeps a genuinely fresh stationary fix during a transient watch timeout", async () => {
  await enter();
  await act(async () => state.error!({ code: 3 } as GeolocationPositionError));
  expect(
    screen.getByRole("region", { name: "AkiPals interactive exploration map" }),
  ).toBeInTheDocument();
  expect(state.clear).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Try again" }),
  ).not.toBeInTheDocument();
});

it.each(["unsupported", "query-failure"])(
  "starts native GPS without an extra app button when permission query is %s",
  async (mode) => {
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value:
        mode === "unsupported"
          ? undefined
          : {
              query: async () => {
                throw new Error("unsupported");
              },
            },
    });
    render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
    await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
    expect(state.maps).toHaveLength(0);
    expect(state.fetch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Enable location" }),
    ).not.toBeInTheDocument();
  },
);
it("does not spam denied native permission, then resumes automatically after a browser grant", async () => {
  state.permission = "denied";
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await screen.findByRole("button", { name: "Try again" });
  expect(state.watch).not.toHaveBeenCalled();
  expect(state.maps).toHaveLength(0);
  await act(async () => {
    state.permission = "granted";
    state.permissionChanged!();
  });
  expect(state.watch).toHaveBeenCalledOnce();
  await fix();
  await screen.findByRole("button", { name: "Explore Verified place" });
});
it("keeps the existing watch and map when the first native permission prompt becomes granted", async () => {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.watch).toHaveBeenCalledOnce());
  await act(async () => {
    state.permission = "granted";
    state.permissionChanged!();
  });
  expect(state.watch).toHaveBeenCalledOnce();
  expect(state.clear).not.toHaveBeenCalled();
  await fix();
  await screen.findByRole("button", { name: "Explore Verified place" });
  await act(async () => state.permissionChanged!());
  expect(state.watch).toHaveBeenCalledOnce();
  expect(state.clear).not.toHaveBeenCalled();
});
