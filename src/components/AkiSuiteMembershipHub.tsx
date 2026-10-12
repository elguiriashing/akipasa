import Link from "next/link";
import Image from "next/image";
import { changeAkiSuiteSubscription } from "@/app/[locale]/account/subscription/akisuite-actions";
import { openBillingPortal } from "@/app/[locale]/account/subscription/actions";
import { akisuitePlans, type AkiSuitePlan } from "@/lib/akisuite-catalogue";
import styles from "./AkiSuiteMembershipHub.module.css";

import {
  resolveMembershipHub,
  type SuiteSubscriptionRow as SubscriptionRow,
  type SuiteGrantRow as GrantRow,
} from "@/lib/akisuite-membership";

const apps = [
  {
    key: "akipasa",
    name: "AkiPasa",
    initial: "A",
    hue: "orange",
    plans: ["akipasa_premium"],
  },
  {
    key: "akibusiness",
    name: "AkiBusiness",
    initial: "B",
    hue: "yellow",
    plans: ["akibusiness_premium"],
  },
  {
    key: "akiduermo",
    name: "AkiDuermo",
    initial: "D",
    hue: "green",
    plans: ["akiduermo_premium"],
  },
  {
    key: "akihq",
    name: "AkiHQ",
    initial: "HQ",
    hue: "purple",
    plans: ["akihq_standard", "akihq_pro"],
  },
] as const;

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
  const status = (key: (typeof apps)[number]["key"]) =>
    key === "akihq" ? membership.apps.akihq !== "free" : membership.apps[key];
  const plan = (key: (typeof apps)[number]["key"]) => {
    if (key === "akihq")
      return membership.apps.akihq === "pro"
        ? "Pro"
        : membership.apps.akihq === "standard"
          ? "Standard"
          : es
            ? "Gratis"
            : "Free";
    if (!status(key)) return es ? "Gratis" : "Free";
    return "Premium";
  };
  return (
    <section className={styles.root} aria-labelledby="membership-hub-title">
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
              ? "Consulta tu acceso a los cuatro sistemas, revisa tus planes y gestiona la facturación sin perderte entre aplicaciones."
              : "Your access to all four systems, plans and billing, without hunting through four separate settings pages."}
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
                <h3>{es ? "Tus cuatro aplicaciones" : "Your four apps"}</h3>
                {membership.enterprise && (
                  <span className={styles.enterprise}>Enterprise</span>
                )}
              </div>
              <div className={styles.appGrid}>
                {apps.map((app) => {
                  const enabled = status(app.key);
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
                          <Image
                            src={
                              app.key === "akipasa"
                                ? "/pwa/akipasa-512.png"
                                : `/brand/${app.key === "akibusiness" ? "business" : app.key === "akiduermo" ? "duermo" : "hq"}-icon.png`
                            }
                            alt=""
                            width={40}
                            height={40}
                          />
                        </span>
                        <span className={enabled ? styles.active : styles.free}>
                          {enabled
                            ? es
                              ? "Activo"
                              : "Active"
                            : es
                              ? "Gratis"
                              : "Free"}
                        </span>
                      </div>
                      <strong className={styles.appName}>{app.name}</strong>
                      <span className={styles.appPlan}>{plan(app.key)}</span>
                      <Link
                        className={styles.appLink}
                        href={`/${locale}/membership?from=${app.key}#${app.plans[0]}`}
                      >
                        {enabled
                          ? es
                            ? "Ver opciones"
                            : "View options"
                          : es
                            ? "Descubrir Premium"
                            : "Discover Premium"}{" "}
                        <span aria-hidden="true">↗</span>
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
              <h3>
                {membership.enterprise
                  ? "Aki Enterprise"
                  : es
                    ? "Tus membresías"
                    : "Your memberships"}
              </h3>
              <div className={styles.bigStat}>
                {apps.filter((app) => status(app.key)).length}
                <span> / 4</span>
              </div>
              <p>
                {es
                  ? "Aplicaciones con herramientas ampliadas"
                  : "Apps with upgraded tools"}
              </p>
              {membership.enterprise && (
                <p className={styles.enterpriseText}>
                  {es
                    ? "Enterprise incluye Premium para AkiPasa, AkiBusiness y AkiDuermo, y AkiHQ Pro."
                    : "Enterprise includes AkiPasa, AkiBusiness and AkiDuermo Premium, plus AkiHQ Pro."}
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
                  ? "Acceso de tus espacios de trabajo"
                  : "Your workspace access"}
              </h3>
              <p>
                {es
                  ? "Las ventajas de negocio se aplican a estos espacios autorizados. El Premium personal corresponde a la persona suscrita."
                  : "Business benefits apply to these authorised workspaces. Personal Premium belongs to the subscriber."}
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
                            .map((plan) => akisuitePlans[plan]?.label)
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
          <div className={styles.records}>
            <div className={styles.sectionHead}>
              <div>
                <h3>
                  {es ? "Facturación y renovaciones" : "Billing and renewals"}
                </h3>
                <p>
                  {es
                    ? "Muestra las suscripciones vinculadas a tu cuenta. Las ventajas del paquete Enterprise no generan cargos separados."
                    : "Subscriptions linked to this account. Enterprise's included benefits don't create separate charges."}
                </p>
              </div>
            </div>
            {membership.paid.length === 0 ? (
              <p className={styles.empty}>
                {es
                  ? "No tienes suscripciones de pago activas en esta cuenta."
                  : "No active paid subscriptions on this account."}
              </p>
            ) : (
              <div className={styles.recordGrid}>
                {membership.paid.map((record, i) => {
                  const catalogue =
                    record.plan_code in akisuitePlans
                      ? akisuitePlans[record.plan_code as AkiSuitePlan]
                      : null;
                  const oldName =
                    record.plan_code === "premium"
                      ? "AkiPasa Premium"
                      : record.plan_code === "business"
                        ? "AkiHQ Standard (legacy)"
                        : record.plan_code === "business_pro"
                          ? "AkiHQ Pro (legacy)"
                          : record.plan_code;
                  return (
                    <article
                      className={styles.record}
                      key={record.plan_code + record.billing_interval + i}
                    >
                      <div className={styles.recordTop}>
                        <strong>{catalogue?.label || oldName}</strong>
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
                                    .filter(
                                      (key) =>
                                        (key === "akipasa_premium") ===
                                        (record.plan_code ===
                                          "akipasa_premium"),
                                    )
                                    .map((key) => (
                                      <option key={key} value={key}>
                                        {akisuitePlans[key].label}
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
