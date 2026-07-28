"use client";

import Link from "next/link";
import { useRef } from "react";
import { LanguageLink } from "@/components/LanguageLink";
import { ThemeToggle } from "@/components/ThemeModeControls";
import { config, type Locale } from "@/lib/config";
import { msg } from "@/lib/messages";

export function SiteHeader({
  locale,
  signedIn,
}: {
  locale: Locale;
  signedIn: boolean;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const m = msg(locale);
  const es = locale === "es";
  const other = es ? "en" : "es";
  const closeMenu = () => menuRef.current?.removeAttribute("open");

  const primaryLinks = (
    <>
      <Link href={`/${locale}`} onClick={closeMenu}>
        {m.discover}
      </Link>
      <Link href={`/${locale}/map`} onClick={closeMenu}>
        {m.map}
      </Link>
      <Link href={`/${locale}/passports`} onClick={closeMenu}>
        {m.passports}
      </Link>
      <Link href={`/${locale}/community`} onClick={closeMenu}>
        {es ? "Comunidad" : "Community"}
      </Link>
      <Link
        className="membership-link"
        href={`/${locale}/membership`}
        onClick={closeMenu}
      >
        {es ? "Membresía" : "Membership"}
      </Link>
      <Link href={`/${locale}/account`} onClick={closeMenu}>
        {m.saved}
      </Link>
    </>
  );

  return (
    <header className="shell topbar">
      <Link className="brand" href={`/${locale}`} aria-label="AkiPasa">
        {config.wordmark}
        <span className="brand-dot">.</span>
      </Link>

      <nav
        className="nav nav-desktop"
        aria-label={es ? "Principal" : "Primary"}
      >
        {primaryLinks}
        {!signedIn && (
          <Link className="nav-sign-in" href={`/${locale}/auth`}>
            {es ? "Entrar" : "Sign in"}
          </Link>
        )}
        <ThemeToggle locale={locale} />
        <LanguageLink locale={other} />
      </nav>

      <details className="site-menu" ref={menuRef}>
        <summary aria-label={es ? "Abrir menú" : "Open menu"}>
          <span className="site-menu-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{es ? "Menú" : "Menu"}</span>
        </summary>
        <div className="site-menu-panel">
          <nav aria-label={es ? "Menú móvil" : "Mobile menu"}>
            {primaryLinks}
          </nav>
          <div className="site-menu-tools">
            {!signedIn && (
              <Link
                className="button button-strong"
                href={`/${locale}/auth`}
                onClick={closeMenu}
              >
                {es ? "Entrar" : "Sign in"}
              </Link>
            )}
            <ThemeToggle locale={locale} />
            <LanguageLink locale={other} />
          </div>
        </div>
      </details>
    </header>
  );
}
