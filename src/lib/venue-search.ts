export type VenueSearchResult = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
};

export function normalizeVenueSearch(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function escapeVenueSearchPattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function comparable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES");
}

export function rankVenueSearchResults(
  rows: VenueSearchResult[],
  query: string,
  limit = 8,
) {
  const needle = comparable(normalizeVenueSearch(query));
  const score = (name: string) => {
    const normalized = comparable(name);
    if (normalized === needle) return 0;
    if (normalized.startsWith(needle)) return 1;
    if (normalized.includes(` ${needle}`)) return 2;
    return 3;
  };

  return [...rows]
    .sort(
      (a, b) =>
        score(a.name) - score(b.name) ||
        a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    )
    .slice(0, limit);
}
