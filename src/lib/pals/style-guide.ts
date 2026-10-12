import type { Family, Slot } from "./engine";

/** Editorial styling only. These looks do not grant items or alter ownership. */
export type FamilyStyle = {
  title: string;
  description: string;
  motif: string;
  accent: string;
  backdrop: string;
  signature: [string, string, string, string];
};

export const familyStyles: Record<Family, FamilyStyle> = {
  brasa: {
    title: "Kitchen Heat",
    description: "Ember red, brass details and one very well-earned apron.",
    motif: "flame",
    accent: "#ff9561",
    backdrop: "#f8e3ce",
    signature: ["brasa-band", "brasa-apron", "brewer-pack", "gold-pan"],
  },
  moka: {
    title: "Slow Roast",
    description: "Coffee suede, oat-milk trims and nowhere to be before noon.",
    motif: "bean",
    accent: "#c29470",
    backdrop: "#efe3d1",
    signature: ["moka-beret", "moka-coat", "brewer-pack", "coffee-cup"],
  },
  tapo: {
    title: "Terrace Club",
    description:
      "Olive greens and terracotta for the table that stays all afternoon.",
    motif: "olive",
    accent: "#b4c875",
    backdrop: "#edf0d6",
    signature: ["tapo-flowers", "tapo-apron", "market-tote", "tapas-tray"],
  },
  lux: {
    title: "After Hours",
    description: "Ink violet, electric mint and a little moonlit drama.",
    motif: "moon",
    accent: "#b6a0f1",
    backdrop: "#e8e1fa",
    signature: ["lux-goggles", "lux-coat", "neon-wings", "microphone"],
  },
  musa: {
    title: "Studio Sunday",
    description: "Clay, paint and a wearable collection of happy accidents.",
    motif: "spark",
    accent: "#deac92",
    backdrop: "#f5e6dc",
    signature: ["musa-flowers", "musa-robe", "market-tote", "sketchbook"],
  },
  lupa: {
    title: "Market Scout",
    description: "Petrol blue, canvas pockets and an eye for the unexpected.",
    motif: "diamond",
    accent: "#8dbcca",
    backdrop: "#dfecef",
    signature: ["lupa-cap", "lupa-vest", "market-tote", "camera"],
  },
  rayo: {
    title: "Golden Hour",
    description: "Sunset orange, racing stripes and energy to spare.",
    motif: "bolt",
    accent: "#f0bd64",
    backdrop: "#faf0cd",
    signature: ["rayo-goggles", "rayo-vest", "trail-pack", "pennant"],
  },
  nube: {
    title: "Soft Reset",
    description: "Sea-glass blue, soft layers and absolutely no urgent plans.",
    motif: "cloud",
    accent: "#a5d1df",
    backdrop: "#e5f3f4",
    signature: ["nube-beret", "nube-coat", "neon-wings", "tea-cup"],
  },
  chispa: {
    title: "Tiny Expedition",
    description: "Sticker pink, scout patches and big ideas in little pockets.",
    motif: "star",
    accent: "#f2aaa6",
    backdrop: "#f9e4df",
    signature: ["chispa-cap", "chispa-vest", "trail-pack", "camera"],
  },
  brote: {
    title: "Scenic Route",
    description: "Forest green, field-notebook details and the long way home.",
    motif: "leaf",
    accent: "#95be8f",
    backdrop: "#e4eeda",
    signature: ["brote-band", "brote-robe", "trail-pack", "walking-staff"],
  },
};

export const wardrobeCategories: {
  slot: Slot;
  title: string;
  description: string;
}[] = [
  {
    slot: "head",
    title: "Headwear",
    description: "Hats, crowns and bright ideas.",
  },
  {
    slot: "body",
    title: "Layers",
    description: "Jackets, wraps and everyday uniforms.",
  },
  {
    slot: "back",
    title: "Carry-ons",
    description: "Packs, totes and a little extra flair.",
  },
  {
    slot: "held",
    title: "Little extras",
    description: "Something to take on the adventure.",
  },
];

export function stylesForItem(itemId: string): Family[] {
  return (Object.keys(familyStyles) as Family[]).filter((family) =>
    familyStyles[family].signature.includes(itemId),
  );
}
