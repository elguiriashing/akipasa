import { notFound } from "next/navigation";
import Link from "next/link";
import { LocaleDocumentLanguage } from "@/components/LocaleDocumentLanguage";
import { AppShell } from "@/components/AppShell";
import { SupportAgentLauncher } from "@/components/support/SupportAgentLauncher";
import { optionalUser } from "@/lib/auth";
import { config, isLocale } from "@/lib/config";
import { PersonalisationConsent } from "@/components/PersonalisationConsent";

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
  const { supabase, user } = await optionalUser();
  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("app_role")
          .eq("id", user.id)
          .maybeSingle()
      ).data
    : null;
  return (
    <>
      <LocaleDocumentLanguage locale={locale} />
      <PersonalisationConsent locale={locale} />
      <AppShell
        locale={locale}
        signedIn={Boolean(user)}
        role={profile?.app_role || "consumer"}
      >
        {children}
        <footer className="shell footer">
          <span>{locale === "es" ? "Toda España" : "All Spain"} · ES / EN</span>
          <nav aria-label={locale === "es" ? "Legal" : "Legal information"}>
            <Link href={`/${locale}/privacy`}>
              {locale === "es" ? "Privacidad" : "Privacy"}
            </Link>
            <Link href={`/${locale}/terms`}>
              {locale === "es" ? "Condiciones" : "Terms"}
            </Link>
            <SupportAgentLauncher
              locale={locale}
              surface="site_contact"
              label={locale === "es" ? "Contacto" : "Contact"}
              className="footer-support-trigger"
              signedIn={Boolean(user)}
            />
          </nav>
        </footer>
      </AppShell>
    </>
  );
}
