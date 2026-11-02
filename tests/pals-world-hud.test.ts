// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  watch: vi.fn(() => 7),
  clear: vi.fn(),
  fly: vi.fn(),
  remove: vi.fn(),
  fetch: vi.fn(),
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
    constructor(options: { container: HTMLElement }) {
      this.node = options.container;
    }
    setPadding() {}
    addControl() {}
    isStyleLoaded() {
      return true;
    }
    on(name: string, fn: () => void) {
      if (name === "load") queueMicrotask(fn);
      return this;
    }
    getSource() {
      return null;
    }
    getCenter() {
      return { lat: 36.543, lng: -4.623 };
    }
    getZoom() {
      return 16;
    }
    flyTo = state.fly;
    easeTo() {}
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
beforeEach(() => {
  vi.clearAllMocks();
  state.markers.length = 0;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("fetch", state.fetch);
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { watchPosition: state.watch, clearWatch: state.clear },
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
  vi.unstubAllGlobals();
  delete (window as Window & { AkiPals3D?: unknown }).AkiPals3D;
});
it("starts with map controls and real venues without requesting GPS or invented gameplay", async () => {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  expect(
    screen.getByRole("button", { name: "Locate my AkiPal" }),
  ).toHaveAttribute("aria-pressed", "false");
  await screen.findByRole("button", { name: "Explore Verified place" });
  expect(state.watch).not.toHaveBeenCalled();
  expect(
    screen.queryByText(/Level up life|Crews · Soon|Passport · Soon/),
  ).not.toBeInTheDocument();
  expect(
    state.fetch.mock.calls.some(([url]) =>
      String(url).includes("lat=36.54&lng=-4.62"),
    ),
  ).toBe(true);
});
it("opens nearby sheet on request, selects real coordinate marker and offers actual venue route", async () => {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  const pin = await screen.findByRole("button", {
    name: "Explore Verified place",
  });
  const nearby = screen.getByRole("button", { name: "Nearby places" });
  expect(nearby).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(nearby);
  expect(nearby).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(screen.getByRole("button", { name: "Close nearby places" }));
  expect(nearby).toHaveFocus();
  fireEvent.click(pin);
  expect(
    await screen.findByRole("link", { name: "View place ↗" }),
  ).toHaveAttribute("href", "/en/venues/verified-place");
  expect(screen.getByText(/From map center:/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show on map" }));
  expect(state.fly).toHaveBeenCalledWith(
    expect.objectContaining({ center: [-4.624, 36.544] }),
  );
  const marker = state.markers.find(
    (m) => m.element.getAttribute("aria-label") === "Explore Verified place",
  );
  expect(marker?.position).toEqual([-4.624, 36.544]);
});
it("keeps location explicit and stops a pending watch when backgrounded", async () => {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  await waitFor(() => expect(state.markers.length).toBeGreaterThan(0));
  fireEvent.click(screen.getByRole("button", { name: "Locate my AkiPal" }));
  expect(state.watch).toHaveBeenCalledOnce();
  expect(
    screen.getByRole("button", { name: "Stop location tracking" }),
  ).toHaveAttribute("aria-pressed", "true");
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  fireEvent(document, new Event("visibilitychange"));
  expect(state.clear).toHaveBeenCalledWith(7);
  expect(
    screen.getByRole("button", { name: "Locate my AkiPal" }),
  ).toHaveAttribute("aria-pressed", "false");
});
it("offers short optional privacy help instead of automatic panels", async () => {
  render(React.createElement(WorldExplorer, { styleUrl: "/style.json" }));
  expect(
    screen.queryByRole("heading", { name: "Map & location" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "About AkiWorld" }));
  expect(
    screen.getByRole("heading", { name: "Map & location" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close World help" }));
  expect(screen.getByRole("button", { name: "About AkiWorld" })).toHaveFocus();
  expect(state.watch).not.toHaveBeenCalled();
});

it("keeps Spanish map controls and actual destination locale without GPS on arrival", async () => {
  render(
    React.createElement(WorldExplorer, {
      styleUrl: "/style.json",
      locale: "es",
    }),
  );
  expect(
    screen.getByRole("button", { name: "Localizar mi AkiPal" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Armario" })).toHaveAttribute(
    "href",
    "/pals?lang=es",
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Explorar Verified place" }),
  );
  expect(screen.getByRole("link", { name: "Ver lugar ↗" })).toHaveAttribute(
    "href",
    "/es/venues/verified-place",
  );
  expect(state.watch).not.toHaveBeenCalled();
});
