import { notFound } from "next/navigation";
import "../stay-auth.css";
import Link from "next/link";
import { PortalLogo } from "@/components/PortalLogo";
import { BusinessHeader } from "@/components/BusinessHeader";
import { headers } from "next/headers";
import { LocaleDocumentLanguage } from "@/components/LocaleDocumentLanguage";
import { PortalHeaderTools } from "@/components/PortalHeaderTools";
import { AppShell } from "@/components/AppShell";
import { OwnerToolboxLauncher } from "@/components/owner/OwnerToolboxLauncher";
import { SupportAgentLauncher } from "@/components/support/SupportAgentLauncher";
import { optionalUser } from "@/lib/auth";
import { config, isLocale } from "@/lib/config";
import { signOut } from "@/app/[locale]/auth/actions";
import {
  defaultOwnerPreferences,
  type OwnerPreferences,
} from "@/lib/owner-console";

const ownerBackgroundBucket = "owner-backgrounds";

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
  const requestHeaders = await headers();
  const isBusinessHost =
    requestHeaders.get("x-akipasa-product") === "akibusiness";
  const isStayHost = requestHeaders.get("x-akipasa-product") === "akiduermo";
  if (isStayHost) {
    return (
      <>
        <LocaleDocumentLanguage locale={locale} />
        <div className="akiduermo-auth-host">
          <header className="akiduermo-auth-header">
            <Link
              href={`/?lang=${locale}`}
              className="akiduermo-auth-brand"
              aria-label="AkiDuermo"
            >
              <PortalLogo product="duermo" />
            </Link>
            <PortalHeaderTools locale={locale} product="duermo" />
          </header>
          {children}
        </div>
      </>
    );
  }
  const { supabase, user } = await optionalUser();
  const [profileResult, ownerResult] = user
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("app_role")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.rpc("has_owner_console"),
      ])
    : [{ data: null }, { data: false }];
  const ownerConsole = ownerResult.data === true;

  let ownerPreferences: OwnerPreferences = defaultOwnerPreferences;
  if (ownerConsole && user) {
    const { data } = await supabase
      .from("owner_console_preferences")
      .select("background,accent,motion,glass,background_image_path")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (data) {
      let backgroundImageUrl: string | null = null;
      if (data.background_image_path) {
        const signed = await supabase.storage
          .from(ownerBackgroundBucket)
          .createSignedUrl(data.background_image_path, 21600);
        backgroundImageUrl = signed.data?.signedUrl || null;
      }
      ownerPreferences = {
        background: data.background,
        accent: data.accent,
        motion: data.motion,
        glass: data.glass,
        backgroundImagePath: data.background_image_path,
        backgroundImageUrl,
      };
    }
  }

  if (isBusinessHost) {
    return (
      <>
        <LocaleDocumentLanguage locale={locale} />
        <div className="akibusiness-host">
          <BusinessHeader
            locale={locale}
            signedIn={Boolean(user)}
            signOut={signOut}
          />
          <div className="akibusiness-content">{children}</div>
          <SupportAgentLauncher
            locale={locale}
            surface="site_contact"
            label={locale === "es" ? "Soporte" : "Support"}
            className="global-support-trigger"
            signedIn={Boolean(user)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <LocaleDocumentLanguage locale={locale} />
      <AppShell
        locale={locale}
        signedIn={Boolean(user)}
        role={profileResult.data?.app_role || "consumer"}
        ownerConsole={ownerConsole}
      >
        {children}
        <footer className="shell footer">
          <span>
            {locale === "es" ? "Toda Espa\u00f1a" : "All Spain"} - ES / EN
          </span>
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
        {ownerConsole && (
          <OwnerToolboxLauncher
            locale={locale}
            preferences={ownerPreferences}
            userId={user!.id}
          />
        )}
        <SupportAgentLauncher
          locale={locale}
          surface="site_contact"
          label={locale === "es" ? "Soporte" : "Support"}
          className="global-support-trigger"
          signedIn={Boolean(user)}
        />
      </AppShell>
    </>
  );
}
