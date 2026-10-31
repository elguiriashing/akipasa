import { akiSuiteMembershipReturnPath } from "./akisuite-catalogue";
import {
  accountCollectionPage,
  accountCollectionQuery,
} from "./account-collection-query";

const children = new Set([
  "",
  "profile",
  "settings",
  "privacy",
  "saved",
  "following",
  "activity",
  "bookings",
  "premium",
  "rewards",
  "referrals",
  "membership",
  "memberships",
  "subscription",
  "subscription/operations",
]);
/** A public navigation target, never an authorization or identity claim. */
export function accountReturnPath(
  locale: "en" | "es",
  candidate: string | null,
  membership: string | null = null,
) {
  const fallback = akiSuiteMembershipReturnPath(locale, membership);
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    /[\\\r\n]/.test(candidate)
  )
    return fallback;
  try {
    const url = new URL(candidate, "https://akipasa.com");
    const base = `/${locale}/account`;
    const child =
      url.pathname === base || url.pathname === `${base}/`
        ? ""
        : url.pathname.startsWith(`${base}/`)
          ? url.pathname.slice(base.length + 1).replace(/\/$/, "")
          : null;
    if (
      url.origin !== "https://akipasa.com" ||
      child === null ||
      !children.has(child) ||
      /%|\.\./.test(candidate.split("?")[0])
    )
      return fallback;
    const path = child ? `${base}/${child}` : base;
    if (["subscription", "subscription/operations"].includes(child))
      return akiSuiteMembershipReturnPath(locale, path + url.search);
    const query = new URLSearchParams();
    const single = (key: string) =>
      url.searchParams.getAll(key).length === 1
        ? url.searchParams.get(key)
        : null;
    if (["saved", "following"].includes(child)) {
      const search = single("q");
      if (search) query.set("q", accountCollectionQuery(search));
      const page = single("page");
      if (page && /^\d+$/.test(page))
        query.set("page", String(accountCollectionPage(page)));
    }
    if (child === "bookings") {
      const tab = single("tab");
      if (tab && ["upcoming", "active", "past"].includes(tab))
        query.set("tab", tab);
      const page = single("page");
      if (page && /^\d+$/.test(page))
        query.set(
          "page",
          String(Math.min(10000, Number.parseInt(page, 10) || 0)),
        );
    }
    if (child === "referrals") {
      const ref = single("ref");
      if (ref && /^[A-Z0-9]{8,24}$/.test(ref)) query.set("ref", ref);
      const period = single("period");
      if (period && ["30", "90", "365"].includes(period))
        query.set("period", period);
    }
    return path + (query.size ? `?${query}` : "");
  } catch {
    return fallback;
  }
}
