import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LanguageLink } from "@/components/LanguageLink";
import { LocaleDocumentLanguage } from "@/components/LocaleDocumentLanguage";
import { ThemeToggle } from "@/components/ThemeModeControls";
import { config, isLocale } from "@/lib/config";
import { msg } from "@/lib/messages";

export function generateStaticParams() {
  return config.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const m = msg(locale);
  const other = locale === "es" ? "en" : "es";
  return (
    <>
      <LocaleDocumentLanguage locale={locale} />
      <header className="shell topbar">
        <Link className="brand" href={`/${locale}`} aria-label="AkiPasa">
          {config.wordmark}
          <span className="brand-dot">.</span>
        </Link>
        <nav
          className="nav"
          aria-label={locale === "es" ? "Principal" : "Primary"}
        >
          <Link href={`/${locale}`}>{m.discover}</Link>
          <Link href={`/${locale}/map`}>{m.map}</Link>
          <Link href={`/${locale}/passports`}>{m.passports}</Link>
          <Link href={`/${locale}/community`}>
            {locale === "es" ? "Comunidad" : "Community"}
          </Link>
          <Link href={`/${locale}/account`}>{m.saved}</Link>
          <ThemeToggle locale={locale} />
          <Suspense
            fallback={<span className="language">{other.toUpperCase()}</span>}
          >
            <LanguageLink locale={other} />
          </Suspense>
        </nav>
      </header>
      {children}
      <footer className="shell footer">
        <span>
          {m.demo} · {locale === "es" ? "Toda España" : "All Spain"} · ES / EN
        </span>
        <nav aria-label={locale === "es" ? "Legal" : "Legal information"}>
          <Link href={`/${locale}/privacy`}>
            {locale === "es" ? "Privacidad" : "Privacy"}
          </Link>
          <Link href={`/${locale}/terms`}>
            {locale === "es" ? "Condiciones" : "Terms"}
          </Link>
          <a href="mailto:support@akipasa.com">
            {locale === "es" ? "Contacto" : "Contact"}
          </a>
        </nav>
      </footer>
    </>
  );
}
