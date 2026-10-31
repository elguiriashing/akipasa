// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  instances: [] as Array<{
    options: Record<string, unknown>;
    handlers: Map<string, () => void>;
    remove: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    jumpTo: ReturnType<typeof vi.fn>;
    addControl: ReturnType<typeof vi.fn>;
  }>,
  router: {},
  track: vi.fn(),
  failConstruction: false,
  manualGeolocate: { kind: "manual-geolocate-control" },
}));
vi.mock("next/navigation", () => ({ useRouter: () => mock.router }));
vi.mock("@/lib/personalisation/client", () => ({ trackBehaviour: mock.track }));
vi.mock("@/lib/map-theme", () => ({
  applyMapTheme: vi.fn(),
  readMapTheme: () => "light",
}));
vi.mock("@/lib/map-geolocation", () => ({
  createMapGeolocateControl: () => mock.manualGeolocate,
  mapGeolocationLocale: () => ({}),
}));
vi.mock("@/lib/map-tiles", () => ({ MapTileLoader: class {} }));
vi.mock("maplibre-gl", () => ({
  Map: class {
    handlers = new globalThis.Map<string, () => void>();
    remove = vi.fn();
    off = vi.fn((name: string) => this.handlers.delete(name));
    constructor(public options: Record<string, unknown>) {
      if (mock.failConstruction) throw new Error("WebGL unavailable");
      mock.instances.push(this);
    }
    on(name: string, handler: () => void) {
      this.handlers.set(name, handler);
    }
    once() {}
    addControl = vi.fn();
    jumpTo = vi.fn();
    getCenter() {
      return { lat: 36.6, lng: -4.7 };
    }
    getZoom() {
      return 12;
    }
  },
  NavigationControl: class {},
  GeolocateControl: class {},
  ScaleControl: class {},
  AttributionControl: class {},
}));

import { ProductionMap } from "../src/components/ProductionMap";

const props = {
  locale: "en" as const,
  points: [],
  styleUrl: "https://maps.example.invalid/style.json",
  center: { latitude: 36.54, longitude: -4.62 },
};

const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  "geolocation",
);
afterEach(() => {
  if (originalGeolocation)
    Object.defineProperty(navigator, "geolocation", originalGeolocation);
  else Reflect.deleteProperty(navigator, "geolocation");
  cleanup();
  mock.instances.length = 0;
  mock.failConstruction = false;
  vi.clearAllMocks();
});

