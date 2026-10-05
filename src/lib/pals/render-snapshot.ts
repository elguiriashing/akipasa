import type { Family, Slot, State } from "./engine";
import { legacyCatalogue } from "./catalogue-legacy";

export type EquippedLayer = {
  slot: Slot | "effect";
  itemId: string;
  appearanceId: string;
  collectionId: string;
};

export type PalRenderSnapshot = {
  version: 1;
  family: Family;
  displayName: string;
  layers: EquippedLayer[];
  effects: string[];
  generatedAt: string;
};

export function renderSnapshotFromState(
  state: State,
  generatedAt = new Date(state.updatedAt || Date.now()).toISOString(),
): PalRenderSnapshot | null {
  if (!state.family) return null;
  const catalogue = legacyCatalogue();
  const itemById = new Map(catalogue.items.map((item) => [item.id, item]));
  const layers = (
    Object.entries(state.equipped) as [Slot, string | null][]
  ).flatMap(([slot, equipmentId]) => {
    if (!equipmentId) return [];
    const equipment = state.equipment.find((entry) => entry.id === equipmentId);
    if (!equipment) return [];
    const item = itemById.get(equipment.appearance);
    if (!item) return [];
    return [
      {
        slot,
        itemId: equipment.design,
        appearanceId: equipment.appearance,
        collectionId: item.collectionId,
      },
    ];
  });

  return {
    version: 1,
    family: state.family,
    displayName: state.name,
    layers,
    effects: [],
    generatedAt,
  };
}
