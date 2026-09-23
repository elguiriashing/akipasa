import type { StayLocale } from "./akiduermo-i18n";
export const stayOrigin = "https://akiduermo.akipasa.com";
export function stayHref(slug: string, locale: StayLocale) {
  return `${stayOrigin}/stays/${encodeURIComponent(slug)}?lang=${locale}`;
}
export function stayHostRoute(pathname: string) {
  const legacy = pathname.match(/^\/(en|es)\/venues\/([^/]+)\/?$/);
  if (legacy)
    return {
      kind: "legacy" as const,
      path: `/stays/${legacy[2]}`,
      locale: legacy[1],
    };
  if (pathname === "/" || pathname === "/akiduermo")
    return { kind: "rewrite" as const, path: "/akiduermo" };
  if (/^\/stays\/[^/]+\/?$/.test(pathname))
    return { kind: "rewrite" as const, path: `/akiduermo${pathname}` };
  if (pathname.startsWith("/akiduermo/"))
    return {
      kind: "canonical" as const,
      path: pathname.slice("/akiduermo".length),
    };
  if (
    pathname === "/api/stays" ||
    pathname.startsWith("/api/map/") ||
    pathname.startsWith("/_next/")
  )
    return { kind: "public" as const, path: pathname };
  if (pathname.startsWith("/api/"))
    return { kind: "reject" as const, path: pathname };
  return { kind: "primary" as const, path: pathname };
}
