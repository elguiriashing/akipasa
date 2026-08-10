"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icons";
import { LanguageLink } from "./LanguageLink";
import { ThemeToggle } from "./ThemeModeControls";
import { ConsoleSwitcher, type ConsoleKey } from "./ConsoleSwitcher";
import { config, type Locale } from "../lib/config";
import { msg } from "../lib/messages";
import { roleCapabilities } from "../lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const SIDEBAR_KEY = "akipasa.sidebar.collapsed";

function isActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href.split("/").length > 2 && pathname.startsWith(`${href}/`))
  );
}

export function AppShell({
  locale,
  signedIn,
  role = "consumer",
  children,
}: {
  locale: Locale;
  signedIn: boolean;
  role?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const m = msg(locale);
  const es = locale === "es";
  const other = es ? "en" : "es";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const section = pathname.split("/").filter(Boolean)[1];
  const activeWorkspace = ["account", "business", "staff", "admin"].includes(
    section || "",
  )
    ? (section as ConsoleKey)
    : undefined;
  const capabilities = roleCapabilities(role);
  const hasMultipleWorkspaces =
    capabilities.manageOwnedVenues ||
    capabilities.moderatePlatform ||
    capabilities.administerPlatform;

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

  const workspaceNav: NavItem[] = [
    ...(capabilities.manageOwnedVenues
      ? [
          {
            href: `/${locale}/business`,
            label: es ? "Negocio" : "Business",
            icon: "business" as const,
          },
        ]
      : []),
    ...(capabilities.moderatePlatform
      ? [
          {
            href: `/${locale}/staff`,
            label: "Staff",
            icon: "shield" as const,
          },
        ]
      : []),
    ...(capabilities.administerPlatform
      ? [
          {
            href: `/${locale}/admin`,
            label: es ? "Administración" : "Administration",
            icon: "settings" as const,
          },
        ]
      : []),
  ];

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setCompact(window.localStorage.getItem(SIDEBAR_KEY) === "true");
    } catch {
      setCompact(false);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SIDEBAR_KEY) {
        setCompact(event.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function toggleSidebar() {
    setCompact((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {
        // The control still works when storage is unavailable.
      }
      return next;
    });
  }

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
          {signedIn && workspaceNav.length > 0 && (
            <>
              <div className="app-rail-divider" role="separator" />
              {!compact && (
                <span className="app-rail-section-label">
                  {es ? "Tus espacios" : "Your workspaces"}
                </span>
              )}
              {workspaceNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isActive(pathname, item.href) ? "active" : undefined
                  }
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  title={compact ? item.label : undefined}
                >
                  <Icon name={item.icon} />
                  {!compact && <span>{item.label}</span>}
                </Link>
              ))}
            </>
          )}
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
            <ThemeToggle locale={locale} />
            <LanguageLink locale={other} compact={compact} />
          </div>
          <button
            type="button"
            className="app-rail-collapse"
            onClick={toggleSidebar}
            aria-label={
              compact
                ? es
                  ? "Expandir barra lateral"
                  : "Expand sidebar"
                : es
                  ? "Contraer barra lateral"
                  : "Collapse sidebar"
            }
            title={
              compact
                ? es
                  ? "Expandir barra lateral"
                  : "Expand sidebar"
                : undefined
            }
          >
            <Icon name="chevron" />
            {!compact && (
              <span>{es ? "Contraer barra" : "Collapse sidebar"}</span>
            )}
          </button>
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
          aria-label={es ? "Más opciones" : "More options"}
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
            {signedIn && hasMultipleWorkspaces && (
              <section className="app-sheet-workspaces">
                <span className="app-sheet-section-label">
                  {es ? "Tus espacios" : "Your workspaces"}
                </span>
                <ConsoleSwitcher
                  locale={locale}
                  role={role}
                  active={activeWorkspace}
                  onNavigate={() => setSheetOpen(false)}
                />
              </section>
            )}
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
