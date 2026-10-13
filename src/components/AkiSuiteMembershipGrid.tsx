"use client";

import { useState } from "react";
import Image from "next/image";
import { startAkiSuiteCheckout } from "@/app/[locale]/account/subscription/akisuite-actions";
import {
  akisuitePlans,
  akisuitePriceCents,
  type AkiSuitePlan,
  type AkiSuiteApp,
  akiSuitePlanApp,
  effectiveAkiSuitePlans,
  businessAddonEligible,
  overlappingAkiSuitePlan,
} from "@/lib/akisuite-catalogue";
import styles from "./AkiSuiteMembershipGrid.module.css";
import {
  businessCategories,
  businessPackageTools,
  getBusinessPackageHighlights,
  type BusinessTool,
} from "@/lib/business-packages";

const descriptions: Record<
  AkiSuitePlan,
  { en: string; es: string; benefitsEn: string[]; benefitsEs: string[] }
> = {
  akipasa_premium: {
    en: "More rewards from the places and events you discover.",
    es: "Más ventajas en los locales y eventos que descubres.",
    benefitsEn: [
      "Member-only offers",
      "Double check-in XP",
      "Save and export plans",
    ],
    benefitsEs: [
      "Ofertas exclusivas",
      "Doble XP en check-ins",
      "Guardar y exportar planes",
    ],
  },
  akibusiness_premium: {
    en: "Marketing and event automation for local venues.",
    es: "Marketing y automatización de eventos para negocios locales.",
    benefitsEn: [
      "Recurring events and reusable templates",
      "Expanded shared media library",
      "Advanced visibility insights",
    ],
    benefitsEs: [
      "Eventos recurrentes y plantillas",
      "Biblioteca multimedia ampliada",
      "Análisis avanzados de visibilidad",
    ],
  },
  akiduermo_premium: {
    en: "Extra marketing tools for accommodation hosts.",
    es: "Herramientas de marketing para alojamientos.",
    benefitsEn: [
      "Confirmed-night and booking comparisons",
      "Exportable property reports",
      "Expanded shared media and folders",
    ],
    benefitsEs: [
      "Comparaciones de noches y reservas",
      "Informes exportables del alojamiento",
      "Biblioteca ampliada con carpetas",
    ],
  },
  akihq_standard: {
    en: "Day-to-day business operations and team essentials.",
    es: "Operaciones diarias y herramientas para equipos.",
    benefitsEn: [
      "Business operations dashboard",
      "Tasks and team basics",
      "Workspace management",
    ],
    benefitsEs: [
      "Panel de operaciones",
      "Tareas y equipo",
      "Gestión del espacio de trabajo",
    ],
  },
  akihq_pro: {
    en: "Advanced operations, inventory and point of sale.",
    es: "Operaciones avanzadas, inventario y punto de venta.",
    benefitsEn: [
      "Advanced AkiHQ suite",
      "POS and inventory",
      "Team collaboration",
    ],
    benefitsEs: [
      "Suite AkiHQ avanzada",
      "TPV e inventario",
      "Colaboración del equipo",
    ],
  },
  akihq_business_addon: {
    en: "Add Premium marketing when you already have AkiHQ Pro.",
    es: "Añade marketing Premium si ya tienes AkiHQ Pro.",
    benefitsEn: [
      "Requires active AkiHQ Pro",
      "AkiBusiness Premium included",
      "Reduced additional fee",
    ],
    benefitsEs: [
      "Requiere AkiHQ Pro activo",
      "Incluye AkiBusiness Premium",
      "Precio adicional reducido",
    ],
  },
  aki_enterprise: {
    en: "The complete AkiSuite in one combined subscription.",
    es: "La AkiSuite completa en una sola suscripción.",
    benefitsEn: [
      "AkiHQ Pro and AkiBusiness Premium",
      "AkiDuermo Premium",
      "AkiPasa Premium",
    ],
    benefitsEs: [
      "AkiHQ Pro y AkiBusiness Premium",
      "AkiDuermo Premium",
      "AkiPasa Premium",
    ],
  },
};

