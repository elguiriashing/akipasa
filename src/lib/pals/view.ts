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
import { legacyWardrobeEntitlements } from "./entitlements";
import { familyStyles, wardrobeCategories, stylesForItem } from "./style-guide";
import { journeySummary } from "./journey";
import { arcadeSummary } from "./arcade";

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
      journey: journeySummary(state, now),
      arcade: arcadeSummary(state, now),
      activeModules: activeModules(state),
      parcels: parcels(state, now),
      portrait: statePortrait(state),
      renderSnapshot: renderSnapshotFromState(state),
      entitlements:
        state.entitlements ??
        legacyWardrobeEntitlements(
          state.wardrobe,
          new Date(state.updatedAt || now).toISOString(),
        ),
    },
    ...(includeCatalogue
      ? {
          catalog: {
            families: families.map((f) => ({
              ...f,
              style: familyStyles[f.id],
              baseSvg: palSvg(f.id, [], `base-${f.id}`),
              masterSvg: palSvg(f.id, f.master, `master-${f.id}`, true),
              signatureSvg: palSvg(
                f.id,
                familyStyles[f.id].signature,
                `style-${f.id}`,
                true,
              ),
            })),
            designs: designs.map((d) => ({
              ...d,
              svg: itemSvg(d),
              styleFamilies: stylesForItem(d.id),
            })),
            wardrobeCategories,
            adventures,
            cityCollections,
            v2: legacyCatalogue(),
          },
        }
      : {}),
  };
}
