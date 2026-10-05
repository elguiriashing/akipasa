import {
  activeModules,
  adventures,
  cityCollections,
  designs,
  families,
  parcels,
  stats,
  type State,
} from "./engine";
import { itemSvg, palSvg, statePortrait } from "./art";
import { legacyCatalogue } from "./catalogue-legacy";
import { renderSnapshotFromState } from "./render-snapshot";

export function payload(
  state: State,
  version: number,
  includeCatalogue = false,
  now = Date.now(),
) {
  return {
    state,
    version,
    serverNow: now,
    derived: {
      stats: stats(state),
      activeModules: activeModules(state),
      parcels: parcels(state, now),
      portrait: statePortrait(state),
      renderSnapshot: renderSnapshotFromState(state),
    },
    ...(includeCatalogue
      ? {
          catalog: {
            families: families.map((f) => ({
              ...f,
              baseSvg: palSvg(f.id, [], `base-${f.id}`),
              masterSvg: palSvg(f.id, f.master, `master-${f.id}`, true),
            })),
            designs: designs.map((d) => ({ ...d, svg: itemSvg(d) })),
            adventures,
            cityCollections,
            v2: legacyCatalogue(),
          },
        }
      : {}),
  };
}
