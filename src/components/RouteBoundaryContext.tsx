"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useSyncExternalStore,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/config";

export type RouteBoundaryProduct =
  | "akipasa"
  | "akibusiness"
  | "akiduermo"
  | "akiconduzco";
type BoundaryContext = { locale: Locale; product: RouteBoundaryProduct };
const Context = createContext<BoundaryContext>({
  locale: "es",
  product: "akipasa",
});

export function boundaryProduct(value: string | null): RouteBoundaryProduct {
  return value === "akibusiness" ||
    value === "akiduermo" ||
    value === "akiconduzco"
    ? value
    : "akipasa";
}
function subscribeLocale(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener("akipasa:locale-change", listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener("akipasa:locale-change", listener);
  };
}

/** Public presentation context only. Never stores identity, roles or raw queries. */
export function RouteBoundaryProvider({
  locale,
  product,
  children,
}: {
  locale: Locale;
  product: string | null;
  children: ReactNode;
}) {
  const currentProduct = boundaryProduct(product),
    pathname = usePathname();
  const querySnapshot = useCallback(() => {
    if (currentProduct === "akipasa") return null;
    const language = new URLSearchParams(window.location.search).get("lang");
    return language === "en" || language === "es" ? language : null;
  }, [currentProduct]);
  const queryLocale = useSyncExternalStore(
    subscribeLocale,
    querySnapshot,
    () => null,
  );
  const pathLocale = pathname?.match(/^\/(en|es)(?=\/|$)/)?.[1];
  const currentLocale: Locale =
    pathLocale === "en" || pathLocale === "es"
      ? pathLocale
      : queryLocale || locale;
  const value = useMemo(
    () => ({ locale: currentLocale, product: currentProduct }),
    [currentLocale, currentProduct],
  );
  useEffect(() => {
    document.documentElement.lang = currentLocale;
  }, [currentLocale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useRouteBoundary() {
  return useContext(Context);
}
