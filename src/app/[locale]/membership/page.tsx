import { publicPageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AkiSuiteMembershipGrid } from "@/components/AkiSuiteMembershipGrid";
import { optionalUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export const generateMetadata = publicPageMetadata("/membership");

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const suiteCatalogueReady =
    process.env.AKISUITE_CHECKOUT_ENABLED === "true" &&
    process.env.AKISUITE_TAX_READY === "true" &&
    Boolean(process.env.AKISUITE_STRIPE_ACCOUNT_ID);
  const { user } = await optionalUser();
  const signedIn = Boolean(user);

  return (
    <main className="shell membership-page membership-app">
      <header className="membership-app-header">
        <h1>{es ? "Membresía" : "Membership"}</h1>
        <Link
          href={
            signedIn
              ? `/${locale}/account/subscription`
              : `/${locale}/auth?next=${encodeURIComponent(`/${locale}/account/subscription`)}`
          }
        >
          {es ? "Gestionar" : "Manage"}
        </Link>
      </header>
      <AkiSuiteMembershipGrid
        locale={locale}
        checkoutReady={suiteCatalogueReady}
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
