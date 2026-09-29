import type { Map } from "maplibre-gl";

type MapTheme = "light" | "dark";
type PaletteMap = Pick<
  Map,
  "getStyle" | "getPaintProperty" | "setPaintProperty"
>;

const palettes = {
  dark: {
    background: "#14213d",
    water: "#294d71",
    park: "#233c51",
    building: "#334864",
    land: "#1c2d4b",
    highway: "#f26b1d",
    road: "#697991",
    text: "#e5eaf2",
    halo: "#14213d",
  },
  light: {
    background: "#faf7f2",
    water: "#bedced",
    park: "#e1e9df",
    building: "#e3e0dc",
    land: "#f4f1eb",
    highway: "#e7a274",
    road: "#c2c9d2",
    text: "#14213d",
    halo: "#faf7f2",
  },
} as const;

export function readMapTheme(
  root: Pick<HTMLElement, "dataset" | "classList">,
): MapTheme {
  if (root.dataset.theme === "light") return "light";
  if (root.dataset.theme === "dark") return "dark";
  return root.classList.contains("theme-light") ? "light" : "dark";
}

/** Repaint the existing basemap without resetting its camera, sources or markers. */
export function applyMapTheme(map: PaletteMap, theme: MapTheme) {
  const palette = palettes[theme];
  for (const layer of map.getStyle().layers || []) {
    const id = layer.id.toLowerCase();
    if (id.startsWith("discovery-")) continue;
    try {
      if (layer.type === "background")
        map.setPaintProperty(layer.id, "background-color", palette.background);
      if (layer.type === "fill") {
        const color = /water/.test(id)
          ? palette.water
          : /park|wood|forest|grass/.test(id)
            ? palette.park
            : /building/.test(id)
              ? palette.building
              : /land|residential/.test(id)
                ? palette.land
                : undefined;
        if (color) map.setPaintProperty(layer.id, "fill-color", color);
      }
      if (layer.type === "line") {
        const color = /motorway|trunk|primary/.test(id)
          ? palette.highway
          : /road|street|path/.test(id)
            ? palette.road
            : undefined;
        if (color) map.setPaintProperty(layer.id, "line-color", color);
      }
      if (layer.type === "symbol") {
        if (map.getPaintProperty(layer.id, "text-color") !== undefined)
          map.setPaintProperty(layer.id, "text-color", palette.text);
        if (map.getPaintProperty(layer.id, "text-halo-color") !== undefined)
          map.setPaintProperty(layer.id, "text-halo-color", palette.halo);
      }
    } catch {
      // A third-party style can contain immutable or unsupported properties.
    }
  }
}