describe("asynchronous basemap availability", () => {
  it.each(["en", "es"] as const)(
    "%s: explains provider failure and retries without losing camera, place type or URL filters",
    async (locale) => {
      window.history.replaceState(
        {},
        "",
        `/${locale}/map?category=music&radius=15`,
      );
      render(<ProductionMap {...props} locale={locale} />);
      await waitFor(() => expect(mock.instances).toHaveLength(1));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "es" ? "Alojamientos" : "Accommodation",
        }),
      );
      act(() => mock.instances[0].handlers.get("error")?.());
      expect(screen.getByRole("alert")).toHaveTextContent(
        locale === "es"
          ? "La lista y los filtros siguen disponibles"
          : "The list and filters are still available",
      );
      const previous = mock.instances[0];
      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "es" ? "Reintentar mapa" : "Retry map",
        }),
      );
      await waitFor(() => expect(mock.instances).toHaveLength(2));
      expect(previous.remove).toHaveBeenCalledOnce();
      expect(previous.off).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mock.instances[1].options).toMatchObject({
        center: [-4.7, 36.6],
        zoom: 12,
      });
      expect(
        screen.getByRole("button", {
          name: locale === "es" ? "Alojamientos" : "Accommodation",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(window.location.search).toBe("?category=music&radius=15");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(mock.track).toHaveBeenCalledOnce();
    },
  );

  it("also retries renderer construction failures without exposing provider errors", async () => {
    mock.failConstruction = true;
    render(<ProductionMap {...props} />);
    expect(await screen.findByRole("alert")).not.toHaveTextContent(
      "WebGL unavailable",
    );
    mock.failConstruction = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry map" }));
    await waitFor(() => expect(mock.instances).toHaveLength(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("selected map location takes precedence over automatic GPS", () => {
  function outsideSpainGps(deliverImmediately = true) {
    const getCurrentPosition = vi.fn(
      (
        success: (position: {
          coords: { latitude: number; longitude: number };
        }) => void,
      ) => {
        if (deliverImmediately)
          success({ coords: { latitude: 35.6892, longitude: 51.389 } });
      },
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    return getCurrentPosition;
  }

  it.each(["en", "es"] as const)(
    "%s: keeps a selected search centre and retains the manual location control",
    async (locale) => {
      const gps = outsideSpainGps();
      window.history.replaceState(
        {},
        "",
        `/${locale}/map?locality=malaga&category=music`,
      );
      render(<ProductionMap {...props} locale={locale} autoLocate={false} />);
      await waitFor(() => expect(mock.instances).toHaveLength(1));
      expect(gps).not.toHaveBeenCalled();
      expect(mock.instances[0].jumpTo).not.toHaveBeenCalled();
      expect(mock.instances[0].options.center).toEqual([-4.62, 36.54]);
      expect(mock.instances[0].addControl).toHaveBeenCalledWith(
        mock.manualGeolocate,
        "top-right",
      );
      expect(window.location.search).toBe("?locality=malaga&category=music");
    },
  );

  it("ignores an in-flight GPS result when the query becomes explicit without rebuilding the live map", async () => {
    const gps = outsideSpainGps(false);
    window.history.replaceState({}, "", "/en/map");
    const { rerender } = render(<ProductionMap {...props} />);
    await waitFor(() => expect(mock.instances).toHaveLength(1));
    expect(gps).toHaveBeenCalledOnce();
    const current = mock.instances[0];
    // Model opening List at the existing, user-positioned camera.
    current.jumpTo({ center: [-4.7, 36.6], zoom: 12 });
    rerender(
      <ProductionMap
        {...props}
        autoLocate={false}
        center={{ latitude: 36.6, longitude: -4.7 }}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    act(() =>
      gps.mock.calls[0][0]({
        coords: { latitude: 35.6892, longitude: 51.389 },
      }),
    );
    expect(mock.instances).toHaveLength(1);
    expect(current.remove).not.toHaveBeenCalled();
    expect(current.jumpTo).toHaveBeenCalledExactlyOnceWith({
      center: [-4.7, 36.6],
      zoom: 12,
    });
    expect(gps).toHaveBeenCalledOnce();
    expect(mock.track).toHaveBeenCalledOnce();
  });

  it("retains implicit GPS behavior and never repeats it on provider retry", async () => {
    const gps = outsideSpainGps();
    render(<ProductionMap {...props} />);
    await waitFor(() => expect(mock.instances).toHaveLength(1));
    expect(gps).toHaveBeenCalledOnce();
    expect(mock.instances[0].jumpTo).toHaveBeenCalledWith({
      center: [51.389, 35.6892],
      zoom: 10.5,
    });
    expect(mock.instances[0].addControl).toHaveBeenCalledWith(
      mock.manualGeolocate,
      "top-right",
    );
    act(() => mock.instances[0].handlers.get("error")?.());
    fireEvent.click(screen.getByRole("button", { name: "Retry map" }));
    await waitFor(() => expect(mock.instances).toHaveLength(2));
    expect(gps).toHaveBeenCalledOnce();
    expect(mock.instances[1].jumpTo).not.toHaveBeenCalled();
    expect(mock.instances[1].options).toMatchObject({
      center: [-4.7, 36.6],
      zoom: 12,
    });
    expect(mock.instances[1].addControl).toHaveBeenCalledWith(
      mock.manualGeolocate,
      "top-right",
    );
  });
});
