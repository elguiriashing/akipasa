import Link from "next/link";
import Image from "next/image";
import { changeAkiSuiteSubscription } from "@/app/[locale]/account/subscription/akisuite-actions";
import { openBillingPortal } from "@/app/[locale]/account/subscription/actions";
import { akisuitePlans, type AkiSuitePlan } from "@/lib/akisuite-catalogue";
import styles from "./AkiSuiteMembershipHub.module.css";
import { suiteHref } from "@/lib/suite-navigation";

import {
  resolveMembershipHub,
  type SuiteSubscriptionRow as SubscriptionRow,
  type SuiteGrantRow as GrantRow,
} from "@/lib/akisuite-membership";

const apps = [
  {
    key: "akipasa",
    name: "AkiPasa",
    hue: "orange",
    icon: "/pwa/akipasa-512.png",
  },
  {
    key: "akiduermo",
    name: "AkiDuermo",
    hue: "green",
    icon: "/brand/duermo-icon.png",
  },
  {
    key: "akicoches",
    name: "AkiCoches",
    hue: "orange",
    icon: "/brand/conduzco-icon.svg",
  },
  { key: "akihq", name: "AkiHQ", hue: "purple", icon: "/brand/hq-icon.png" },
  {
    key: "akibusiness",
    name: "AkiBusiness",
    hue: "yellow",
    icon: "/brand/business-icon.png",
  },
] as const;
const currentListingPlans = [
  "akipasa_premium",
  "akibusiness_premium",
  "akiduermo_premium",
];
function recordLabel(code: string, es: boolean) {
  if (code === "akibusiness_premium") return "AkiPasa Listing Premium";
  if (code === "akiduermo_premium") return "AkiDuermo Listing Premium";
  const historical: Record<string, string> = {
    business: "Business",
    business_pro: "Business Pro",
    akihq_standard: "AkiHQ Standard",
    akihq_pro: "AkiHQ Pro",
    akihq_business_addon: "AkiHQ business add-on",
    aki_enterprise: "Aki Enterprise",
  };
  if (historical[code])
    return `${historical[code]} (${es ? "anterior" : "legacy"})`;
  if (code === "premium")
    return `AkiPasa Premium (${es ? "anterior" : "legacy"})`;
  return akisuitePlans[code as AkiSuitePlan]?.label || code;
}

