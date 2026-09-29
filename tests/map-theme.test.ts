import { expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";
import { applyMapTheme } from "../src/lib/map-theme";

it("switches the existing basemap in both directions without repainting discovery markers", () => {
  const paint = new globalThis.Map<string, unknown>();
  const layers = [
    { id: "background", type: "background" },
    { id: "water", type: "fill" },
    { id: "landuse-park", type: "fill" },
    { id: "road-primary", type: "line" },
    { id: "place-city", type: "symbol" },
    { id: "discovery-cluster-count", type: "symbol" },
  ];
  const map = {
    getStyle: () => ({ layers }),
    getPaintProperty: () => "original",
    setPaintProperty: vi.fn((id: string, property: string, value: unknown) => {
      paint.set(`${id}:${property}`, value);
    }),
  } as unknown as Pick<
    Map,
    "getStyle" | "getPaintProperty" | "setPaintProperty"
  >;
  applyMapTheme(map, "dark");
  expect(paint.get("water:fill-color")).toBe("#294d71");
  const darkPaint = new globalThis.Map(paint);
  applyMapTheme(map, "light");
  expect(paint.get("background:background-color")).toBe("#faf7f2");
  expect(paint.get("water:fill-color")).toBe("#bedced");
  expect(paint.get("place-city:text-color")).toBe("#14213d");
  expect(paint.get("road-primary:line-color")).toBe("#e7a274");
  expect(paint.has("discovery-cluster-count:text-color")).toBe(false);
  applyMapTheme(map, "dark");
  expect(paint).toEqual(darkPaint);
});
