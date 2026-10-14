import type { Locale } from "./config";

/** Rewrite only canonical local collection destinations, retaining trip identity. */
export function collectionHref(href: string, locale: Locale): string {
  if (
    /[\\\x00-\x20]/.test(href) ||
    !/^\/(en|es)\/(events|venues)\/[A-Za-z0-9_-]+(?:[?#]|$)/.test(href)
  )
    return href;
  return href.replace(/^\/(en|es)(?=\/)/, `/${locale}`);
}
