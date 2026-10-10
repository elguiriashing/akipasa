"use client";

import { StayHeader } from "./StayHeader";
import { StayNavigation } from "./StayNavigation";
import type { StayLocale } from "@/lib/akiduermo-i18n";
import styles from "./StayAppShell.module.css";

export function StayAppShell({
  locale,
  children,
  fullMap = false,
}: {
  locale: StayLocale;
  children: React.ReactNode;
  fullMap?: boolean;
}) {
  return (
    <div className={`${styles.shell} ${fullMap ? styles.fullMap : ""}`}>
      <StayHeader locale={locale} />
      <main className={styles.main}>{children}</main>
      <StayNavigation locale={locale} />
    </div>
  );
}