export function AkiSuiteMembershipHub({
  locale,
  legacy,
  suite,
  grants,
  hasStripeCustomer,
  unavailable = false,
  now,
  workspaceAccess = [],
  planChangesReady = false,
}: {
  locale: "en" | "es";
  legacy: SubscriptionRow[];
  suite: SubscriptionRow[];
  grants: GrantRow[];
  hasStripeCustomer: boolean;
  unavailable?: boolean;
  now: number;
  planChangesReady?: boolean;
  workspaceAccess?: Array<{ id: string; name: string; plans: AkiSuitePlan[] }>;
}) {
  const es = locale === "es";
  const membership = resolveMembershipHub(legacy, suite, grants, now);
  const date = (value: string) =>
    new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
      dateStyle: "medium",
      timeZone: "Europe/Madrid",
    }).format(new Date(value));
  // Listing and historical billing benefits never establish operating-tool access.
  const personal = membership.apps.akipasa;
  const accommodationListing = membership.apps.akiduermo;
  const productCopy = {
    akipasa: {
      badge: personal ? "Premium" : es ? "Descubrimiento" : "Discovery",
      detail: personal
        ? es
          ? "Premium personal"
          : "Personal Premium"
        : es
          ? "Descubre lugares y eventos"
          : "Discover places and events",
      href: personal
        ? "#billing-management"
        : `/${locale}/membership?from=akipasa`,
      action: personal
        ? es
          ? "Ver facturación"
          : "View billing"
        : es
          ? "Ver membresías"
          : "View memberships",
    },
    akiduermo: {
      badge: accommodationListing
        ? "Premium"
        : es
          ? "Descubrimiento"
          : "Discovery",
      detail: accommodationListing
        ? "Listing Premium"
        : es
          ? "Descubre alojamientos"
          : "Discover accommodation",
      href: accommodationListing
        ? "#billing-management"
        : `/${locale}/membership?from=akiduermo`,
      action: accommodationListing
        ? es
          ? "Ver facturación"
          : "View billing"
        : es
          ? "Ver opciones del listado"
          : "View listing options",
    },
    akicoches: {
      badge: es ? "Descubrimiento" : "Discovery",
      detail: es
        ? "Descubre alquileres de vehículos"
        : "Discover vehicle rentals",
      href: suiteHref("coches", locale),
      action: es ? "Abrir AkiCoches" : "Open AkiCoches",
    },
    akihq: {
      badge: es ? "Gratis" : "Free",
      detail: es ? "Centro gratuito de gestión" : "Free management hub",
      href: suiteHref("hq", locale),
      action: es ? "Abrir AkiHQ gratis" : "Open free AkiHQ",
    },
    akibusiness: {
      badge: es ? "Por ubicación" : "Per location",
      detail: es ? "Herramientas operativas de pago" : "Paid operating tools",
      href: `/${locale}/account/subscription/operations`,
      action: es
        ? "Gestionar herramientas operativas"
        : "Manage operating tools",
    },
  };
  return (
    <section
      id="membership-centre"
      className={styles.root}
      aria-labelledby="membership-hub-title"
    >
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>
            {es ? "Centro de membresías" : "Membership centre"}
          </span>
          <h2 id="membership-hub-title">
            {es
              ? "Toda tu AkiSuite, en un lugar."
              : "Your entire AkiSuite. One place."}
          </h2>
          <p>
            {es
              ? "Cinco aplicaciones conectadas: descubre, gestiona gratis y consulta tus suscripciones por separado."
              : "Five connected applications: discover, manage for free and review your subscriptions separately."}
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link className="button secondary" href={`/${locale}/membership`}>
            {es ? "Explorar planes" : "Explore plans"}
          </Link>
          {hasStripeCustomer && !unavailable && (
            <form action={openBillingPortal}>
              <input type="hidden" name="locale" value={locale} />
              <button className="button button-strong" type="submit">
                {es ? "Gestionar pagos" : "Manage billing"}
              </button>
            </form>
          )}
        </div>
      </header>
      {unavailable ? (
        <div className={styles.empty} role="status">
          {es
            ? "No se han podido cargar todas tus suscripciones. Vuelve a intentarlo antes de hacer cambios."
            : "We couldn't load all your subscriptions. Try again before making any changes."}
        </div>
      ) : (
        <>
          <div className={styles.layout}>
            <div className={styles.overview}>
              <div className={styles.sectionHead}>
                <h3>{es ? "Tus cinco aplicaciones" : "Your five apps"}</h3>
                {membership.enterprise && (
                  <span className={styles.enterprise}>
                    {es ? "Paquete anterior" : "Historical package"}
                  </span>
                )}
              </div>
              <div className={styles.appGrid}>
                {apps.map((app) => {
                  const copy = productCopy[app.key];
                  return (
                    <article
                      key={app.key}
                      className={styles.app}
                      data-product={app.key}
                    >
                      <div className={styles.appTop}>
                        <span
                          className={styles.logo}
                          data-hue={app.hue}
                          aria-hidden="true"
                        >
                          <Image src={app.icon} alt="" width={40} height={40} />
                        </span>
                        <span className={styles.free}>{copy.badge}</span>
                      </div>
                      <strong className={styles.appName}>{app.name}</strong>
                      <span className={styles.appPlan}>{copy.detail}</span>
                      {app.key === "akipasa" && membership.apps.akibusiness && (
                        <span className={styles.appPlan}>
                          {es
                            ? "Ventajas de Listado Premium en ubicaciones autorizadas"
                            : "Listing Premium benefits in authorised locations"}
                        </span>
                      )}
                      {app.key === "akibusiness" && (
                        <span className={styles.appPlan}>
                          {es
                            ? "El acceso se comprueba para cada ubicación; Listado Premium es independiente."
                            : "Access is checked for each location; Listing Premium is separate."}
                        </span>
                      )}
                      <Link className={styles.appLink} href={copy.href}>
                        {copy.action} <span aria-hidden="true">↗</span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
            <aside className={styles.summary}>
              <span className={styles.eyebrow}>
                {es ? "Resumen de acceso" : "Access overview"}
              </span>
              <h3>{es ? "Tus membresías" : "Your memberships"}</h3>
              <div className={styles.bigStat}>
                {apps.length}
                <span> {es ? "productos" : "products"}</span>
              </div>
              <p>
                {es
                  ? "Una identidad compartida. Permisos y herramientas según cada ubicación."
                  : "One shared identity. Permissions and operating tools depend on each location."}
              </p>
              {membership.enterprise && (
                <p className={styles.enterpriseText}>
                  {es
                    ? "Las condiciones de tu paquete histórico se conservan en los registros de facturación."
                    : "Your historical package terms are retained in the billing records."}
                </p>
              )}
              <Link
                className={styles.summaryLink}
                href={`/${locale}/membership`}
              >
                {es ? "Comparar todos los planes" : "Compare all plans"} →
              </Link>
            </aside>
          </div>
          {workspaceAccess.length > 0 && (
            <section className={styles.records}>
              <h3>
                {es
                  ? "Ventajas de listados y planes históricos por espacio"
                  : "Listing and historical plan benefits by workspace"}
              </h3>
              <p>
                {es
                  ? "Estas ventajas de listados y planes históricos corresponden a espacios autorizados. Las herramientas operativas de AkiBusiness se comprueban por separado. El Premium personal pertenece a la persona suscrita."
                  : "These listing and historical plan benefits apply to authorised workspaces. AkiBusiness operating tools are checked separately. Personal Premium belongs to the subscriber."}
              </p>
              <div className={styles.recordGrid}>
                {workspaceAccess.map((workspace) => (
                  <article className={styles.record} key={workspace.id}>
                    <strong>{workspace.name}</strong>
                    <p>
                      {workspace.plans.length
                        ? workspace.plans
                            .filter(
                              (plan) =>
                                plan !== "akihq_standard" ||
                                !workspace.plans.includes("akihq_pro"),
                            )
                            .map((plan) => recordLabel(plan, es))
                            .filter(Boolean)
                            .join(" · ")
                        : es
                          ? "Acceso gratuito"
                          : "Free access"}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
          <div className={styles.records} id="billing-management">
            <div className={styles.sectionHead}>
              <div>
                <h3>
                  {es ? "Facturación y renovaciones" : "Billing and renewals"}
                </h3>
                <p>
                  {es
                    ? "Estos registros corresponden a Premium personal, listados y planes históricos. Las suscripciones operativas de AkiBusiness se consultan por ubicación. La facturación conserva los registros y los cambios de renovación acordados."
                    : "These records cover personal Premium, listings and historical plans. AkiBusiness operating subscriptions are reviewed per location. Billing retains the records and agreed renewal changes."}
                </p>
              </div>
            </div>
            {membership.paid.length === 0 ? (
              <p className={styles.empty}>
                {es
                  ? "No hay registros activos de Premium personal, listados o planes históricos en este registro. Consulta las suscripciones operativas por ubicación."
                  : "No active personal Premium, listing or historical plan records in this ledger. Review operating subscriptions by location."}
              </p>
            ) : (
              <div className={styles.recordGrid}>
                {membership.paid.map((record, i) => {
                  const catalogue =
                    record.plan_code in akisuitePlans
                      ? akisuitePlans[record.plan_code as AkiSuitePlan]
                      : null;
                  return (
                    <article
                      className={styles.record}
                      key={record.plan_code + record.billing_interval + i}
                    >
                      <div className={styles.recordTop}>
                        <strong>{recordLabel(record.plan_code, es)}</strong>
                        <span className={styles.active}>
                          {record.status === "trialing"
                            ? es
                              ? "Prueba"
                              : "Trial"
                            : es
                              ? "Activo"
                              : "Active"}
                        </span>
                      </div>
                      {planChangesReady &&
                        catalogue &&
                        currentListingPlans.includes(record.plan_code) &&
                        record.stripe_subscription_id && (
                          <details>
                            <summary>
                              {es ? "Cambiar este plan" : "Change this plan"}
                            </summary>
                            <form action={changeAkiSuiteSubscription}>
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="subscriptionId"
                                value={record.stripe_subscription_id}
                              />
                              <label>
                                {es ? "Plan" : "Plan"}
                                <select
                                  name="plan"
                                  defaultValue={record.plan_code}
                                >
                                  {(
                                    Object.keys(akisuitePlans) as AkiSuitePlan[]
                                  )
                                    .filter((key) => key === record.plan_code)
                                    .map((key) => (
                                      <option key={key} value={key}>
                                        {recordLabel(key, es)}
                                      </option>
                                    ))}
                                </select>
                              </label>
                              <label>
                                {es ? "Periodo" : "Interval"}
                                <select
                                  name="interval"
                                  defaultValue={record.billing_interval}
                                >
                                  <option value="month">
                                    {es ? "Mensual" : "Monthly"}
                                  </option>
                                  <option value="year">
                                    {es ? "Anual" : "Yearly"}
                                  </option>
                                </select>
                              </label>
                              <p>
                                {es
                                  ? "Stripe muestra los ajustes antes de confirmar. El cambio sustituye esta suscripción."
                                  : "Stripe shows adjustments before confirmation. The change replaces this subscription."}
                              </p>
                              <button
                                className="button secondary"
                                type="submit"
                              >
                                {es ? "Revisar cambio" : "Review change"}
                              </button>
                            </form>
                          </details>
                        )}
                      <div className={styles.recordMeta}>
                        <span>
                          {record.billing_interval === "year"
                            ? es
                              ? "Anual"
                              : "Yearly"
                            : es
                              ? "Mensual"
                              : "Monthly"}
                        </span>
                        {record.current_period_end && (
                          <span>
                            {record.cancel_at_period_end
                              ? es
                                ? "Termina"
                                : "Ends"
                              : es
                                ? "Renueva"
                                : "Renews"}{" "}
                            {date(record.current_period_end)}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      <p className={styles.note}>
        {es
          ? "Los permisos dependen de los pagos confirmados y las autorizaciones del negocio. Stripe gestiona cambios de pago y cancelaciones."
          : "Access depends on confirmed payments and business permissions. Stripe handles payment updates and cancellation requests."}
      </p>
    </section>
  );
}
