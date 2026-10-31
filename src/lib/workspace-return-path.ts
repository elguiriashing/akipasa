/** A bounded navigation target only; never evidence of workspace authorization. */
export function workspaceReturnPath(
  locale: "en" | "es",
  area: "staff" | "admin",
  candidate: string | null,
): string | null {
  if (
    !candidate ||
    candidate.length > 2048 ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(candidate)
  )
    return null;

  const pathname = candidate.split(/[?#]/, 1)[0];
  if (
    pathname.includes("%") ||
    pathname.split("/").some((part) => part === "." || part === "..")
  )
    return null;

  try {
    const url = new URL(candidate, "https://akipasa.com");
    const base = `/${locale}/${area}`;
    if (
      url.origin !== "https://akipasa.com" ||
      (url.pathname !== base && !url.pathname.startsWith(`${base}/`))
    )
      return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
