"use client";

import { useState } from "react";
import Link from "next/link";
import {
  businessCategories,
  businessExtras,
  businessPackageTools,
} from "@/lib/business-packages";

const labels: Record<string, string> = {
  crm: "CRM",
  "crm-social": "CRM (Social Media)",
  employees: "People",
  dashboard: "Dashboard",
  tasks: "Tasks",
  calendar: "Calendar",
  sales: "Invoices",
  knowledge: "Knowledge",
  inventory: "Inventory",
  inbox: "Inbox",
  pos: "POS",
  collaboration: "Team Chat",
};

export function BusinessPackageExplorer({ locale }: { locale: "es" | "en" }) {
  const es = locale === "es";
  const [category, setCategory] = useState<(typeof businessCategories)[number]>(
    businessCategories[0],
  );
  return (
    <section
      className="panel business-package-explorer"
      aria-labelledby="business-package-heading"
    >
      <div className="membership-plan-heading">
        <span className="status-pill">
          {es ? "Paquetes por negocio" : "Packages by business"}
        </span>
        <h2 id="business-package-heading">
          {es ? "Selecciona tu tipo de negocio" : "Select your business type"}
        </h2>
        <select
          value={category.key}
          onChange={(event) =>
            setCategory(
              businessCategories.find(
                (item) => item.key === event.target.value,
              ) || businessCategories[0],
            )
          }
        >
          {businessCategories.map((item) => (
            <option key={item.key} value={item.key}>
              {es ? item.es : item.en}
            </option>
          ))}
        </select>
        <p>
          {es
            ? "Herramientas recomendadas para este tipo:"
            : "Recommended focus for this type:"}{" "}
          {category.focus.join(", ")}.
        </p>
      </div>
      <div className="business-package-comparison">
        {(["business", "business_pro"] as const).map((plan) => (
          <article key={plan} className="business-package-column">
            <h3>{plan === "business" ? "Business Basico" : "Business Pro"}</h3>
            <ul>
              {businessPackageTools[plan].map((tool) => (
                <li key={tool}>{labels[tool]}</li>
              ))}
            </ul>
            {plan === "business" && (
              <small>
                {es
                  ? "CRM sin Social, Equipo IA ni publicar empresas en el mapa."
                  : "CRM excludes Social, AI Team, and pushing companies to the map."}
              </small>
            )}
            {plan === "business_pro" && (
              <small>
                {es
                  ? "Incluye CRM Social. Las herramientas internas de AkiHQ nunca se incluyen."
                  : "Includes CRM Social. Internal AkiHQ tools are never included."}
              </small>
            )}
            <Link
              className="button button-strong"
              href={`/${locale}/business/apply?category=${category.key}&plan=${plan}`}
            >
              {es
                ? `Elegir ${plan === "business" ? "Basico" : "Pro"}`
                : `Choose ${plan === "business" ? "Basico" : "Pro"}`}
            </Link>
          </article>
        ))}
      </div>
      <div className="business-package-extras">
        <h3>
          {es
            ? "Complementos para cualquier paquete"
            : "Extras for either package"}
        </h3>
        {businessExtras.map((extra) => (
          <div key={extra.key}>
            <strong>{es ? extra.es : extra.en}</strong>
            <span>{extra.price}</span>
          </div>
        ))}
        <small>
          {es
            ? "Los complementos se activarán en facturación cuando sus precios de Stripe estén configurados."
            : "Extras will become purchasable after their Stripe prices and webhook handling are configured."}
        </small>
      </div>
    </section>
  );
}
