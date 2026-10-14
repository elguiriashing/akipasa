export const accountCollectionPageSize = 24;

export function accountCollectionQuery(value: string | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function accountCollectionPage(value: string | undefined) {
  const parsed = Number.parseInt(value || "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function accountCollectionHref({
  basePath,
  page,
  query,
}: {
  basePath: string;
  page?: number;
  query?: string;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page && page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}
