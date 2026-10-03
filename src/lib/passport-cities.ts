import { majorCities } from "./city-discovery";
import { spainLocations, type SpainLocationKey } from "./locations";
import scopes from "./achievement-scopes.json";
export const passportCities = scopes.cities.map((c) => {
  const existing = majorCities.find((v) => v.key === c.key);
  if (existing) return existing;
  return {
    key: c.key as SpainLocationKey,
    ...spainLocations[c.key as SpainLocationKey],
    es: c.es,
    en: c.en,
    photo: {
      src: "/passport-placeholder.svg",
      landmark: "AkiPasa · City collection",
      source: "https://akipasa.com",
      title: "AkiPasa city illustration",
      author: "AkiPasa",
      credit: "AkiPasa",
      license: "AkiPasa original artwork",
      licenseUrl: "https://akipasa.com",
      changes: "Illustration — not a photograph",
    },
  };
});