const toolLabels: Record<BusinessTool, { en: string; es: string }> = {
  crm: { en: "Customer management", es: "Gestión de clientes" },
  "crm-social": { en: "Social media (pilot)", es: "Redes sociales (piloto)" },
  employees: { en: "Team management", es: "Gestión de equipo" },
  dashboard: { en: "Dashboard", es: "Panel de control" },
  tasks: { en: "Tasks", es: "Tareas" },
  calendar: { en: "Calendar", es: "Calendario" },
  sales: { en: "Invoices", es: "Facturas" },
  knowledge: { en: "Knowledge base", es: "Base de conocimiento" },
  inventory: { en: "Inventory", es: "Inventario" },
  inbox: { en: "Inbox (pilot)", es: "Bandeja (piloto)" },
  pos: { en: "Point of sale", es: "TPV" },
  collaboration: { en: "Team chat", es: "Chat de equipo" },
};

const brandLogos = {
  akipasa: { src: "/pwa/akipasa-192.png", name: "AkiPasa" },
  akibusiness: { src: "/brand/business-icon.png", name: "AkiBusiness" },
  akiduermo: { src: "/brand/duermo-icon.png", name: "AkiDuermo" },
  akihq: { src: "/brand/hq-icon.png", name: "AkiHQ" },
} as const;

function PlanBrandLogos({ plan }: { plan: AkiSuitePlan }) {
  const apps: Array<keyof typeof brandLogos> =
    plan === "aki_enterprise"
      ? ["akipasa", "akibusiness", "akiduermo", "akihq"]
      : plan === "akihq_business_addon"
        ? ["akihq", "akibusiness"]
        : plan === "akipasa_premium"
          ? ["akipasa"]
          : plan === "akibusiness_premium"
            ? ["akibusiness"]
            : plan === "akiduermo_premium"
              ? ["akiduermo"]
              : ["akihq"];
  return (
    <span
      className={styles.brandLogos}
      aria-label={apps.map((app) => brandLogos[app].name).join(" + ")}
    >
      {apps.map((app) => (
        <Image
          key={app}
          src={brandLogos[app].src}
          alt=""
          aria-hidden="true"
          className={styles.brandLogo}
          width={44}
          height={44}
          sizes="44px"
        />
      ))}
    </span>
  );
}

const order: AkiSuitePlan[] = [
  "aki_enterprise",
  "akipasa_premium",
  "akibusiness_premium",
  "akiduermo_premium",
  "akihq_standard",
  "akihq_pro",
  "akihq_business_addon",
];

