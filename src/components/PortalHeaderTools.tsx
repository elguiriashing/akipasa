"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icons";
import { LanguageLink } from "./LanguageLink";
import { PortalLogo } from "./PortalLogo";
import { ThemeToggle } from "./ThemeModeControls";

/** The same language, appearance and app-switching controls on both portals. */
export function PortalHeaderTools({
  locale,
  product,
  onLanguageChange,
  children,
}: {
  locale: "en" | "es";
  product: "business" | "duermo";
  onLanguageChange?: () => void;
  children?: ReactNode;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const nextLocale = locale === "es" ? "en" : "es";
  const apps = [
    { product: "pasa", name: "AkiPasa", href: `https://akipasa.com/${locale}` },
    { product: "duermo", name: "AkiDuermo", href: `https://akiduermo.com/?lang=${locale}` },
    { product: "coches", name: "AkiCoches", href: `https://akicoches.com/?lang=${locale}` },
    { product: "hq", name: "AkiHQ", href: "https://akihq.app" },
    { product: "business", name: "AkiBusiness", href: "https://akibusiness.com" },
  ] as const;

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menu.current?.contains(event.target)
      ) {
        menu.current?.removeAttribute("open");
      }
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.removeAttribute("open");
        menu.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  return (
    <nav
      className="portal-header-tools"
      aria-label={
        locale === "es" ? "Controles de Aki Apps" : "Aki Apps controls"
      }
    >
      {onLanguageChange ? (
        <button
          type="button"
          className="language language--compact"
          onClick={onLanguageChange}
          aria-label={
            nextLocale === "en" ? "Switch to English" : "Cambiar a español"
          }
        >
          {nextLocale.toUpperCase()}
        </button>
      ) : (
        <LanguageLink locale={nextLocale} compact />
      )}
      <ThemeToggle locale={locale} />
      <details ref={menu} className="portal-product-menu">
        <summary aria-label="Aki Apps" title="Aki Apps">
          <Icon name="more" size={20} />
        </summary>
        <div className="portal-product-popover">
          {apps
            .filter((app) => app.product !== product)
            .map((app) => (
              <a key={app.product} href={app.href} aria-label={app.name}>
                <PortalLogo product={app.product} />
              </a>
            ))}
          {children && <div className="portal-product-actions">{children}</div>}
        </div>
      </details>
    </nav>
  );
}
