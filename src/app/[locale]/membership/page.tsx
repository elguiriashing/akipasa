import { publicPageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessPackageExplorer } from "@/components/BusinessPackageExplorer";
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
  const { user } = await optionalUser();
  const signedIn = Boolean(user);

  return (
    <main className="shell membership-page">
      <section className="membership-hero">
        <div>
          <div className="eyebrow">
            {es ? "Elige lo que necesitas" : "Choose what you need"}
          </div>
          <h1>
            {es
              ? "Más valor local, sin complicaciones"
              : "More local value, without the clutter"}
          </h1>
          <p className="lede">
            {es
              ? "Opciones claras para explorar, gestionar un negocio o dirigir operaciones con AkiHQ."
              : "Clear options for discovery, business management, or advanced operations with AkiHQ."}
          </p>
        </div>
        <div className="membership-hero-actions">
          <Link
            className="button button-strong"
            href={
              signedIn
                ? `/${locale}/account/subscription`
                : `/${locale}/auth?next=${encodeURIComponent(
                    `/${locale}/account/subscription`,
                  )}`
            }
          >
            {signedIn
              ? es
                ? "Comparar y gestionar planes"
                : "Compare and manage plans"
              : es
                ? "Entrar para continuar"
                : "Sign in to continue"}
          </Link>
          <small>
            {es
              ? "Pagos seguros gestionados por Stripe. Cancela desde el portal de facturación."
              : "Secure Stripe billing. Cancel from the billing portal."}
          </small>
        </div>
      </section>

      <section
        className="membership-plan-grid"
        id="plans"
        aria-label={es ? "Planes de membresía" : "Membership plans"}
      >
        <MembershipCard
          locale={locale}
          plan="premium"
          title={es ? "Premium personal" : "Personal Premium"}
          description={
            es
              ? "Para quienes quieren sacar más partido a sus planes, progreso y ventajas locales."
              : "For people who want more from local plans, progress, and member benefits."
          }
          monthly={"\u20ac1.99"}
          yearly={"\u20ac19.99"}
          saving={
            es ? "Ahorra \u20ac3,89 al a\u00f1o" : "Save \u20ac3.89 each year"
          }
          features={
            es
              ? [
                  "Ofertas exclusivas en locales participantes",
                  "Doble XP en cada check-in aceptado",
                  "Exportación de eventos y guardados al calendario",
                ]
              : [
                  "Member-only offers at participating venues",
                  "Double XP on every accepted check-in",
                  "Calendar export for events and saved plans",
                ]
          }
          signedIn={signedIn}
        />
        <MembershipCard
          locale={locale}
          plan="business"
          title={es ? "AkiPasa Business" : "AkiPasa Business"}
          description={
            es
              ? "Para locales y organizadores que quieren publicar, gestionar y fidelizar."
              : "For venues and organisers ready to publish, manage, and build loyalty."
          }
          monthly="€20"
          yearly="€190"
          saving={es ? "Ahorra €50 al año" : "Save €50 each year"}
          features={
            es
              ? [
                  "Perfil de negocio y equipo",
                  "Locales, eventos y analítica",
                  "Fidelidad, promociones y ofertas Premium",
                ]
              : [
                  "Business profile and team",
                  "Venues, events, and analytics",
                  "Loyalty, promotions, and Premium offers",
                ]
          }
          featured
          signedIn={signedIn}
          id="business-plan"
        />
        <MembershipCard
          locale={locale}
          plan="business_pro"
          title="AkiPasa Business Pro"
          description={
            es
              ? "Para negocios que necesitan un CRM operativo seguro, equipo e inventario inteligente."
              : "For businesses that need a secure operational CRM, team access, and smart inventory."
          }
          monthly="€60"
          yearly="€570"
          saving={es ? "Ahorra €150 al año" : "Save €150 each year"}
          features={
            es
              ? [
                  "Todo lo incluido en AkiPasa Business",
                  "AkiHQ CRM con espacio de trabajo privado",
                  "Hasta 4 usuarios e inventario inteligente",
                ]
              : [
                  "Everything in AkiPasa Business",
                  "AkiHQ CRM with a private workspace",
                  "Up to 4 users and smart inventory",
                ]
          }
          signedIn={signedIn}
          id="business-pro-plan"
        />
      </section>

      <BusinessPackageExplorer locale={locale} />

      <p className="membership-footnote">
        {es
          ? "El acceso de negocio está sujeto a revisión. Los puntos, sellos y pasaportes no tienen valor en efectivo."
          : "Business access is subject to review. Points, stamps, and passports have no cash value."}
      </p>
    </main>
  );
}

function MembershipCard({
  locale,
  plan,
  title,
  description,
  monthly,
  yearly,
  saving,
  features,
  featured = false,
  signedIn,
  id,
}: {
  locale: "es" | "en";
  plan: "premium" | "business" | "business_pro";
  title: string;
  description: string;
  monthly: string;
  yearly: string;
  saving: string;
  features: string[];
  featured?: boolean;
  signedIn: boolean;
  id?: string;
}) {
  const es = locale === "es";
  const subscriptionPath = `/${locale}/account/subscription?plan=${plan}`;
  const destination =
    plan === "business" ? `/${locale}/business/apply` : subscriptionPath;
  const planHref = signedIn
    ? destination
    : `/${locale}/auth?next=${encodeURIComponent(destination)}`;
  return (
    <article
      id={id}
      className={
        featured ? "panel membership-plan featured" : "panel membership-plan"
      }
    >
      <div className="membership-plan-heading">
        <span className="status-pill">
          {plan === "business_pro"
            ? "Business Pro"
            : featured
              ? es
                ? "Para negocios"
                : "For businesses"
              : es
                ? "Para ti"
                : "For you"}
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="membership-price-row">
        <div>
          <strong>{monthly}</strong>
          <span>{es ? "/ mes" : "/ month"}</span>
        </div>
        <div className="membership-annual">
          <strong>{yearly}</strong>
          <span>{es ? "/ año" : "/ year"}</span>
          <small>{saving}</small>
        </div>
      </div>
      <ul>
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <Link
        className={`button ${featured ? "button-strong" : "secondary"}`}
        href={planHref}
      >
        {plan === "business"
          ? es
            ? "Empezar la revisión gratuita"
            : "Start the free business review"
          : plan === "business_pro"
            ? es
              ? "Elegir Business Pro"
              : "Choose Business Pro"
            : es
              ? `Elegir ${title}`
              : `Choose ${title}`}
      </Link>
      {plan === "business" && (
        <small className="membership-plan-reassurance">
          {es
            ? "No pagas hoy. Primero revisamos tu negocio."
            : "No payment today. We review your business first."}
        </small>
      )}
    </article>
  );
}
