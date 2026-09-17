export const RESULT_PAGE_SIZE = 20;
export type ResultQuery = Record<string, string | string[] | undefined>;

export function resultPage(value: string | string[] | undefined) {
  const page =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1;
}

export function resultPageHref(
  path: string,
  query: ResultQuery,
  key: string,
  page: number,
  anchor: string,
) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (typeof value === "string") params.set(name, value);
    else if (Array.isArray(value))
      value.forEach((item) => params.append(name, item));
  }
  if (page <= 1) params.delete(key);
  else params.set(key, String(page));
  return `${path}?${params.toString()}#${anchor}`;
}

export function resultSlice<T>(items: T[], requestedPage: number) {
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(items.length / RESULT_PAGE_SIZE)),
  );
  return {
    rows: items.slice((page - 1) * RESULT_PAGE_SIZE, page * RESULT_PAGE_SIZE),
    page,
    total: items.length,
  };
}
