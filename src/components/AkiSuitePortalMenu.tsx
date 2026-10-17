"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { Icon } from "./Icons";
import type { Locale } from "../lib/config";
import styles from "./AkiSuitePortalMenu.module.css";

export function AkiSuitePortalMenu({
  locale,
  compact = false,
  expanded = false,
}: {
  locale: Locale;
  compact?: boolean;
  expanded?: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const es = locale === "es";
  const apps = [
    { id: "pasa", name: "AkiPasa", href: `/${locale}`, icon: "/pwa/akipasa-512.png", accent: "#F26B1D" },
    { id: "duermo", name: "AkiDuermo", href: `https://akiduermo.com/?lang=${locale}`, icon: "/brand/duermo-icon.png", accent: "#2FC2A5" },
    { id: "coches", name: "AkiCoches", href: `https://akicoches.com/?lang=${locale}`, icon: "/brand/conduzco-icon.svg", accent: "#FF3047" },
    { id: "hq", name: "AkiHQ", href: "https://akihq.app", icon: "/brand/hq-mark.svg", accent: "#FFC533" },
    { id: "business", name: "AkiBusiness", href: "https://akibusiness.com", icon: "/brand/business-mark.svg", accent: "#A778FF" },
  ] as const;

  useEffect(() => {
    if (expanded) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) {
        menu.current?.removeAttribute("open");
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.removeAttribute("open");
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [expanded]);

  const choices = (
    <>
      {apps.map((app) => (
        <a
          key={app.id}
          href={app.href}
          className={styles.appLink}
          aria-current={app.id === "pasa" ? "page" : undefined}
          style={{ "--suite-accent": app.accent } as CSSProperties}
        >
          <Image src={app.icon} alt="" width={36} height={36} unoptimized />
          <span>{app.name}</span>
          {app.id === "pasa" && <small>{es ? "Actual" : "Current"}</small>}
        </a>
      ))}
    </>
  );

  if (expanded) {
    return (
      <nav className={styles.expanded} aria-label={es ? "Aplicaciones AkiSuite" : "AkiSuite applications"}>
        <span className={styles.heading}>{es ? "Cambiar de aplicación" : "Switch app"}</span>
        <div className={styles.mobileChoices}>{choices}</div>
      </nav>
    );
  }

  return (
    <details ref={menu} className={styles.menu}>
      <summary aria-label={es ? "Cambiar aplicación AkiSuite" : "Switch AkiSuite app"} title="AkiSuite">
        <Icon name="more" />
        {!compact && <span>AkiSuite</span>}
      </summary>
      <nav className={styles.popover} aria-label={es ? "Aplicaciones AkiSuite" : "AkiSuite applications"}>
        <span className={styles.heading}>{es ? "Aplicaciones AkiSuite" : "AkiSuite apps"}</span>
        {choices}
      </nav>
    </details>
  );
}
