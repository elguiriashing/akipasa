"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
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
    { product: "pasa", name: "AkiPasa", href: `https://akipasa.com/${locale}`, accent: "#F26B1D" },
    { product: "duermo", name: "AkiDuermo", href: `https://akiduermo.com/?lang=${locale}`, accent: "#2FC2A5" },
    { product: "coches", name: "AkiCoches", href: `https://akicoches.com/?lang=${locale}`, accent: "#FF3047" },
    { product: "hq", name: "AkiHQ", href: "https://akihq.app", accent: "#FFC533" },
    { product: "business", name: "AkiBusiness", href: "https://akibusiness.com", accent: "#A778FF" },
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
          <span className="portal-apps-heading">{locale === "es" ? "Aplicaciones AkiSuite" : "AkiSuite apps"}</span>
          {apps.map((app) => {
            const active = app.product === product;
            return (
              <a
                key={app.product}
                href={app.href}
                aria-label={app.name}
                aria-current={active ? "page" : undefined}
                style={{ "--app-accent": app.accent } as CSSProperties}
              >
                <PortalLogo product={app.product} />
                {active && <span className="portal-current-app">{locale === "es" ? "Actual" : "Current"}</span>}
              </a>
            );
          })}
          {children && <div className="portal-product-actions">{children}</div>}
        </div>
      </details>
    </nav>
  );
}
