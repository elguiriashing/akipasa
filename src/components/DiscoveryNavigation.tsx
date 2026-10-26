"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageLink } from "./LanguageLink";
import "./PasaDiscoveryNavigation.css";
import { Icon } from "./Icons";
import { ThemeToggle } from "./ThemeModeControls";
import { useSuiteReferral } from "./useSuiteReferral";
import { suiteHref } from "../lib/suite-navigation";
import "./DiscoveryNavigation.css";

/** Desktop adapter of Duermo/Coches DiscoveryNavigation v2 (2026-10-26).
 * Keep frame geometry in the copied DiscoveryNavigation.css; Pasa supplies its existing routes and account actions. */
export function DiscoveryNavigation({
  locale,
  navigation,
  actions,
  signedIn,
  workspaces,
}: {
  locale: "en" | "es";
  navigation: ReactNode;
  actions: ReactNode;
  signedIn: boolean;
  workspaces?: ReactNode;
}) {
  const path = usePathname() || "/";
  const es = locale === "es";
  const product = "pasa";
  const name = "AkiPasa";
  const suffix = "Pasa";
  const storageKey = "akipasa.sidebar.collapsed";
  const [compact, setCompact] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  const previousPath = useRef(path);
  const referralCode = useSuiteReferral();
  useEffect(() => {
    try {
      setCompact(localStorage.getItem(storageKey) === "true");
    } catch {}
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey) setCompact(event.newValue === "true");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);
  useEffect(() => {
    if (previousPath.current === path) return;
    previousPath.current = path;
    menu.current?.removeAttribute("open");
  }, [path]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target))
        menu.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  function toggle() {
    const next = !compact;
    setCompact(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {}
    window.dispatchEvent(new Event("akipasa:map-resize"));
  }
  const apps = [
    ["pasa", "AkiPasa"],
    ["duermo", "AkiDuermo"],
    ["coches", "AkiCoches"],
    ["hq", "AkiHQ"],
    ["business", "AkiBusiness"],
  ] as const;
  return (
    <aside
      className="suite-discovery-nav"
      data-product={product}
      data-compact={compact}
      aria-label={es ? "Navegación principal" : "Primary navigation"}
    >
      <Link
        className="suite-discovery-brand"
        href={`/${locale}`}
        aria-label={es ? `Inicio de ${name}` : `${name} home`}
      >
        <Image
          src={`/brand/v3/${product}.svg`}
          width={40}
          height={40}
          alt=""
          unoptimized
        />
        <strong aria-hidden="true">
          Aki<span>{suffix}.</span>
        </strong>
      </Link>
      <nav
        className="suite-discovery-links"
        aria-label={es ? `Navegación de ${name}` : `${name} navigation`}
      >
        {navigation}
      </nav>
      <div className="suite-discovery-footer">
        <details
          ref={menu}
          className="suite-discovery-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary
            aria-label={
              es ? "Cambiar aplicación AkiSuite" : "Switch AkiSuite app"
            }
          >
            <Icon name="more" size={20} />
            <span>AkiSuite</span>
          </summary>
          <div className="suite-discovery-popover">
            <nav aria-label={es ? "Aplicaciones AkiSuite" : "AkiSuite apps"}>
              {apps.map(([id, label]) => (
                <a
                  key={id}
                  href={
                    id === product
                      ? `/${locale}`
                      : suiteHref(id, locale, { referralCode })
                  }
                  aria-current={id === product ? "page" : undefined}
                  onClick={() => menu.current?.removeAttribute("open")}
                >
                  <Image
                    src={`/brand/v3/${id}.svg`}
                    width={36}
                    height={36}
                    alt=""
                    unoptimized
                  />
                  <span>{label}</span>
                </a>
              ))}
            </nav>
            <div className="suite-discovery-actions">
              {workspaces && (
                <section aria-label={es ? "Tus espacios" : "Your workspaces"}>
                  <strong>{es ? "Tus espacios" : "Your workspaces"}</strong>
                  {workspaces}
                </section>
              )}
              {actions}
            </div>
            {referralCode && (
              <a
                href={suiteHref("pasa", locale, {
                  path: "/referrals",
                  referralCode,
                })}
              >
                {es
                  ? "Aplicar invitación de referido"
                  : "Apply referral invitation"}
              </a>
            )}
          </div>
        </details>
        <Link
          className="suite-discovery-signin"
          href={
            signedIn
              ? `/${locale}/account`
              : `/${locale}/auth${referralCode ? `?ref=${referralCode}` : ""}`
          }
          aria-label={
            signedIn ? (es ? "Cuenta" : "Account") : es ? "Entrar" : "Sign in"
          }
          title={
            compact
              ? signedIn
                ? es
                  ? "Cuenta"
                  : "Account"
                : es
                  ? "Entrar"
                  : "Sign in"
              : undefined
          }
        >
          <Icon name="account" size={21} />
          <span>
            {signedIn ? (es ? "Cuenta" : "Account") : es ? "Entrar" : "Sign in"}
          </span>
        </Link>
        <div className="suite-discovery-tools">
          <ThemeToggle locale={locale} />
          <LanguageLink locale={es ? "en" : "es"} compact />
        </div>
        <button
          className="suite-discovery-collapse"
          type="button"
          onClick={toggle}
          aria-expanded={!compact}
          aria-label={
            compact
              ? es
                ? "Expandir barra lateral"
                : "Expand sidebar"
              : es
                ? "Contraer barra lateral"
                : "Collapse sidebar"
          }
        >
          <Icon name="chevron" size={20} />
          <span>{es ? "Contraer barra" : "Collapse sidebar"}</span>
        </button>
      </div>
    </aside>
  );
}
