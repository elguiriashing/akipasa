/** Canonical AkiPasa visual family classifier. Content and auth stay in each route. */
export type PasaSurfaceFamily =
  | "discovery"
  | "map"
  | "checkin"
  | "community"
  | "creators"
  | "pals"
  | "passport"
  | "auth"
  | "account"
  | "operations"
  | "booking"
  | "detail"
  | "legal"
  | "membership"
  | "referral"
  | "roadmap"
  | "generic";

export function pasaSurfaceFamily(pathname: string): PasaSurfaceFamily {
  const route = pathname.replace(/^\/(?:en|es)(?=\/|$)/, "") || "/";
  if (route === "/") return "discovery";
  if (route === "/map" || route.startsWith("/map/")) return "map";
  if (route === "/check-in" || route.startsWith("/check-in/")) return "checkin";
  if (route === "/akipals" || route.startsWith("/akipals/")) return "pals";
  if (route === "/passports" || route.startsWith("/passports/")) return "passport";
  if (
    route === "/auth" ||
    route.startsWith("/auth/") ||
    route === "/onboarding" ||
    route.startsWith("/onboarding/") ||
    route === "/terms/accept"
  )
    return "auth";
  if (route === "/account" || route.startsWith("/account/")) return "account";
  if (
    route === "/admin" ||
    route.startsWith("/admin/") ||
    route === "/staff" ||
    route.startsWith("/staff/") ||
    route === "/owner" ||
    route.startsWith("/owner/") ||
    route === "/business" ||
    route.startsWith("/business/") ||
    route === "/moderation"
  )
    return "operations";
  if (/^\/(?:events|venues)\/[^/]+\/book(?:\/|$)/.test(route))
    return "booking";
  if (/^\/(?:events|venues)\/[^/]+(?:\/|$)/.test(route)) return "detail";
  if (route === "/community/creator" || route.startsWith("/community/creator/"))
    return "creators";
  if (route.startsWith("/community/creators")) return "creators";
  if (route === "/community" || route.startsWith("/community/")) return "community";
  if (route === "/creators" || route.startsWith("/creators/")) return "creators";
  if (
    route === "/privacy" ||
    route.startsWith("/privacy/") ||
    route === "/terms" ||
    route === "/photo-credits"
  )
    return "legal";
  if (
    route === "/membership" ||
    route.startsWith("/membership/") ||
    route === "/duermo/memberships"
  )
    return "membership";
  if (route === "/referrals" || route.startsWith("/referrals/")) return "referral";
  if (route === "/roadmap") return "roadmap";
  return "generic";
}
