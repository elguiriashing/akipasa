/**
 * Legacy profile rows can predate current server-side URL validation.
 * Only render user-provided external website links with an HTTP(S) origin.
 * This is a display guard, not a network fetch or an edit to saved profile data.
 */
export function accountProfileWebsiteHref(
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;
  const value = stored.trim();
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value) || value.startsWith("//"))
    return null;

  const hasHttpScheme = /^https?:\/\//i.test(value);
  // Do not reinterpret javascript:, data:, mailto:, or malformed schemes as
  // hostnames, even when they arrived through a legacy import.
  if (!hasHttpScheme && /^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  const candidate = hasHttpScheme ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    )
      return null;
    return parsed.href;
  } catch {
    return null;
  }
}
