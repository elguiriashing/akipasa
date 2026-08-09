"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icons";
import { LanguageLink } from "./LanguageLink";
import { ThemeToggle } from "./ThemeModeControls";
import { config, type Locale } from "../lib/config";
import { msg } from "../lib/messages";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

function isActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href.split("/").length > 2 && pathname.startsWith(`${href}/`))
  );
}

const consoleSegments = [
  "account",
  "admin",
  "staff",
  "business",
  "moderation",
  "passports",
  "community",
];

function isConsoleRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] is the locale, segments[1] is the section
  return consoleSegments.includes(segments[1] || "");
}

export function AppShell({
  locale,
  signedIn,
  children,
}: {
  locale: Locale;
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const m = msg(locale);
  const es = locale === "es";
  const other = es ? "en" : "es";
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);

  const primaryNav: NavItem[] = [
    { href: `/${locale}`, label: m.discover, icon: "discover" },
    { href: `/${locale}/map`, label: m.map, icon: "map" },
    {
      href: `/${locale}/community`,
      label: es ? "Comunidad" : "Community",
      icon: "community",
    },
    { href: `/${locale}/account`, label: m.saved, icon: "account" },
  ];

  const railExtras: NavItem[] = [
    { href: `/${locale}/passports`, label: m.passports, icon: "passport" },
    {
      href: `/${locale}/membership`,
      label: es ? "Membresía" : "Membership",
      icon: "membership",
    },
  ];

  const compact = isConsoleRoute(pathname);

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetCloseRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [sheetOpen]);

  return (
    <div className="app-shell">
      {/* Desktop rail */}
      <aside
        className={["app-rail", compact ? "app-rail--compact" : ""]
          .filter(Boolean)
          .join(" ")}
        aria-label={es ? "Navegación principal" : "Primary navigation"}
      >
        <Link
          href={`/${locale}`}
          className="app-rail-brand"
          aria-label="AkiPasa"
        >
          <span className="app-rail-mark">A</span>
          {!compact && (
            <span>
              {config.productName}
              <i className="app-rail-brand-dot">.</i>
            </span>
          )}
        </Link>

        <nav className="app-rail-nav">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "active" : undefined}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              title={compact ? item.label : undefined}
            >
              <Icon name={item.icon} />
              {!compact && <span>{item.label}</span>}
            </Link>
          ))}
          <div className="app-rail-divider" role="separator" />
          {railExtras.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "active" : undefined}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              title={compact ? item.label : undefined}
            >
              <Icon name={item.icon} />
              {!compact && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="app-rail-bottom">
          {!signedIn && (
            <Link
              className="button button-strong app-rail-cta"
              href={`/${locale}/auth`}
              title={compact ? (es ? "Entrar" : "Sign in") : undefined}
            >
              {compact ? <Icon name="account" /> : es ? "Entrar" : "Sign in"}
            </Link>
          )}
          <a
            className="app-rail-crm"
            href={config.crmUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={compact ? "CRM" : undefined}
            aria-label={compact ? "CRM" : undefined}
          >
            <Icon name="business" />
            {!compact && <span>CRM</span>}
          </a>
          <div className="app-rail-tools">
            <ThemeToggle locale={locale} compact={compact} />
            <LanguageLink locale={other} compact={compact} />
          </div>
        </div>
      </aside>

      {/* Mobile top strip */}
      <header className="app-topbar-mobile">
        <Link
          href={`/${locale}`}
          className="app-rail-brand"
          aria-label="AkiPasa"
        >
          {config.productName}
          <i className="app-rail-brand-dot">.</i>
        </Link>
        <button
          type="button"
          className="app-icon-button"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-controls="app-more-sheet"
          onClick={() => setSheetOpen(true)}
          aria-label={es ? "Más opciones" : "More options"}
        >
          <Icon name="more" />
        </button>
      </header>

      <div className="app-content">{children}</div>

      {/* Mobile bottom tab bar */}
      <nav
        className="app-bottom-nav"
        aria-label={es ? "Navegación" : "Navigation"}
      >
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.href) ? "active" : undefined}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={sheetOpen ? "active" : undefined}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-controls="app-more-sheet"
        >
          <Icon name="more" />
          <span>{es ? "Más" : "More"}</span>
        </button>
      </nav>

      {sheetOpen && (
        <div className="app-sheet-layer">
          <button
            className="app-sheet-backdrop"
            aria-label={es ? "Cerrar" : "Close"}
            onClick={() => setSheetOpen(false)}
          />
          <div
            id="app-more-sheet"
            className="app-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={es ? "Más opciones" : "More options"}
          >
            <div className="app-sheet-handle" aria-hidden="true" />
            <div className="app-sheet-heading">
              <span>{es ? "Navegaci\u00f3n" : "Navigation"}</span>
              <strong>
                {es ? "M\u00e1s de AkiPasa" : "More from AkiPasa"}
              </strong>
            </div>
            <button
              ref={sheetCloseRef}
              type="button"
              className="app-sheet-close"
              onClick={() => setSheetOpen(false)}
              aria-label={es ? "Cerrar" : "Close"}
            >
              <Icon name="close" />
            </button>
            <nav className="app-sheet-nav">
              {railExtras.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive(pathname, item.href) ? "active" : undefined
                  }
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  onClick={() => setSheetOpen(false)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              ))}
              <a href={config.crmUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="business" />
                <span>CRM</span>
              </a>
            </nav>
            <div className="app-sheet-tools">
              {!signedIn && (
                <Link
                  className="button button-strong"
                  href={`/${locale}/auth`}
                  onClick={() => setSheetOpen(false)}
                >
                  {es ? "Entrar" : "Sign in"}
                </Link>
              )}
              <ThemeToggle locale={locale} />
              <LanguageLink locale={other} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
