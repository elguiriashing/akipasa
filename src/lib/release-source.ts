export type ReleaseAssets = {
  fetch(request: Request): Promise<Response>;
};

export async function releaseSourceCommit(
  assets: ReleaseAssets | undefined,
  request: Request,
): Promise<string | null> {
  if (!assets) return null;
  try {
    const url = new URL("/release-source.json", request.url);
    const response = await assets.fetch(new Request(url));
    if (!response.ok) return null;
    const data = (await response.json()) as { sourceCommit?: unknown };
    return typeof data.sourceCommit === "string" &&
      /^[a-f0-9]{40}$/.test(data.sourceCommit)
      ? data.sourceCommit
      : null;
  } catch {
    return null;
  }
}
