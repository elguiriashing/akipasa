import Link from "next/link";
import { openBillingPortal } from "@/app/[locale]/account/subscription/actions";
import { akisuitePlans, type AkiSuitePlan } from "@/lib/akisuite-catalogue";
import styles from "./AkiSuiteMembershipHub.module.css";

type SubscriptionRow = {
  plan_code: string;
  billing_interval: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};
type GrantRow = { plan_code: string; grant_kind: string; expires_at: string | null };
const apps = [
  { key: "akipasa", name: "AkiPasa", initial: "A", hue: "orange", plans: ["akipasa_premium"] },
  { key: "akibusiness", name: "AkiBusiness", initial: "B", hue: "yellow", plans: ["akibusiness_premium"] },
  { key: "akiduermo", name: "AkiDuermo", initial: "D", hue: "green", plans: ["akiduermo_premium"] },
  { key: "akihq", name: "AkiHQ", initial: "HQ", hue: "purple", plans: ["akihq_standard", "akihq_pro"] },
] as const;

function active(record: SubscriptionRow, now: number) {
  return ["active", "trialing"].includes(record.status) &&
    (!record.current_period_end || Date.parse(record.current_period_end) > now);
}

export function resolveMembershipHub(
  legacy: SubscriptionRow[],
  suite: SubscriptionRow[],
  grants: GrantRow[],
  now: number,
) {
  const paid = [...legacy, ...suite].filter((s) => active(s, now));
  const paidCodes = new Set(paid.map((s) => s.plan_code));
  const grantCodes = new Set(grants.filter((g) => !g.expires_at || Date.parse(g.expires_at) > now).map((g) => g.plan_code));
  const has = (code: string) => paidCodes.has(code) || grantCodes.has(code);
  const enterprise = has("aki_enterprise");
  const pro = enterprise || has("akihq_pro") || has("business_pro");
  const premiumBusiness = enterprise || has("akibusiness_premium") || (has("akihq_business_addon") && pro);
  return {
    enterprise,
    apps: {
      akipasa: enterprise || has("akipasa_premium") || has("premium"),
      akibusiness: premiumBusiness,
      akiduermo: enterprise || has("akiduermo_premium"),
      akihq: pro ? "pro" : (has("akihq_standard") || has("business") ? "standard" : "free"),
    },
    paid,
  };
}

