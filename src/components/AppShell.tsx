"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { GlobalSearch } from "./GlobalSearch";
import { Icon, type IconName } from "./Icons";
import { LanguageLink } from "./LanguageLink";
import { DiscoveryNavigation } from "./DiscoveryNavigation";
import { PasaBottomDock, pasaDestinations } from "./PasaBottomDock";
import "./PasaBottomDock.css";
import "./PasaCinematic.css";
import { ThemeToggle } from "./ThemeModeControls";
import { signOut } from "../app/[locale]/auth/actions";
import { ConsoleSwitcher, type ConsoleKey } from "./ConsoleSwitcher";
import { type Locale } from "../lib/config";
import { msg } from "../lib/messages";
import { roleCapabilities } from "../lib/roles";
import { useSuiteReferral } from "./useSuiteReferral";
import { suiteHref } from "../lib/suite-navigation";
import { discoveryViewHref } from "../lib/discovery-navigation";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

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
  mobile = false,
}: {
  item: NavItem;
  locale: Locale;
  pathname: string;
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
      aria-label={item.label}
      title={!mobile ? item.label : undefined}
    >
      <Icon name={item.icon} />
      <span>{item.label}</span>
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
  const referralCode = useSuiteReferral();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const m = msg(locale);
  const es = locale === "es";
  const other = es ? "en" : "es";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [suiteOpen, setSuiteOpen] = useState(false);
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

  const primaryNav: NavItem[] = pasaDestinations(locale);

  const suiteApps = [
    {
      name: "AkiPasa",
      href: `/${locale}`,
      icon: "/brand/v3/pasa.svg",
      accent: "#F26B1D",
    },
    {
      name: "AkiDuermo",
      href: suiteHref("duermo", locale, { referralCode }),
      icon: "/brand/v3/duermo.svg",
      accent: "#2FC2A5",
    },
    {
      name: "AkiCoches",
      href: suiteHref("coches", locale, { referralCode }),
      icon: "/brand/v3/coches.svg",
      accent: "#FF3047",
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
        href={`/hq-login?lang=${locale}`}
        onClick={() => setSheetOpen(false)}
      >
        {es ? "Acceso para negocios" : "Business sign in"}
      </Link>
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
            href: suiteHref("hq", locale),
            label: "AkiHQ",
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
    // Only a real route change dismisses menus; the initial effect must not undo an early tap.
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setSheetOpen(false);
    setSuiteOpen(false);
  }, [pathname]);

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
      <DiscoveryNavigation
        locale={locale}
        signedIn={signedIn}
        actions={suiteActions}
        workspaces={
          signedIn && workspaceNav.length > 0
            ? workspaceNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                >
                  <Icon name={item.icon} size={21} />
                  <span>{item.label}</span>
                </Link>
              ))
            : null
        }
        navigation={[...primaryNav, ...railExtras].map((item) => (
          <Suspense
            key={item.href}
            fallback={
              <Link href={item.href} aria-label={item.label}>
                <Icon name={item.icon} size={21} />
                <span>{item.label}</span>
              </Link>
            }
          >
            <PrimaryNavLink item={item} locale={locale} pathname={pathname} />
          </Suspense>
        ))}
      />

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
        <button
          type="button"
          ref={moreButtonRef}
          className="app-more-mobile-trigger"
          aria-label={es ? "Más opciones" : "More options"}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-controls="app-more-sheet"
          onClick={() => {
            setSuiteOpen(false);
            setSheetOpen(true);
          }}
        >
          <Icon name="more" />
        </button>
      </header>

      <div className="app-content">{children}</div>

      {/* One shared mobile dock across the complete consumer shell. */}
      <Suspense fallback={null}>
        <PasaBottomDock locale={locale} />
      </Suspense>

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
            <section className="app-sheet-suite">
              {suiteLinks}
              <Link
                href={`/hq-login?lang=${locale}`}
                onClick={() => setSuiteOpen(false)}
              >
                {es ? "Acceso para negocios" : "Business sign in"}
              </Link>
            </section>
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
            <div className="app-sheet-account">
              {!signedIn ? (
                <Link
                  href={`/${locale}/auth`}
                  onClick={() => setSheetOpen(false)}
                >
                  {es ? "Entrar" : "Sign in"}
                </Link>
              ) : (
                <>
                  <Link
                    href={`/${locale}/account/settings`}
                    onClick={() => setSheetOpen(false)}
                  >
                    {es ? "Ajustes" : "Settings"}
                  </Link>
                  <form action={signOut}>
                    <input type="hidden" name="locale" value={locale} />
                    <button type="submit">
                      {es ? "Cerrar sesión" : "Sign out"}
                    </button>
                  </form>
                </>
              )}
            </div>
            <div className="app-sheet-tools">
              <ThemeToggle locale={locale} />
              <LanguageLink locale={other} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
