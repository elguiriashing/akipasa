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
    const matched = /^\/(en|es)\/check-in\/([^/]+)$/.exec(url.pathname);
    if (!matched || !isVenueCheckInToken(matched[2])) return null;
    // Printed/tablet credentials are valid in either supported UI language.
    // Only the display locale changes; the server still validates the token.
    return `/${locale}/check-in/${matched[2]}`;
  } catch {
    return null;
  }
}
