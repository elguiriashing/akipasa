"use client";

import Link from "next/link";
import React from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function LanguageLink({
  locale,
  compact = false,
}: {
  locale: "es" | "en";
  compact?: boolean;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const target = pathname.replace(/^\/(es|en)(?=\/|$)/, `/${locale}`);
  return (
    <Link
      className={["language", compact ? "language--compact" : ""]
        .filter(Boolean)
        .join(" ")}
      href={`${target}${search ? `?${search}` : ""}`}
      hrefLang={locale}
      aria-label={locale === "es" ? "Cambiar a español" : "Switch to English"}
    >
      {locale.toUpperCase()}
    </Link>
  );
}
