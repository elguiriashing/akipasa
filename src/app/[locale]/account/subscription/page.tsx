import { SubscriptionRefresh } from "@/components/SubscriptionRefresh";
import { PremiumAdsConversion } from "@/components/PremiumAdsConversion";
import { notFound } from "next/navigation";
import { MembershipPicker } from "@/components/MembershipPicker";
import { Icon } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { openBillingPortal, startSubscriptionCheckout } from "./actions";
import { businessCategories } from "@/lib/business-packages";
import { AccountPageHeader } from "../AccountPageHeader";
import { AccountCollectionRefresh } from "../AccountCollectionRefresh";

const plans = [
  {
    plan: "premium",
    monthly: "\u20ac1.99",
    yearly: "\u20ac19.99",
    saving: 3.89,
  },
  { plan: "business", monthly: "€20", yearly: "€190", saving: 50 },
  {
    plan: "business_pro",
    monthly: "€60",
    yearly: "€570",
    saving: 150,
  },
] as const;

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
  const es = locale === "es";
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
      {!accessUnavailable &&
        Boolean(
          subscriptions?.length ||
            grants?.length ||
            profile?.membership_tier === "premium" ||
            profile?.business_plan_active,
        ) && (
          <section className="subscription-access account-control-card">
            <header className="account-control-heading">
              <span className="account-control-icon">
                <Icon name="membership" />
              </span>
              <div>
                <h2>{es ? "Acceso actual" : "Current access"}</h2>
                <p>
                  {es
                    ? "Tus planes y permisos de membresía."
                    : "Your plans and membership access."}
                </p>
              </div>
            </header>
            <div className="account-access-badges">
              {profile?.membership_tier === "premium" && (
                <p>
                  <strong>Premium</strong>: {es ? "activo" : "active"}
                </p>
              )}
              {profile?.business_plan_active && (
                <p>
                  <strong>
                    {profile.business_tier === "business_pro"
                      ? "Business Pro"
                      : "Business"}
                  </strong>
                  : {es ? "activo" : "active"}
                </p>
              )}
            </div>
            <details className="subscription-records account-control-disclosure">
              <summary>{es ? "Detalles del acceso" : "Access details"}</summary>
              <div className="account-disclosure-content account-access-records">
                {subscriptions?.map((item) => (
                  <p key={`${item.plan_code}-${item.billing_interval}`}>
                    <strong>{planLabel(item.plan_code)}</strong>:{" "}
                    {accessLabel(item.status, es)} (
                    {accessLabel(item.billing_interval, es)})
                  </p>
                ))}
                {grants?.map((item) => (
                  <p key={`${item.plan_code}-${item.grant_kind}`}>
                    <strong>{planLabel(item.plan_code)}</strong>:{" "}
                    {accessLabel(item.grant_kind, es)}
                    {item.expires_at
                      ? ` - ${item.expires_at.slice(0, 10)}`
                      : ""}
                  </p>
                ))}
              </div>
            </details>
            {customer && (
              <form action={openBillingPortal}>
                <input type="hidden" name="locale" value={locale} />
                <button className="button secondary" type="submit">
                  {es ? "Gestionar pago" : "Manage billing"}
                </button>
              </form>
            )}
          </section>
        )}
      {!accessUnavailable && (
        <MembershipPicker locale={locale} initialPlan={query.plan}>
          {plans.map((item) => (
            <article
              className={[
                "panel console-card billing-plan-card",
                query.plan === item.plan ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={item.plan}
            >
              <div className="account-plan-details">
                <span className="status-pill">
                  {item.plan === "premium"
                    ? es
                      ? "Premium personal"
                      : "Personal Premium"
                    : item.plan === "business_pro"
                      ? "Business Pro"
                      : es
                        ? "Negocio"
                        : "Business"}
                </span>
                <h2>
                  {item.plan === "premium"
                    ? "AkiPasa Premium"
                    : item.plan === "business_pro"
                      ? "AkiBusiness Pro"
                      : "AkiBusiness"}
                </h2>
                <p>
                  {item.plan === "business_pro"
                    ? es
                      ? "AkiHQ CRM seguro, cuatro usuarios incluidos e inventario inteligente para operaciones avanzadas."
                      : "Secure AkiHQ CRM, four included users, and smart inventory for advanced operations."
                    : item.plan === "business"
                      ? es
                        ? "Publica y gestiona locales, eventos, fidelidad y promociones tras la revisión."
                        : "Publish and manage venues, events, loyalty, and promotions after review."
                      : es
                        ? "Ofertas para miembros, doble XP y calendarios para tus planes."
                        : "Member-only offers, double XP, and calendar tools for your plans."}
                </p>
                <ul className="membership-benefit-list">
                  {(item.plan === "premium"
                    ? es
                      ? [
                          "Ofertas Premium en locales participantes",
                          "20 XP por check-in aceptado",
                          "Exportación de eventos y guardados",
                        ]
                      : [
                          "Premium offers at participating venues",
                          "20 XP per accepted check-in",
                          "Event and saved-plan exports",
                        ]
                    : item.plan === "business_pro"
                      ? es
                        ? [
                            "Todo lo incluido en Business",
                            "AkiHQ CRM con espacios de trabajo aislados",
                            "Hasta cuatro usuarios e inventario inteligente",
                          ]
                        : [
                            "Everything in Business",
                            "AkiHQ CRM with isolated workspaces",
                            "Up to four users and smart inventory",
                          ]
                      : es
                        ? [
                            "Perfil y herramientas de negocio",
                            "Locales, eventos y analítica",
                            "Fidelidad, promociones y ofertas Premium",
                          ]
                        : [
                            "Business profile and tools",
                            "Venues, events, and analytics",
                            "Loyalty, promotions, and Premium offers",
                          ]
                  ).map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              </div>
              <BillingOption
                locale={locale}
                plan={item.plan}
                monthly={item.monthly}
                yearly={item.yearly}
                saving={item.saving}
                businessCategory={query.category}
              />
            </article>
          ))}
        </MembershipPicker>
      )}
      <p className="subscription-note">
        {es
          ? "Pago seguro con Stripe. Gestiona o cancela desde tu portal de facturación."
          : "Secure payment with Stripe. Manage or cancel from your billing portal."}
      </p>
    </section>
  );
}

function planLabel(plan: string) {
  return plan === "premium"
    ? "Premium"
    : plan === "business"
      ? "Business"
      : plan === "business_pro"
        ? "Business Pro"
        : plan;
}

function accessLabel(value: string, es: boolean) {
  const labels: Record<string, [string, string]> = {
    active: ["Activo", "Active"],
    trialing: ["En prueba", "Trial"],
    canceled: ["Cancelado", "Cancelled"],
    past_due: ["Pago pendiente", "Payment overdue"],
    unpaid: ["Sin pagar", "Unpaid"],
    incomplete: ["Pendiente de completar", "Incomplete"],
    incomplete_expired: ["Expirado", "Expired"],
    paused: ["En pausa", "Paused"],
    month: ["Mensual", "Monthly"],
    year: ["Anual", "Annual"],
    trial_1_month: ["Prueba de un mes", "One-month trial"],
    trial_3_month: ["Prueba de tres meses", "Three-month trial"],
    waived: ["Acceso concedido", "Granted access"],
  };
  return labels[value]?.[es ? 0 : 1] || value;
}

function BillingOption({
  locale,
  plan,
  monthly,
  yearly,
  saving,
  businessCategory,
}: {
  locale: "es" | "en";
  plan: "premium" | "business" | "business_pro";
  monthly: string;
  yearly: string;
  saving: number;
  businessCategory?: string;
}) {
  const es = locale === "es";
  return (
    <form action={startSubscriptionCheckout} className="billing-option">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="plan" value={plan} />
      <fieldset className="subscription-intervals">
        <legend>{es ? "Facturación" : "Billing interval"}</legend>
        {(["month", "year"] as const).map((interval) => (
          <label key={interval}>
            <input
              type="radio"
              name="interval"
              value={interval}
              defaultChecked={interval === "month"}
            />
            <span>
              {interval === "month"
                ? es
                  ? "Mensual"
                  : "Monthly"
                : es
                  ? "Anual"
                  : "Annual"}
            </span>
            <strong>{interval === "month" ? monthly : yearly}</strong>
            <small>
              {interval === "year"
                ? `${es ? "Ahorra" : "Save"} €${saving}`
                : es
                  ? "Cada mes"
                  : "Every month"}
            </small>
          </label>
        ))}
      </fieldset>
      {plan !== "premium" && (
        <label className="billing-business-category">
          <span>{es ? "Tipo de negocio" : "Business type"}</span>
          <select
            name="businessCategory"
            defaultValue={
              businessCategories.some((item) => item.key === businessCategory)
                ? businessCategory
                : "food"
            }
          >
            {businessCategories.map((category) => (
              <option key={category.key} value={category.key}>
                {es ? category.es : category.en}
              </option>
            ))}
          </select>
        </label>
      )}
      <button className="button" type="submit">
        {es ? "Continuar" : "Continue"}
      </button>
    </form>
  );
}
