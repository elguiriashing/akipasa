"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { GlobalSearch } from "./GlobalSearch";
import { Icon, type IconName } from "./Icons";
import { LanguageLink } from "./LanguageLink";
import { ThemeToggle } from "./ThemeModeControls";
import { signOut } from "../app/[locale]/auth/actions";
import { ConsoleSwitcher, type ConsoleKey } from "./ConsoleSwitcher";
import { config, type Locale } from "../lib/config";
import { msg } from "../lib/messages";
import { roleCapabilities } from "../lib/roles";
import { discoveryViewHref } from "../lib/discovery-navigation";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const SIDEBAR_KEY = "akipasa.sidebar.collapsed";

function isActive(pathname: string, href: string) {
  const target = href.split("?")[0];
  return (
    pathname === target ||
    (target.split("/").length > 2 && pathname.startsWith(`${target}/`))
  );
}

function PrimaryNavLink({
  item,
  locale,
  pathname,
  compact,
  mobile = false,
}: {
  item: NavItem;
  locale: Locale;
  pathname: string;
  compact: boolean;
  mobile?: boolean;
}) {
  const query = useSearchParams();
  const onDiscovery =
    pathname === `/${locale}` || pathname === `/${locale}/map`;
  const href =
    onDiscovery && item.href === `/${locale}`
      ? discoveryViewHref(locale, "discover", query)
      : onDiscovery && item.href === `/${locale}/map`
        ? discoveryViewHref(locale, "map", query)
        : item.href;
  return (
    <Link
      href={href}
      className={isActive(pathname, item.href) ? "active" : undefined}
      aria-current={isActive(pathname, item.href) ? "page" : undefined}
      title={!mobile && compact ? item.label : undefined}
    >
      <Icon name={item.icon} />
      {(mobile || !compact) && <span>{item.label}</span>}
    </Link>
  );
}

