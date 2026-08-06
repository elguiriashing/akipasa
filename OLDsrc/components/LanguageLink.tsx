"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function LanguageLink({ locale }: { locale: "es" | "en" }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const target = pathname.replace(/^\/(es|en)(?=\/|$)/, `/${locale}`);
  return (
    <Link
      className="language"
      href={`${target}${search ? `?${search}` : ""}`}
      hrefLang={locale}
      aria-label={locale === "es" ? "Cambiar a español" : "Switch to English"}
    >
      {locale.toUpperCase()}
    </Link>
  );
}
