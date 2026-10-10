"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StayLocale } from "@/lib/akiduermo-i18n";
import { Icon } from "./Icons";
import styles from "./StayAppShell.module.css";

const items = [
  { href: "/", icon: "discover", en: "Explore", es: "Descubrir" },
  { href: "/map", icon: "map", en: "Map", es: "Mapa" },
  { href: "/saved", icon: "saved", en: "Saved", es: "Guardados" },
  { href: "/bookings", icon: "bed", en: "Bookings", es: "Reservas" },
  { href: "/account", icon: "account", en: "Account", es: "Cuenta" },
] as const;

export function StayNavigation({ locale }: { locale: StayLocale }) {
  const pathname = usePathname();
  const active = pathname?.replace(/^\/akiduermo/, "") || "/";
  return (
    <nav
      className={styles.nav}
      aria-label={
        locale === "es" ? "Navegación de AkiDuermo" : "AkiDuermo navigation"
      }
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={`${item.href}?lang=${locale}`}
          aria-current={
            active === item.href ||
            (item.href === "/account" && active === "/settings")
              ? "page"
              : undefined
          }
        >
          <Icon name={item.icon} size={21} />
          <span>{locale === "es" ? item.es : item.en}</span>
        </Link>
      ))}
    </nav>
  );
}
