import { personalPremiumLaunchOpen } from "@/lib/akisuite-premium-launch";
import { SubscriptionRefresh } from "@/components/SubscriptionRefresh";
import { PremiumAdsConversion } from "@/components/PremiumAdsConversion";
import { notFound } from "next/navigation";
import { AkiSuiteMembershipGrid } from "@/components/AkiSuiteMembershipGrid";
import { AkiSuiteMembershipHub } from "@/components/AkiSuiteMembershipHub";
import { requireUser } from "@/lib/auth";
import { resolveMembershipHub } from "@/lib/akisuite-membership";
import { type AkiSuitePlan, akiSuiteApp } from "@/lib/akisuite-catalogue";
import { akiSuiteCheckoutReady } from "@/lib/akisuite-readiness";
import { isLocale } from "@/lib/config";
import { prepareAkiSuiteWorkspace } from "./akisuite-actions";
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
    `/${locale}/account/subscription${query.from ? `?from=${akiSuiteApp(query.from)}` : ""}`,
  );
  const [
    { data: subscriptions, error: subscriptionsError },
    { data: grants, error: grantsError },
    { data: customer, error: customerError },
    { error: profileError },
  ] = await Promise.all([
    supabase
      .from("billing_subscriptions")
      .select(
        "plan_code,billing_interval,status,current_period_end,cancel_at_period_end",
      )
      .eq("profile_id", user.id),
    supabase
      .from("staff_billing_grants")
      .select("plan_code,grant_kind,starts_at,expires_at")
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
            "stripe_subscription_id,plan_code,billing_interval,status,current_period_end,cancel_at_period_end,workspace_id",
          )
          .eq("profile_id", user.id)
      : { data: [], error: null };
  const workspaceResult =
    process.env.AKISUITE_SUBSCRIPTIONS_READY === "true"
      ? await supabase.rpc("akisuite_owned_workspaces")
      : { data: [], error: null };
  const teamAccess =
    process.env.AKISUITE_SUBSCRIPTIONS_READY === "true"
      ? await supabase.rpc("akisuite_accessible_workspace_plans")
      : { data: [], error: null };
  const access = resolveMembershipHub(
    subscriptions || [],
    (suiteRows.data || []).filter(
      (row) =>
        row.plan_code === "akipasa_premium" ||
        row.plan_code === "aki_enterprise",
    ),
    grants || [],
    Date.now(),
  );
  const workspacePlans: Record<string, AkiSuitePlan[]> = {};
  for (const workspace of workspaceResult.data || []) {
    workspacePlans[workspace.id] = resolveMembershipHub(
      [],
      (suiteRows.data || []).filter((row) => row.workspace_id === workspace.id),
      [],
      Date.now(),
    ).activePlans;
  }
  // Enterprise's personal benefit follows the payer; its business benefits follow its workspace.
  const personalPlans = access.activePlans.filter(
    (plan) => plan !== "aki_enterprise",
  );
  if (
    access.activePlans.includes("aki_enterprise") &&
    !personalPlans.includes("akipasa_premium")
  )
    personalPlans.push("akipasa_premium");
  const es = locale === "es";
  const suiteCatalogueReady = akiSuiteCheckoutReady();
  const accessUnavailable = Boolean(
    subscriptionsError ||
      grantsError ||
      customerError ||
      profileError ||
      suiteRows.error ||
      workspaceResult.error ||
      teamAccess.error,
  );
  const errorMessage =
    query.error === "existing_subscription" ||
    query.error === "checkout_in_progress"
      ? es
        ? "Ya existe una suscripción o un pago en curso. Gestiona el plan actual antes de elegir otro."
        : "A subscription or checkout is already in progress. Manage the current plan before choosing another."
      : query.error === "legacy_checkout_closed"
        ? es
          ? "Los nuevos planes se eligen desde el catálogo AkiSuite."
          : "Choose new plans from the AkiSuite catalogue."
        : query.error === "active"
          ? es
            ? "Este plan ya está activo en tu cuenta."
            : "This plan is already active on your account."
          : query.error === "business_required"
            ? es
              ? "Necesitas un plan Business activo para abrir esas herramientas."
              : "You need an active Business plan to open those tools."
            : query.error === "business_pro_required"
              ? es
                ? "Revisa la suscripción operativa de AkiBusiness para esta ubicación."
                : "Review the AkiBusiness operating subscription for this location."
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
        workspaceAccess={teamAccess.data || []}
        planChangesReady={
          suiteCatalogueReady &&
          Boolean(process.env.STRIPE_AKISUITE_PORTAL_CONFIGURATION_ID)
        }
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
            ? "Has vuelto del pago. La membresía solo se actualiza cuando Stripe confirma el pago."
            : "You returned from checkout. Membership updates only after Stripe confirms payment."}
        </p>
      )}
      {query.upgrade === "pending" && (
        <p className="notice" role="status">
          {es
            ? "El cambio de plan está en curso. El acceso se actualizará cuando Stripe confirme el pago."
            : "Your plan change is processing. Access updates when Stripe confirms payment."}
        </p>
      )}
      {query.error && (
        <p className="notice" role="alert">
          {errorMessage}
        </p>
      )}
      {accessUnavailable && (
        <section className="account-control-card" id="membership-recovery">
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
      {suiteCatalogueReady &&
        !workspaceResult.error &&
        !workspaceResult.data?.length && (
          <form
            action={prepareAkiSuiteWorkspace}
            className="account-control-card"
            id="workspace-setup"
          >
            <input type="hidden" name="locale" value={locale} />
            <p>
              {es
                ? "Las ventajas de negocio se asignan a un espacio de trabajo autorizado."
                : "Business benefits belong to an authorised workspace."}
            </p>
            <label>
              {es ? "Nombre del espacio de trabajo" : "Workspace name"}
              <input
                name="workspaceName"
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <button type="submit" className="button secondary">
              {es ? "Preparar mi negocio" : "Prepare my business"}
            </button>
          </form>
        )}
      <AkiSuiteMembershipGrid
        locale={locale}
        checkoutReady={
          suiteCatalogueReady && !accessUnavailable && !suiteRows.error
        }
        originatingApp={akiSuiteApp(query.from)}
        personalPremiumUnlocked={personalPremiumLaunchOpen()}
        workspaces={workspaceResult.data || []}
        activePlans={personalPlans}
        workspacePlans={workspacePlans}
        accessUnavailable={accessUnavailable || Boolean(suiteRows.error)}
      />
      <p className="subscription-note">
        {es
          ? "Pago seguro con Stripe. Gestiona o cancela desde tu portal de facturación."
          : "Secure payment with Stripe. Manage or cancel from your billing portal."}
      </p>
    </section>
  );
}
