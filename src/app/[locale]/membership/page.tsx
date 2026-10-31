import { personalPremiumLaunchOpen } from "@/lib/akisuite-premium-launch";
import { publicPageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AkiSuiteMembershipGrid } from "@/components/AkiSuiteMembershipGrid";
import { optionalUser } from "@/lib/auth";
import { akiSuiteApp } from "@/lib/akisuite-catalogue";
import { akiSuiteCheckoutReady } from "@/lib/akisuite-readiness";
import { isLocale } from "@/lib/config";
import "./membership-health.css";

export const generateMetadata = publicPageMetadata("/membership");

export default async function MembershipPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const es = locale === "es";
  const suiteCatalogueReady = akiSuiteCheckoutReady();
  const { user } = await optionalUser();
  const signedIn = Boolean(user);

  return (
    <main className="shell membership-page membership-app pasa-membership-page">
      <header className="membership-app-header pasa-conversion-hero pasa-membership-intro">
        <div className="pasa-membership-heading">
          <span className="pasa-conversion-kicker">
            AKIPASA / {es ? "MEMBRESÍAS" : "MEMBERSHIP"}
          </span>
          <h1>{es ? "Membresía" : "Membership"}</h1>
          <p>
            {es
              ? "Descubre sin suscripción, mejora la ficha de tu negocio o accede a herramientas empresariales independientes. Elige lo que necesitas."
              : "Explore without a subscription, upgrade a business listing or choose separate business tools. Pick what fits."}
          </p>
        </div>
        <Link
          className="pasa-conversion-link pasa-membership-manage"
          href={
            signedIn
              ? `/${locale}/account/subscription?from=${akiSuiteApp(query.from)}`
              : `/${locale}/auth?next=${encodeURIComponent(`/${locale}/account/subscription?from=${akiSuiteApp(query.from)}`)}`
          }
        >
          {es ? "Gestionar" : "Manage"}
        </Link>
      </header>
      <AkiSuiteMembershipGrid
        locale={locale}
        checkoutReady={suiteCatalogueReady}
        purchaseMode="account"
        originatingApp={akiSuiteApp(query.from)}
        personalPremiumUnlocked={personalPremiumLaunchOpen()}
      />
      <div className="membership-free-row">
        <span>
          {es ? "Tu local en AkiPasa: gratis" : "Your venue on AkiPasa: free"}
        </span>
        <Link href={`/${locale}/business?view=claims`}>
          {es ? "Reclamar →" : "Claim →"}
        </Link>
      </div>
      <p className="membership-billing-note">
        {es
          ? "Pago seguro con Stripe · Cancela desde facturación"
          : "Secure Stripe billing · Cancel from billing settings"}
      </p>
    </main>
  );
}
