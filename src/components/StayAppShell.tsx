"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";
import { ThemeToggle } from "./ThemeModeControls";
import type { StayLocale } from "@/lib/akiduermo-i18n";
import styles from "./StayAppShell.module.css";

const items = [
  { href: "/", icon: "discover", en: "Explore", es: "Descubrir" },
  { href: "/map", icon: "map", en: "Map", es: "Mapa" },
  { href: "/saved", icon: "saved", en: "Saved", es: "Guardados" },
  { href: "/bookings", icon: "bed", en: "Bookings", es: "Reservas" },
  { href: "/account", icon: "account", en: "Account", es: "Cuenta" },
] as const;

export function StayAppShell({
  locale,
  children,
  fullMap = false,
}: {
  locale: StayLocale;
  children: React.ReactNode;
  fullMap?: boolean;
}) {
  const pathname = usePathname();
  const lang = locale;
  const es = lang === "es";
  const active = pathname?.replace(/^\/akiduermo/, "") || "/";
  function changeLanguage() {
    const next = es ? "en" : "es";
    document.cookie = `akiduermo_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const url = new URL(location.href);
    url.searchParams.set("lang", next);
    location.assign(url.toString());
  }
  return (
    <div className={`${styles.shell} ${fullMap ? styles.fullMap : ""}`}>
      <header className={styles.header}>
        <Link
          href={`/?lang=${lang}`}
          className={styles.brand}
          aria-label={es ? "Inicio de AkiDuermo" : "AkiDuermo home"}
        >
          <span className="app-rail-mark" aria-hidden="true">
            A
          </span>{" "}
          AkiDuermo<span className={styles.dot}>.</span>
        </Link>
        <div className={styles.headerTools}>
          <ThemeToggle locale={lang as StayLocale} />
          <button
            type="button"
            onClick={changeLanguage}
            aria-label={es ? "Switch to English" : "Cambiar a español"}
          >
            {es ? "EN" : "ES"}
          </button>
          <Link
            href={`/settings?lang=${lang}`}
            aria-label={es ? "Ajustes" : "Settings"}
          >
            <Icon name="settings" size={20} />
          </Link>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <nav
        className={styles.nav}
        aria-label={es ? "Navegación de AkiDuermo" : "AkiDuermo navigation"}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={`${item.href}?lang=${lang}`}
            aria-current={
              active === item.href ||
              (item.href === "/account" && active === "/settings")
                ? "page"
                : undefined
            }
          >
            <Icon name={item.icon} size={21} />
            <span>{es ? item.es : item.en}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