export function AppShell({
  locale,
  signedIn,
  role = "consumer",
  ownerConsole = false,
  children,
}: {
  locale: Locale;
  signedIn: boolean;
  role?: string;
  ownerConsole?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const m = msg(locale);
  const es = locale === "es";
  const other = es ? "en" : "es";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [suiteOpen, setSuiteOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const suiteButtonRef = useRef<HTMLButtonElement>(null);
  const suiteCloseRef = useRef<HTMLButtonElement>(null);
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
    capabilities.administerPlatform ||
    ownerConsole;

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

  const suiteApps = [
    {
      name: "AkiPasa",
      href: `/${locale}`,
      icon: "/pwa/akipasa-512.png",
      accent: "#F26B1D",
    },
    {
      name: "AkiDuermo",
      href: `https://akiduermo.com/?lang=${locale}`,
      icon: "/brand/duermo-icon.png",
      accent: "#2FC2A5",
    },
    {
      name: "AkiCoches",
      href: `https://akicoches.com/?lang=${locale}`,
      icon: "/brand/conduzco-icon.svg",
      accent: "#FF3047",
    },
    {
      name: "AkiHQ",
      href: "https://akihq.app",
      icon: "/brand/hq-mark.svg",
      accent: "#FFC533",
    },
    {
      name: "AkiBusiness",
      href: "https://akibusiness.com",
      icon: "/brand/business-mark.svg",
      accent: "#8958FF",
    },
  ] as const;
  const suiteLinks = (
    <nav
      className="app-suite-links"
      aria-label={es ? "Aplicaciones AkiSuite" : "AkiSuite apps"}
    >
      <span className="app-suite-heading">
        {es ? "Aplicaciones AkiSuite" : "AkiSuite apps"}
      </span>
      {suiteApps.map((app) => (
        <Link
          key={app.name}
          href={app.href}
          aria-current={app.name === "AkiPasa" ? "page" : undefined}
          style={{ "--suite-accent": app.accent } as React.CSSProperties}
          onClick={() => {
            setSheetOpen(false);
            setSuiteOpen(false);
          }}
        >
          <Image src={app.icon} width={36} height={36} alt="" unoptimized />
          <span>{app.name}</span>
          {app.name === "AkiPasa" && <small>{es ? "Actual" : "Current"}</small>}
        </Link>
      ))}
    </nav>
  );
  const suiteActions = (
    <div className="app-suite-actions">
      <Link
        href={`/${locale}/account/settings`}
        onClick={() => setSheetOpen(false)}
      >
        {es ? "Ajustes" : "Settings"}
      </Link>
      {signedIn ? (
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit">{es ? "Cerrar sesión" : "Sign out"}</button>
        </form>
      ) : (
        <Link href={`/${locale}/auth`} onClick={() => setSheetOpen(false)}>
          {es ? "Iniciar sesión" : "Sign in"}
        </Link>
      )}
    </div>
  );

  const railExtras: NavItem[] = [
    { href: `/${locale}/passports`, label: m.passports, icon: "passport" },
    {
      href: `/${locale}/membership`,
      label: es ? "Membresía" : "Membership",
      icon: "membership",
    },
  ];

  const workspaceNav: NavItem[] = [
    ...(ownerConsole
      ? [
          {
            href: `/${locale}/owner`,
            label: es ? "Propietario" : "Owner console",
            icon: "settings" as const,
          },
        ]
      : []),
    ...(capabilities.manageOwnedVenues
      ? [
          {
            href: `${config.businessUrl}/${locale}/business`,
            label: "AkiBusiness",
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
    setSuiteOpen(false);
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
    if (!sheetOpen && !suiteOpen) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = suiteOpen
      ? suiteButtonRef.current
      : moreButtonRef.current;
    const sheet = document.querySelector<HTMLElement>(
      suiteOpen ? ".app-suite-sheet" : ".app-sheet",
    );
    const shell = sheet?.closest<HTMLElement>(".app-shell");
    const background = shell
      ? Array.from(shell.children).filter(
          (element): element is HTMLElement =>
            element instanceof HTMLElement &&
            !element.classList.contains("app-sheet-layer"),
        )
      : [];
    const priorInert = background.map((element) => ({
      element,
      inert: element.hasAttribute("inert"),
    }));
    for (const element of background) element.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    (suiteOpen ? suiteCloseRef.current : sheetCloseRef.current)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSheetOpen(false);
        setSuiteOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sheet) return;
      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !sheet.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      for (const { element, inert } of priorInert) {
        if (!inert) element.removeAttribute("inert");
      }
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [sheetOpen, suiteOpen]);

  return (
    <div
      className={
        section === "passports" ? "app-shell app-shell--passport" : "app-shell"
      }
    >
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
          <BrandLogo compact={compact} />
        </Link>

        <nav className="app-rail-nav">
          {primaryNav.map((item) => (
            <Suspense
              key={item.href}
              fallback={
                <Link href={item.href}>
                  <Icon name={item.icon} />
                  {!compact && <span>{item.label}</span>}
                </Link>
              }
            >
              <PrimaryNavLink
                item={item}
                locale={locale}
                pathname={pathname}
                compact={compact}
              />
            </Suspense>
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
          <details className="app-suite-menu">
            <summary
              className="app-suite-trigger"
              aria-label={
                es ? "Cambiar aplicación AkiSuite" : "Switch AkiSuite app"
              }
            >
              <Icon name="more" />
              <span>AkiSuite</span>
            </summary>
            <div className="app-suite-popover">
              {suiteLinks}
              {suiteActions}
            </div>
          </details>
          {!signedIn && (
            <Link
              className="button button-strong app-rail-cta"
              href={`/${locale}/auth`}
              title={compact ? (es ? "Entrar" : "Sign in") : undefined}
            >
              {compact ? <Icon name="account" /> : es ? "Entrar" : "Sign in"}
            </Link>
          )}
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

      <Suspense fallback={null}>
        <GlobalSearch locale={locale} />
      </Suspense>
      {/* Mobile top strip */}
      <header className="app-topbar-mobile">
        <Link
          href={`/${locale}`}
          className="app-rail-brand"
          aria-label="AkiPasa"
        >
          <BrandLogo />
        </Link>
        <button
          type="button"
          ref={suiteButtonRef}
          className="app-suite-mobile-trigger"
          aria-label={
            es ? "Cambiar aplicación AkiSuite" : "Switch AkiSuite app"
          }
          aria-haspopup="dialog"
          aria-expanded={suiteOpen}
          aria-controls="app-suite-sheet"
          onClick={() => {
            setSheetOpen(false);
            setSuiteOpen(true);
          }}
        >
          <Icon name="more" />
          <span>AkiSuite</span>
        </button>
      </header>

      <div className="app-content">{children}</div>

      {/* Mobile bottom tab bar */}
      <nav
        className="app-bottom-nav"
        aria-label={es ? "Navegación" : "Navigation"}
      >
        {primaryNav.map((item) => (
          <Suspense
            key={item.href}
            fallback={
              <Link href={item.href}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            }
          >
            <PrimaryNavLink
              item={item}
              locale={locale}
              pathname={pathname}
              compact={compact}
              mobile
            />
          </Suspense>
        ))}
        <button
          ref={moreButtonRef}
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

      {suiteOpen && (
        <div className="app-sheet-layer app-suite-layer">
          <button
            className="app-sheet-backdrop"
            aria-label={es ? "Cerrar" : "Close"}
            onClick={() => setSuiteOpen(false)}
          />
          <div
            id="app-suite-sheet"
            className="app-sheet app-suite-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={es ? "Aplicaciones AkiSuite" : "AkiSuite apps"}
          >
            <div className="app-sheet-handle" aria-hidden="true" />
            <div className="app-sheet-heading">
              <span>AkiSuite</span>
              <strong>
                {es ? "Cambiar aplicación" : "Switch application"}
              </strong>
            </div>
            <button
              ref={suiteCloseRef}
              type="button"
              className="app-sheet-close"
              onClick={() => setSuiteOpen(false)}
              aria-label={es ? "Cerrar" : "Close"}
            >
              <Icon name="close" />
            </button>
            <section className="app-sheet-suite">{suiteLinks}</section>
          </div>
        </div>
      )}

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
              {signedIn && (
                <Link
                  href={`/${locale}/account/settings`}
                  onClick={() => setSheetOpen(false)}
                >
                  {es ? "Ajustes" : "Settings"}
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
