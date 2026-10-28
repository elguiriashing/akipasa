/**
 * Scan navigation only. The server-owned venue token page remains responsible
 * for authentication, current venue proof and idempotent reward grants.
 */
export function verifiedVenueQrPath(
  raw: string,
  origin: string,
  locale: "en" | "es",
): string | null {
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin || url.search || url.hash) return null;
    if (!new RegExp(`^/${locale}/check-in/[0-9a-f-]{36}$`, "i").test(url.pathname)) {
      return null;
    }
    return url.pathname;
  } catch {
    return null;
  }
}
