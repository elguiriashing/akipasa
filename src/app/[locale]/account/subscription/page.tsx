import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { openBillingPortal, startSubscriptionCheckout } from "./actions";

const plans = [
  { plan: "premium", interval: "month", price: "EUR 5", suffix: "/ month" },
  { plan: "premium", interval: "year", price: "EUR 48", suffix: "/ year" },
  { plan: "business", interval: "month", price: "EUR 20", suffix: "/ month" },
  { plan: "business", interval: "year", price: "EUR 190", suffix: "/ year" },
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
  const [{ data: subscriptions }, { data: grants }, { data: customer }] =
    await Promise.all([
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
    ]);
  const es = locale === "es";

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
      {query.error && (
        <p className="notice">
          {es
            ? "No se pudo iniciar la operacion de facturacion."
            : "The billing operation could not be started."}
        </p>
      )}
      {(subscriptions?.length || grants?.length) && (
        <section className="panel console-card">
          <span className="status-pill">
            {es ? "Acceso actual" : "Current access"}
          </span>
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
            className="panel console-card billing-plan-card"
            key={`${item.plan}-${item.interval}`}
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
            <h2>{item.price}</h2>
            <p>
              {es
                ? item.suffix.replace("month", "mes").replace("year", "ano")
                : item.suffix}
            </p>
            <p>
              {item.plan === "business"
                ? es
                  ? "Publica y gestiona locales, eventos, fidelidad y promociones tras la revision."
                  : "Publish and manage venues, events, loyalty, and promotions after review."
                : es
                  ? "Membresia personal y acceso a ventajas Premium a medida que se publiquen."
                  : "Personal membership and access to Premium benefits as they launch."}
            </p>
            <form action={startSubscriptionCheckout}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="plan" value={item.plan} />
              <input type="hidden" name="interval" value={item.interval} />
              <button className="button" type="submit">
                {es ? "Continuar con Stripe" : "Continue with Stripe"}
              </button>
            </form>
          </article>
        ))}
      </section>
    </>
  );
}
