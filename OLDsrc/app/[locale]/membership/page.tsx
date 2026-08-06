import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { optionalUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export function generateMetadata(): Metadata {
  return {
    title: "Membership",
    description:
      "Choose an AkiPasa personal or business membership with secure Stripe billing.",
  };
}

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
              ? "Un plan personal para explorar más y un plan de negocio para publicar, gestionar y crecer."
              : "A personal plan for richer discovery and a business plan to publish, manage, and grow."}
          </p>
        </div>
        <div className="membership-hero-actions">
          <Link
            className="button button-strong"
            href={`/${locale}/auth?next=${encodeURIComponent(`/${locale}/account/subscription`)}`}
          >
            {es ? "Entrar para continuar" : "Sign in to continue"}
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
          monthly="€5"
          yearly="€48"
          saving={es ? "Ahorra €12 al año" : "Save €12 each year"}
          features={
            es
              ? ["Ventajas Premium al publicarse", "Progreso en un solo lugar"]
              : ["Premium benefits as they launch", "Progress in one place"]
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
              ? ["Locales y eventos", "Fidelidad y promociones"]
              : ["Venues and events", "Loyalty and promotions"]
          }
          featured
          signedIn={signedIn}
        />
      </section>

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
}: {
  locale: "es" | "en";
  plan: "premium" | "business";
  title: string;
  description: string;
  monthly: string;
  yearly: string;
  saving: string;
  features: string[];
  featured?: boolean;
  signedIn: boolean;
}) {
  const es = locale === "es";
  const subscriptionPath = `/${locale}/account/subscription?plan=${plan}`;
  const planHref = signedIn
    ? subscriptionPath
    : `/${locale}/auth?next=${encodeURIComponent(subscriptionPath)}`;
  return (
    <article
      className={
        featured ? "panel membership-plan featured" : "panel membership-plan"
      }
    >
      <div className="membership-plan-heading">
        <span className="status-pill">
          {featured
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
        {es ? `Elegir ${title}` : `Choose ${title}`}
      </Link>
    </article>
  );
}
