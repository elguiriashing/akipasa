"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "./Icons";
import { discoveryViewHref } from "../lib/discovery-navigation";
import type { Locale } from "../lib/config";

export type PasaDestination = {
  key: "home" | "map" | "checkin" | "community" | "profile";
  href: string;
  label: string;
  icon: IconName;
};
export function pasaDestinations(locale: Locale): PasaDestination[] {
  const es = locale === "es";
  return [
    {
      key: "home",
      href: `/${locale}`,
      label: es ? "Inicio" : "Home",
      icon: "home",
    },
    {
      key: "map",
      href: `/${locale}/map`,
      label: es ? "Mapa" : "Map",
      icon: "map",
    },
    {
      key: "checkin",
      href: `/${locale}/check-in`,
      label: "Check-in",
      icon: "checkin",
    },
    {
      key: "community",
      href: `/${locale}/community`,
      label: es ? "Comunidad" : "Community",
      icon: "community",
    },
    {
      key: "profile",
      href: `/${locale}/account`,
      label: es ? "Perfil" : "Profile",
      icon: "account",
    },
  ];
}
export function PasaBottomDock({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const query = useSearchParams();
  return (
    <nav
      className="app-bottom-nav pasa-dock"
      aria-label={
        locale === "es" ? "Navegación principal" : "Primary navigation"
      }
    >
      {pasaDestinations(locale).map((item) => {
        const active =
          item.key === "home"
            ? pathname === item.href
            : item.key === "profile"
              ? pathname === item.href || pathname.startsWith(item.href + "/")
              : pathname === item.href || pathname.startsWith(item.href + "/");
        const href =
          (item.key === "home" || item.key === "map") &&
          (pathname === `/${locale}` || pathname === `/${locale}/map`)
            ? discoveryViewHref(
                locale,
                item.key === "map" ? "map" : "discover",
                query,
              )
            : item.href;
        const className =
          "pasa-dock__item pasa-dock__item--" +
          item.key +
          (active ? " active" : "");
        return (
          <Link
            key={item.key}
            href={href}
            className={className}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
          >
            <Icon name={item.icon} size={item.key === "checkin" ? 25 : 21} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
