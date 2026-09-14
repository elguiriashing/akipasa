"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";
import {
  businessCategories,
  businessExtras,
  businessPackageTools,
  getBusinessPackageHighlights,
  type BusinessPlan,
  type BusinessTool,
} from "@/lib/business-packages";
import styles from "./BusinessPackageExplorer.module.css";

const tools: Record<BusinessTool, { en: string; es: string; icon: IconName }> =
  {
    crm: {
      en: "Customer management",
      es: "Gestión de clientes",
      icon: "community",
    },
    "crm-social": {
      en: "Social media",
      es: "Redes sociales",
      icon: "megaphone",
    },
    employees: { en: "People", es: "Equipo", icon: "users" },
    dashboard: { en: "Dashboard", es: "Panel de control", icon: "activity" },
    tasks: { en: "Tasks", es: "Tareas", icon: "audit" },
    calendar: { en: "Calendar", es: "Calendario", icon: "calendar" },
    sales: { en: "Invoices", es: "Facturas", icon: "business" },
    knowledge: {
      en: "Knowledge base",
      es: "Base de conocimiento",
      icon: "saved",
    },
    inventory: { en: "Inventory", es: "Inventario", icon: "venue" },
    inbox: { en: "Inbox", es: "Bandeja de entrada", icon: "inbox" },
    pos: { en: "Point of sale", es: "Punto de venta", icon: "business" },
    collaboration: { en: "Team chat", es: "Chat de equipo", icon: "community" },
  };

export function BusinessPackageExplorer({ locale }: { locale: "es" | "en" }) {
  const es = locale === "es";
  const [categoryKey, setCategoryKey] = useState("");
  const [plan, setPlan] = useState<BusinessPlan>("business");
  const category = businessCategories.find((item) => item.key === categoryKey);
  const included = businessPackageTools[plan];
  const planName = plan === "business" ? (es ? "Básico" : "Basic") : "Pro";

  return (
    <section
      className={styles.explorer}
      aria-labelledby="business-package-heading"
    >
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">
            {es ? "Para tu negocio" : "For your business"}
          </span>
          <h2 id="business-package-heading">
            {es ? "Tus herramientas, de un vistazo" : "Your tools at a glance"}
          </h2>
        </div>
        <div className={styles.selector}>
          <label htmlFor="business-package-category">
            {es ? "Tipo de negocio" : "Business type"}
          </label>
          <select
            id="business-package-category"
            value={categoryKey}
            onChange={(event) => setCategoryKey(event.target.value)}
            aria-controls="business-package-preview"
          >
            <option value="" disabled>
              {es
                ? "Selecciona tu tipo de negocio"
                : "Select your business type"}
            </option>
            {businessCategories.map((item) => (
              <option key={item.key} value={item.key}>
                {item[locale]}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div id="business-package-preview">
        {category ? (
          <div className={styles.preview}>
            <div
              className={styles.planSwitch}
              role="group"
              aria-label={es ? "Plan de negocio" : "Business plan"}
            >
              {(["business", "business_pro"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={plan === value}
                  onClick={() => setPlan(value)}
                >
                  <strong>
                    {value === "business" ? (es ? "Básico" : "Basic") : "Pro"}
                  </strong>
                  <span>
                    {value === "business" ? "€20" : "€60"}
                    {es ? "/mes" : "/month"}
                  </span>
                </button>
              ))}
            </div>

            <div
              className={styles.highlights}
              aria-live="polite"
              aria-atomic="true"
            >
              <p className={styles.caption}>
                {es
                  ? `Incluido en ${planName} · ${category.es}`
                  : `Included in ${planName} · ${category.en}`}
              </p>
              <ul className={styles.toolHighlights}>
                {getBusinessPackageHighlights(category, plan).map((tool) => (
                  <li key={tool}>
                    <Icon name={tools[tool].icon} />
                    <span>{tools[tool][locale]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <details className={styles.disclosure} key={plan}>
              <summary>
                <span>
                  {es
                    ? `Ver las ${included.length} herramientas incluidas`
                    : `See all ${included.length} included tools`}
                </span>
                <Icon name="chevron" />
              </summary>
              <ul className={styles.allTools}>
                {included.map((tool) => (
                  <li key={tool}>{tools[tool][locale]}</li>
                ))}
              </ul>
            </details>

            <div className={styles.action}>
              <Link
                className="button button-strong"
                href={`/${locale}/business/apply?category=${category.key}&plan=${plan}`}
              >
                {es ? `Continuar con ${planName}` : `Continue with ${planName}`}
                <Icon name="arrow-right" />
              </Link>
              <small>
                {es
                  ? "Sin pago hoy. Primero revisamos tu negocio."
                  : "No payment today. We review your business first."}
              </small>
            </div>

            <details className={`${styles.disclosure} ${styles.extras}`}>
              <summary>
                <span>
                  {es ? "Complementos opcionales" : "Optional extras"}
                  <small>{es ? "Próximamente" : "Coming soon"}</small>
                </span>
                <Icon name="chevron" />
              </summary>
              <dl>
                {businessExtras.map((extra) => (
                  <div key={extra.key}>
                    <dt>{extra[locale]}</dt>
                    <dd>{es ? extra.priceEs : extra.price}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        ) : (
          <p className={styles.empty}>
            {es
              ? "Elige tu actividad para ver las herramientas incluidas en cada plan."
              : "Choose your activity to explore the tools included in each plan."}
          </p>
        )}
      </div>
    </section>
  );
}
