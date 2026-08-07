import { notFound } from "next/navigation";
import Link from "next/link";
import { LocaleDocumentLanguage } from "@/components/LocaleDocumentLanguage";
import { AppShell } from "@/components/AppShell";
import { optionalUser } from "@/lib/auth";
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
  const { user } = await optionalUser();
  return (
    <>
      <LocaleDocumentLanguage locale={locale} />
      <AppShell locale={locale} signedIn={Boolean(user)}>
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
      </AppShell>
    </>
  );
}
