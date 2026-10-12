import { SubscriptionRefresh } from "@/components/SubscriptionRefresh";
import { PremiumAdsConversion } from "@/components/PremiumAdsConversion";
import { notFound } from "next/navigation";
import { AkiSuiteMembershipGrid } from "@/components/AkiSuiteMembershipGrid";
import { AkiSuiteMembershipHub } from "@/components/AkiSuiteMembershipHub";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { openBillingPortal } from "./actions";
import { AccountPageHeader } from "../AccountPageHeader";
import { AccountCollectionRefresh } from "../AccountCollectionRefresh";

export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/account/subscription`,
  );
  const [
    { data: subscriptions, error: subscriptionsError },
    { data: grants, error: grantsError },
    { data: customer, error: customerError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("billing_subscriptions")
      .select(
        "plan_code,billing_interval,status,current_period_end,cancel_at_period_end",
      )
      .eq("profile_id", user.id),
    supabase
      .from("staff_billing_grants")
      .select("plan_code,grant_kind,expires_at")
      .eq("profile_id", user.id)
      .eq("active", true),
    supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("membership_tier,business_plan_active,business_tier")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const suiteRows =
    process.env.AKISUITE_SUBSCRIPTIONS_READY === "true"
      ? await supabase
          .from("akisuite_billing_subscriptions")
          .select(
            "plan_code,billing_interval,status,current_period_end,cancel_at_period_end",
          )
          .eq("profile_id", user.id)
      : { data: [], error: null };
  const es = locale === "es";
  const suiteCatalogueReady =
    process.env.AKISUITE_CHECKOUT_ENABLED === "true" &&
    process.env.AKISUITE_TAX_READY === "true" &&
    Boolean(process.env.AKISUITE_STRIPE_ACCOUNT_ID);
  const accessUnavailable = Boolean(
    subscriptionsError || grantsError || customerError || profileError,
  );
  const errorMessage =
    query.error === "active"
      ? es
        ? "Este plan ya está activo en tu cuenta."
        : "This plan is already active on your account."
      : query.error === "business_required"
        ? es
          ? "Necesitas un plan Business activo para abrir esas herramientas."
          : "You need an active Business plan to open those tools."
        : query.error === "business_pro_required"
          ? es
            ? "Necesitas Business Pro para acceder a AkiHQ CRM."
            : "You need Business Pro to access AkiHQ CRM."
          : es
            ? "No se pudo iniciar la operación de facturación."
            : "The billing operation could not be started.";

  return (
    <section className="subscription-app account-controls-page">
      <AccountPageHeader
        eyebrow={es ? "Membresía" : "Membership"}
        title={es ? "Planes y facturación" : "Plans and billing"}
        description={
          es
            ? "Revisa tu acceso y elige el plan que va contigo."
            : "Review your access and choose the plan that suits you."
        }
      />
      <AkiSuiteMembershipHub
        locale={locale}
        legacy={subscriptions || []}
        suite={suiteRows.data || []}
        grants={grants || []}
        hasStripeCustomer={Boolean(customer?.stripe_customer_id)}
        unavailable={Boolean(
          subscriptionsError ||
            grantsError ||
            customerError ||
            profileError ||
            suiteRows.error,
        )}
        now={Date.now()}
      />
      {query.checkout === "success" && query.session_id && (
        <PremiumAdsConversion sessionId={query.session_id} />
      )}
      {query.checkout === "success" &&
        !subscriptions?.some(
          (item) => item.status === "active" || item.status === "trialing",
        ) && <SubscriptionRefresh locale={locale} />}
      {query.checkout === "success" && (
        <p className="notice" role="status">
          {es
            ? "Pago completado. La membresía se actualiza automáticamente al recibir la confirmación de Stripe."
            : "Checkout completed. Membership updates automatically when confirmation arrives from Stripe."}
        </p>
      )}
      {query.upgrade === "pending" && (
        <p className="notice" role="status">
          {es
            ? "La mejora a Business Pro está en curso. El acceso a AkiHQ aparecerá en cuanto Stripe confirme el pago."
            : "Your Business Pro upgrade is processing. AkiHQ access will appear as soon as Stripe confirms payment."}
        </p>
      )}
      {query.error && (
        <p className="notice" role="alert">
          {errorMessage}
        </p>
      )}
      {accessUnavailable && (
        <section className="account-control-card">
          <h2>{es ? "Membresía no disponible" : "Membership unavailable"}</h2>
          <p className="notice" role="alert">
            {es
              ? "No se han podido cargar tus planes y datos de facturación. Reintenta antes de realizar cambios."
              : "Your plans and billing details could not be loaded. Try again before making changes."}
          </p>
          <AccountCollectionRefresh locale={locale} />
          {!customerError && customer?.stripe_customer_id && (
            <form action={openBillingPortal}>
              <input type="hidden" name="locale" value={locale} />
              <button className="button secondary" type="submit">
                {es ? "Gestionar pago" : "Manage billing"}
              </button>
            </form>
          )}
        </section>
      )}
      <AkiSuiteMembershipGrid locale={locale} checkoutReady={suiteCatalogueReady} />
      <p className="subscription-note">
        {es
          ? "Pago seguro con Stripe. Gestiona o cancela desde tu portal de facturación."
          : "Secure payment with Stripe. Manage or cancel from your billing portal."}
      </p>
    </section>
  );
}