export function AkiSuiteMembershipHub({
  locale,
  legacy,
  suite,
  grants,
  hasStripeCustomer,
  unavailable = false,
  now,
}: {
  locale: "en" | "es";
  legacy: SubscriptionRow[];
  suite: SubscriptionRow[];
  grants: GrantRow[];
  hasStripeCustomer: boolean;
  unavailable?: boolean;
  now: number;
}) {
  const es = locale === "es";
  const membership = resolveMembershipHub(legacy, suite, grants, now);
  const date = (value: string) => new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", { dateStyle: "medium", timeZone: "Europe/Madrid" }).format(new Date(value));
  const status = (key: (typeof apps)[number]["key"]) =>
    key === "akihq" ? membership.apps.akihq !== "free" : membership.apps[key];
  const plan = (key: (typeof apps)[number]["key"]) => {
    if (key === "akihq") return membership.apps.akihq === "pro" ? "Pro" : membership.apps.akihq === "standard" ? "Standard" : (es ? "Gratis" : "Free");
    if (!status(key)) return es ? "Gratis" : "Free";
    return "Premium";
  };
  return (
    <section className={styles.root} aria-labelledby="membership-hub-title">
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>{es ? "Centro de membresías" : "Membership centre"}</span>
          <h2 id="membership-hub-title">{es ? "Toda tu AkiSuite, en un lugar." : "Your entire AkiSuite. One place."}</h2>
          <p>{es ? "Consulta tu acceso a los cuatro sistemas, revisa tus planes y gestiona la facturación sin perderte entre aplicaciones." : "Your access to all four systems, plans and billing, without hunting through four separate settings pages."}</p>
        </div>
        <div className={styles.heroActions}>
          <Link className="button secondary" href={`/${locale}/membership`}>{es ? "Explorar planes" : "Explore plans"}</Link>
          {hasStripeCustomer && !unavailable && (
            <form action={openBillingPortal}>
              <input type="hidden" name="locale" value={locale} />
              <button className="button button-strong" type="submit">{es ? "Gestionar pagos" : "Manage billing"}</button>
            </form>
          )}
        </div>
      </header>
      {unavailable ? (
        <div className={styles.empty} role="alert">{es ? "No se han podido cargar todas tus suscripciones. Vuelve a intentarlo antes de hacer cambios." : "We couldn't load all your subscriptions. Try again before making any changes."}</div>
      ) : (
        <>
          <div className={styles.layout}>
            <div className={styles.overview}>
              <div className={styles.sectionHead}>
                <h3>{es ? "Tus cuatro aplicaciones" : "Your four apps"}</h3>
                {membership.enterprise && <span className={styles.enterprise}>Enterprise</span>}
              </div>
              <div className={styles.appGrid}>
                {apps.map((app) => {
                  const enabled = status(app.key);
                  return (
                    <article key={app.key} className={styles.app} data-product={app.key}>
                      <div className={styles.appTop}>
                        <span className={styles.logo} data-hue={app.hue} aria-hidden="true">{app.initial}</span>
                        <span className={enabled ? styles.active : styles.free}>{enabled ? (es ? "Activo" : "Active") : (es ? "Gratis" : "Free")}</span>
                      </div>
                      <strong className={styles.appName}>{app.name}</strong>
                      <span className={styles.appPlan}>{plan(app.key)}</span>
                      <Link className={styles.appLink} href={`/${locale}/membership#${app.key}`}>{enabled ? (es ? "Ver opciones" : "View options") : (es ? "Descubrir Premium" : "Discover Premium")} <span aria-hidden="true">↗</span></Link>
                    </article>
                  );
                })}
              </div>
            </div>
            <aside className={styles.summary}>
              <span className={styles.eyebrow}>{es ? "Resumen de acceso" : "Access overview"}</span>
              <h3>{membership.enterprise ? "Aki Enterprise" : (es ? "Tus membresías" : "Your memberships")}</h3>
              <div className={styles.bigStat}>{apps.filter((app) => status(app.key)).length}<span> / 4</span></div>
              <p>{es ? "Aplicaciones con acceso de pago" : "Apps with paid access"}</p>
              {membership.enterprise && <p className={styles.enterpriseText}>{es ? "Enterprise incluye Premium para AkiPasa, AkiBusiness y AkiDuermo, y AkiHQ Pro." : "Enterprise includes AkiPasa, AkiBusiness and AkiDuermo Premium, plus AkiHQ Pro."}</p>}
              <Link className={styles.summaryLink} href={`/${locale}/membership`}>{es ? "Comparar todos los planes" : "Compare all plans"} →</Link>
            </aside>
          </div>
          <div className={styles.records}>
            <div className={styles.sectionHead}>
              <div>
                <h3>{es ? "Facturación y renovaciones" : "Billing and renewals"}</h3>
                <p>{es ? "Muestra las suscripciones vinculadas a tu cuenta. Las ventajas del paquete Enterprise no generan cargos separados." : "Subscriptions linked to this account. Enterprise's included benefits don't create separate charges."}</p>
              </div>
            </div>
            {membership.paid.length === 0 ? (
              <p className={styles.empty}>{es ? "No tienes suscripciones de pago activas en esta cuenta." : "No active paid subscriptions on this account."}</p>
            ) : (
              <div className={styles.recordGrid}>
                {membership.paid.map((record, i) => {
                  const catalogue = record.plan_code in akisuitePlans ? akisuitePlans[record.plan_code as AkiSuitePlan] : null;
                  const oldName = record.plan_code === "premium" ? "AkiPasa Premium" : record.plan_code === "business" ? "AkiHQ Standard (legacy)" : record.plan_code === "business_pro" ? "AkiHQ Pro (legacy)" : record.plan_code;
                  return (
                    <article className={styles.record} key={record.plan_code + record.billing_interval + i}>
                      <div className={styles.recordTop}><strong>{catalogue?.label || oldName}</strong><span className={styles.active}>{record.status === "trialing" ? (es ? "Prueba" : "Trial") : (es ? "Activo" : "Active")}</span></div>
                      <div className={styles.recordMeta}>
                        <span>{record.billing_interval === "year" ? (es ? "Anual" : "Yearly") : (es ? "Mensual" : "Monthly")}</span>
                        {record.current_period_end && <span>{record.cancel_at_period_end ? (es ? "Termina" : "Ends") : (es ? "Renueva") : (es ? "Renews")} {date(record.current_period_end)}</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      <p className={styles.note}>{es ? "Los permisos dependen de los pagos confirmados y las autorizaciones del negocio. Stripe gestiona cambios de pago y cancelaciones." : "Access depends on confirmed payments and business permissions. Stripe handles payment updates and cancellation requests."}</p>
    </section>
  );
}