export function AkiSuiteMembershipGrid({
  locale,
  checkoutReady = false,
  originatingApp = "akipasa",
  activePlans = [],
  accessUnavailable = false,
  workspaces = [],
  workspacePlans = {},
}: {
  locale: "en" | "es";
  checkoutReady?: boolean;
  originatingApp?: AkiSuiteApp;
  activePlans?: AkiSuitePlan[];
  accessUnavailable?: boolean;
  workspaces?: Array<{ id: string; name: string }>;
  workspacePlans?: Record<string, AkiSuitePlan[]>;
}) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [sector, setSector] =
    useState<(typeof businessCategories)[number]["key"]>("food");
  const [sectorTier, setSectorTier] = useState<"business" | "business_pro">(
    "business",
  );
  const [expandedPlans, setExpandedPlans] = useState<AkiSuitePlan[]>([]);
  const selectedSector =
    businessCategories.find((category) => category.key === sector) ??
    businessCategories[0];
  const highlightedTools = getBusinessPackageHighlights(
    selectedSector,
    sectorTier,
  );
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || "");
  const es = locale === "es";
  const selectedPlans = [
    ...activePlans,
    ...(workspacePlans[workspaceId] || []),
  ];
  const included = effectiveAkiSuitePlans(selectedPlans);
  const currency = new Intl.NumberFormat(es ? "es-ES" : "en-IE", {
    style: "currency",
    currency: "EUR",
  });
  return (
    <section className={styles.root} aria-labelledby="akisuite-catalogue-title">
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">AkiSuite</span>
          <h2 id="akisuite-catalogue-title">
            {es ? "Una suite, tus herramientas" : "One suite, your tools"}
          </h2>
          <p>
            {es
              ? "Elige lo que necesitas para descubrir, promocionar o gestionar."
              : "Choose the tools you need to discover, promote or operate."}
          </p>
        </div>
        <fieldset className={styles.interval}>
          <legend>{es ? "Periodo de facturación" : "Billing interval"}</legend>
          <label className={interval === "month" ? styles.selected : ""}>
            <input
              type="radio"
              checked={interval === "month"}
              onChange={() => setInterval("month")}
              name="akisuite-interval"
            />
            {es ? "Mensual" : "Monthly"}
          </label>
          <label className={interval === "year" ? styles.selected : ""}>
            <input
              type="radio"
              checked={interval === "year"}
              onChange={() => setInterval("year")}
              name="akisuite-interval"
            />
            {es ? "Anual · -20 %" : "Yearly · -20%"}
          </label>
        </fieldset>
      </header>
      {workspaces.length > 1 && (
        <fieldset className={styles.workspaces}>
          <legend>
            {es
              ? "Negocio que recibirá las ventajas"
              : "Business receiving the benefits"}
          </legend>
          {workspaces.map((workspace) => (
            <label key={workspace.id}>
              <input
                type="radio"
                name="akisuite-workspace"
                value={workspace.id}
                checked={workspaceId === workspace.id}
                onChange={() => setWorkspaceId(workspace.id)}
              />
              {workspace.name}
            </label>
          ))}
        </fieldset>
      )}
      <section
        className={styles.sectorPanel}
        aria-labelledby="akisuite-sector-title"
      >
        <div className={styles.sectorIntro}>
          <span className={styles.eyebrow}>
            AkiHQ · {es ? "Herramientas por sector" : "Tools by sector"}
          </span>
          <h3 id="akisuite-sector-title">
            {es ? "Tu negocio, tus herramientas" : "Your business, your tools"}
          </h3>
          <p>
            {es
              ? "Explora qué herramientas destacan para tu actividad. Los permisos dependen del plan, no del sector."
              : "Explore tools relevant to your business. Plan permissions do not change with your sector."}
          </p>
        </div>
        <div className={styles.sectorChoices}>
          <label htmlFor="akisuite-sector">
            {es ? "Tipo de negocio" : "Business type"}
          </label>
          <select
            id="akisuite-sector"
            value={sector}
            onChange={(event) => setSector(event.target.value as typeof sector)}
          >
            {businessCategories.map((category) => (
              <option value={category.key} key={category.key}>
                {category[locale]}
              </option>
            ))}
          </select>
          <div
            className={styles.sectorSwitch}
            role="group"
            aria-label={es ? "Plan AkiHQ" : "AkiHQ plan"}
          >
            <button
              type="button"
              aria-pressed={sectorTier === "business"}
              onClick={() => setSectorTier("business")}
            >
              Standard · 20 €
            </button>
            <button
              type="button"
              aria-pressed={sectorTier === "business_pro"}
              onClick={() => setSectorTier("business_pro")}
            >
              Pro · 60 €
            </button>
          </div>
        </div>
        <div className={styles.sectorResults} aria-live="polite">
          <strong>
            {es ? "Destacadas para tu sector" : "Highlights for your sector"}
          </strong>
          <ul>
            {highlightedTools.map((tool) => (
              <li key={tool}>{toolLabels[tool][locale]}</li>
            ))}
          </ul>
          <details className={styles.toolDisclosure}>
            <summary>
              {es
                ? `Ver las ${businessPackageTools[sectorTier].length} herramientas incluidas`
                : `See all ${businessPackageTools[sectorTier].length} included tools`}
            </summary>
            <div className={styles.toolChips}>
              {businessPackageTools[sectorTier].map((tool) => (
                <span key={tool}>{toolLabels[tool][locale]}</span>
              ))}
            </div>
          </details>
        </div>
      </section>
      <div className={styles.grid}>
        {order.map((key) => {
          const item = akisuitePlans[key];
          const details = descriptions[key];
          const cents = akisuitePriceCents(key, interval);
          const featured = key === "aki_enterprise";
          const app = akiSuitePlanApp(key);
          const current = included.has(key);
          const origin = app === originatingApp;
          const overlap = overlappingAkiSuitePlan(key, selectedPlans);
          const eligible =
            key !== "akihq_business_addon" ||
            businessAddonEligible(selectedPlans);
          return (
            <article
              key={key}
              id={key}
              data-product={app}
              data-origin={origin || undefined}
              data-expanded={expandedPlans.includes(key) || undefined}
              className={[styles.card, featured ? styles.featured : ""].join(
                " ",
              )}
            >
              <div className={styles.cardHeader}>
                <div className={styles.brandIdentity}>
                  <PlanBrandLogos plan={key} />
                  <span className={styles.eyebrow}>
                    {app === "akisuite"
                      ? "AkiSuite"
                      : app === "akihq"
                        ? "AkiHQ"
                        : app === "akibusiness"
                          ? "AkiBusiness"
                          : app === "akiduermo"
                            ? "AkiDuermo"
                            : "AkiPasa"}
                  </span>
                </div>
                {featured && (
                  <span className={styles.pill}>
                    {es ? "Pack completo" : "Complete bundle"}
                  </span>
                )}
              </div>
              {origin && (
                <span className={styles.origin}>
                  {es ? "Tu aplicación" : "Your app"}
                </span>
              )}
              {current && (
                <span className={styles.pill}>
                  {es ? "Incluido en tu acceso" : "Included in your access"}
                </span>
              )}
              <h3>
                {es && key === "akihq_business_addon"
                  ? "AkiBusiness Premium para AkiHQ Pro"
                  : item.label}
              </h3>
              <p className={styles.description}>{details[locale]}</p>
              <div className={styles.price}>
                <strong>{currency.format(cents / 100)}</strong>
                <span>
                  /
                  {interval === "month"
                    ? es
                      ? "mes"
                      : "month"
                    : es
                      ? "año"
                      : "year"}
                </span>
              </div>
              {interval === "year" && (
                <p className={styles.saving}>
                  {es
                    ? `Ahorras ${currency.format((item.monthlyCents * 12 - cents) / 100)} al año · 20 %`
                    : `Save ${currency.format((item.monthlyCents * 12 - cents) / 100)} per year · 20%`}
                </p>
              )}
              <button
                type="button"
                className={styles.mobileExpand}
                aria-expanded={expandedPlans.includes(key)}
                aria-controls={`plan-benefits-${key}`}
                onClick={() =>
                  setExpandedPlans((plans) =>
                    plans.includes(key)
                      ? plans.filter((plan) => plan !== key)
                      : [...plans, key],
                  )
                }
              >
                {expandedPlans.includes(key)
                  ? es
                    ? "Menos detalles"
                    : "Less detail"
                  : es
                    ? "Ver ventajas y acceso"
                    : "View benefits and access"}
                <span aria-hidden="true">
                  {expandedPlans.includes(key) ? "−" : "+"}
                </span>
              </button>
              <div id={`plan-benefits-${key}`} className={styles.cardDetails}>
                <ul className={styles.benefits}>
                  {(es ? details.benefitsEs : details.benefitsEn).map(
                    (benefit) => (
                      <li key={benefit}>{benefit}</li>
                    ),
                  )}
                </ul>
                <form action={startAkiSuiteCheckout}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="plan" value={key} />
                  <input type="hidden" name="interval" value={interval} />
                  {key !== "akipasa_premium" && workspaceId && (
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={workspaceId}
                    />
                  )}
                  <button
                    type="submit"
                    className={
                      featured ? "button button-strong" : "button secondary"
                    }
                    disabled={
                      !checkoutReady ||
                      current ||
                      accessUnavailable ||
                      overlap ||
                      !eligible
                    }
                  >
                    {current
                      ? es
                        ? "Plan incluido"
                        : "Plan included"
                      : !checkoutReady
                        ? es
                          ? "Disponible próximamente"
                          : "Coming soon"
                        : key === "akihq_business_addon"
                          ? es
                            ? "Añadir a AkiHQ Pro"
                            : "Add to AkiHQ Pro"
                          : es
                            ? "Elegir plan"
                            : "Choose plan"}
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
      <p className={styles.footnote}>
        {es
          ? "La verificación de titularidad de un local es independiente de Premium. El total y los impuestos aplicables se muestran antes de confirmar el pago. Las funciones se activan tras la confirmación de Stripe."
          : "Verified venue ownership is independent of Premium. Final totals and applicable taxes appear before payment confirmation. Features activate only after Stripe confirmation."}
      </p>
    </section>
  );
}
