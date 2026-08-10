import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { openBillingPortal, startSubscriptionCheckout } from "./actions";

const plans = [
  { plan: "premium", monthly: "€5", yearly: "€48", saving: 12 },
  { plan: "business", monthly: "€20", yearly: "€190", saving: 50 },
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
    { data: subscriptions },
    { data: grants },
    { data: customer },
    { data: profile },
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
      .select("membership_tier,business_plan_active")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const es = locale === "es";
  const errorMessage =
    query.error === "active"
      ? es
        ? "Este plan ya está activo en tu cuenta."
        : "This plan is already active on your account."
      : query.error === "business_required"
        ? es
          ? "Necesitas un plan Business activo para abrir esas herramientas."
          : "You need an active Business plan to open those tools."
        : es
          ? "No se pudo iniciar la operación de facturación."
          : "The billing operation could not be started.";

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Membresia" : "Membership"}
        title={es ? "Planes y facturacion" : "Plans and billing"}
        description={
          es
            ? "Elige mensual o anual. Stripe procesa el pago y puedes cancelar desde su portal seguro."
            : "Choose monthly or annual billing. Stripe processes payment and lets you cancel in its secure portal."
        }
      />
      {query.checkout === "success" && (
        <p className="notice">
          {es
            ? "Pago completado. La membresia aparecera cuando Stripe confirme el webhook."
            : "Checkout completed. Membership will appear after Stripe confirms the webhook."}
        </p>
      )}
      {query.error && <p className="notice">{errorMessage}</p>}
      {Boolean(
        subscriptions?.length ||
          grants?.length ||
          profile?.membership_tier === "premium" ||
          profile?.business_plan_active,
      ) && (
        <section className="panel console-card">
          <span className="status-pill">
            {es ? "Acceso actual" : "Current access"}
          </span>
          {profile?.membership_tier === "premium" && (
            <p>
              <strong>Premium</strong>: {es ? "activo" : "active"}
            </p>
          )}
          {profile?.business_plan_active && (
            <p>
              <strong>Business</strong>: {es ? "activo" : "active"}
            </p>
          )}
          {subscriptions?.map((item) => (
            <p key={`${item.plan_code}-${item.billing_interval}`}>
              <strong>{item.plan_code}</strong>: {item.status} (
              {item.billing_interval})
            </p>
          ))}
          {grants?.map((item) => (
            <p key={`${item.plan_code}-${item.grant_kind}`}>
              <strong>{item.plan_code}</strong>: {item.grant_kind}
              {item.expires_at ? ` - ${item.expires_at.slice(0, 10)}` : ""}
            </p>
          ))}
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
      <section className="billing-plan-grid">
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
            <span className="status-pill">
              {item.plan === "premium"
                ? es
                  ? "Premium personal"
                  : "Personal Premium"
                : es
                  ? "Negocio"
                  : "Business"}
            </span>
            <p>
              {item.plan === "business"
                ? es
                  ? "Publica y gestiona locales, eventos, fidelidad y promociones tras la revision."
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
            <div className="billing-options">
              <BillingOption
                locale={locale}
                plan={item.plan}
                interval="month"
                price={item.monthly}
                label={es ? "Mensual" : "Monthly"}
              />
              <BillingOption
                locale={locale}
                plan={item.plan}
                interval="year"
                price={item.yearly}
                label={es ? "Anual" : "Annual"}
                note={es ? `Ahorra €${item.saving}` : `Save €${item.saving}`}
              />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function BillingOption({
  locale,
  plan,
  interval,
  price,
  label,
  note,
}: {
  locale: "es" | "en";
  plan: "premium" | "business";
  interval: "month" | "year";
  price: string;
  label: string;
  note?: string;
}) {
  const es = locale === "es";
  return (
    <form action={startSubscriptionCheckout} className="billing-option">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="interval" value={interval} />
      <span>
        <strong>{label}</strong>
        {note && <small>{note}</small>}
      </span>
      <span className="billing-option-price">
        <strong>{price}</strong>
        <small>
          {interval === "month"
            ? es
              ? "/ mes"
              : "/ mo"
            : es
              ? "/ año"
              : "/ yr"}
        </small>
      </span>
      <button className="button" type="submit">
        {es ? "Elegir" : "Choose"}
      </button>
    </form>
  );
}
