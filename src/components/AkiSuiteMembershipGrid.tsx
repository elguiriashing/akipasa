"use client";

import { useState } from "react";
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
              className={[styles.card, featured ? styles.featured : ""].join(
                " ",
              )}
            >
              <div className={styles.cardHeader}>
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
              <h3>{item.label}</h3>
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
                  <input type="hidden" name="workspaceId" value={workspaceId} />
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
