"use client";
import Link from "next/link";
import { PortalLogo } from "./PortalLogo";
import { PortalHeaderTools } from "./PortalHeaderTools";
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
      <PortalHeaderTools
        locale={locale}
        product="duermo"
        onLanguageChange={changeLanguage}
      >
        <Link
          href={`/settings?lang=${locale}`}
          aria-label={es ? "Ajustes" : "Settings"}
        >
          {es ? "Ajustes" : "Settings"}
        </Link>
      </PortalHeaderTools>
    </header>
  );
}
