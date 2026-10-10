"use client";
import Link from "next/link";
import { Icon } from "./Icons";
import { PortalLogo } from "./PortalLogo";
import { ThemeToggle } from "./ThemeModeControls";
import type { StayLocale } from "@/lib/akiduermo-i18n";
import styles from "./StayAppShell.module.css";

export function StayHeader({
  locale,
  onLanguageChange,
}: {
  locale: StayLocale;
  onLanguageChange?: () => void;
}) {
  const es = locale === "es";
  function changeLanguage() {
    if (onLanguageChange) return onLanguageChange();
    const next = es ? "en" : "es";
    document.cookie = `akiduermo_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const url = new URL(location.href);
    url.searchParams.set("lang", next);
    location.assign(url.toString());
  }
  return (
    <header className={styles.header}>
      <Link
        href={`/?lang=${locale}`}
        className={styles.brand}
        aria-label={es ? "Inicio de AkiDuermo" : "AkiDuermo home"}
      >
        <PortalLogo product="duermo" />
      </Link>
      <div className={styles.headerTools}>
        <ThemeToggle locale={locale} />
        <button
          type="button"
          onClick={changeLanguage}
          aria-label={es ? "Switch to English" : "Cambiar a español"}
        >
          {es ? "EN" : "ES"}
        </button>
        <Link
          href={`/settings?lang=${locale}`}
          aria-label={es ? "Ajustes" : "Settings"}
        >
          <Icon name="settings" size={20} />
        </Link>
      </div>
    </header>
  );
}
