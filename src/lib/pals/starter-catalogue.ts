/** First-party free starter presets. IDs, never user-supplied asset URLs. */
export const PALS_RUNTIME_VERSION = "20261101-starter-1";
export const STARTER_OUTFITS = ["crew", "varsity", "explorer"] as const;
export const STARTER_HAIR = ["original", "swept", "cropped"] as const;
export const STARTER_PALETTES = [
  "ember",
  "midnight",
  "coast",
  "orchid",
  "sand",
] as const;
export const STARTER_HAIR_COLORS = [
  "espresso",
  "black",
  "copper",
  "blonde",
  "silver",
  "pink",
] as const;
export const STARTER_COLORS = {
  ember: { top: "#e9763e", bottom: "#272b35", trim: "#ffe0ae" },
  midnight: { top: "#253547", bottom: "#161e2c", trim: "#8ecac9" },
  coast: { top: "#65b6a3", bottom: "#344f65", trim: "#f9edd7" },
  orchid: { top: "#9b7db8", bottom: "#2e293f", trim: "#f4c4d2" },
  sand: { top: "#d6ba8f", bottom: "#584c43", trim: "#f8eadd" },
} as const;
export const STARTER_HAIR_TINTS = {
  espresso: "#483129",
  black: "#23232b",
  copper: "#b56a45",
  blonde: "#d6b673",
  silver: "#bbc4cd",
  pink: "#d38ea8",
} as const;
/** Old rows are retained in storage, but may never select the retired renderer. */
export function authoredModelId(value: unknown): "rain-v3" | "snow-v4" {
  if (value == null || value === "classic-v2" || value === "rain-v3")
    return "rain-v3";
  if (value === "snow-v4") return value;
  throw new Error("Unknown character model");
}
