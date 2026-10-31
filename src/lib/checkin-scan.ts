import { z } from "zod";

const venueCheckInToken = z.string().uuid();

export function isVenueCheckInToken(value: string): boolean {
  return venueCheckInToken.safeParse(value).success;
}

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
    const prefix = `/${locale}/check-in/`;
    if (
      !url.pathname.startsWith(prefix) ||
      !isVenueCheckInToken(url.pathname.slice(prefix.length))
    ) {
      return null;
    }
    return url.pathname;
  } catch {
    return null;
  }
}
