"use client";

import { useState } from "react";
import { startAkiSuiteCheckout } from "@/app/[locale]/account/subscription/akisuite-actions";
import { akisuitePlans, akisuitePriceCents, type AkiSuitePlan } from "@/lib/akisuite-catalogue";
import styles from "./AkiSuiteMembershipGrid.module.css";

const descriptions: Record<AkiSuitePlan, { en: string; es: string; benefitsEn: string[]; benefitsEs: string[] }> = {
  akipasa_premium: {
    en: "More rewards from the places and events you discover.",
    es: "Más ventajas en los locales y eventos que descubres.",
    benefitsEn: ["Member-only offers", "Double check-in XP", "Save and export plans"],
    benefitsEs: ["Ofertas exclusivas", "Doble XP en check-ins", "Guardar y exportar planes"],
  },
  akibusiness_premium: {
    en: "Marketing and event automation for local venues.",
    es: "Marketing y automatización de eventos para negocios locales.",
    benefitsEn: ["Recurring events and reusable templates", "Expanded shared media library", "Advanced visibility insights"],
    benefitsEs: ["Eventos recurrentes y plantillas", "Biblioteca multimedia ampliada", "Análisis avanzados de visibilidad"],
  },
  akiduermo_premium: {
    en: "Extra marketing tools for accommodation hosts.",
    es: "Herramientas de marketing para alojamientos.",
    benefitsEn: ["Accommodation growth tools", "Deeper listing insights", "Enhanced property presentation"],
    benefitsEs: ["Herramientas para alojamientos", "Análisis detallados", "Presentación mejorada del alojamiento"],
  },
  akihq_standard: {
    en: "Day-to-day business operations and team essentials.",
    es: "Operaciones diarias y herramientas para equipos.",
    benefitsEn: ["Business operations dashboard", "Tasks and team basics", "Workspace management"],
    benefitsEs: ["Panel de operaciones", "Tareas y equipo", "Gestión del espacio de trabajo"],
  },
  akihq_pro: {
    en: "Advanced operations, inventory and point of sale.",
    es: "Operaciones avanzadas, inventario y punto de venta.",
    benefitsEn: ["Advanced AkiHQ suite", "POS and inventory", "Team collaboration"],
    benefitsEs: ["Suite AkiHQ avanzada", "TPV e inventario", "Colaboración del equipo"],
  },
  akihq_business_addon: {
    en: "Add Premium marketing when you already have AkiHQ Pro.",
    es: "Añade marketing Premium si ya tienes AkiHQ Pro.",
    benefitsEn: ["Requires active AkiHQ Pro", "AkiBusiness Premium included", "Reduced additional fee"],
    benefitsEs: ["Requiere AkiHQ Pro activo", "Incluye AkiBusiness Premium", "Precio adicional reducido"],
  },
  aki_enterprise: {
    en: "The complete AkiSuite in one combined subscription.",
    es: "La AkiSuite completa en una sola suscripción.",
    benefitsEn: ["AkiHQ Pro and AkiBusiness Premium", "AkiDuermo Premium", "AkiPasa Premium"],
    benefitsEs: ["AkiHQ Pro y AkiBusiness Premium", "AkiDuermo Premium", "AkiPasa Premium"],
  },
};

const order: AkiSuitePlan[] = [
  "akipasa_premium", "akibusiness_premium", "akiduermo_premium",
  "akihq_standard", "akihq_pro", "akihq_business_addon", "aki_enterprise",
];

export function AkiSuiteMembershipGrid({ locale }: { locale: "en" | "es" }) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const es = locale === "es";
  const currency = new Intl.NumberFormat(es ? "es-ES" : "en-IE", {
    style: "currency",
    currency: "EUR",
  });
  return (
    <section className={styles.root} aria-labelledby="akisuite-catalogue-title">
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">AkiSuite</span>
          <h2 id="akisuite-catalogue-title">{es ? "Una suite, tus herramientas" : "One suite, your tools"}</h2>
          <p>{es ? "Elige lo que necesitas para descubrir, promocionar o gestionar." : "Choose the tools you need to discover, promote or operate."}</p>
        </div>
        <fieldset className={styles.interval}>
          <legend>{es ? "Periodo de facturación" : "Billing interval"}</legend>
          <label className={interval === "month" ? styles.selected : ""}>
            <input type="radio" checked={interval === "month"} onChange={() => setInterval("month")} name="akisuite-interval" />
            {es ? "Mensual" : "Monthly"}
          </label>
          <label className={interval === "year" ? styles.selected : ""}>
            <input type="radio" checked={interval === "year"} onChange={() => setInterval("year")} name="akisuite-interval" />
            {es ? "Anual · -20 %" : "Yearly · -20%"}
          </label>
        </fieldset>
      </header>
      <div className={styles.grid}>
        {order.map((key) => {
          const item = akisuitePlans[key];
          const details = descriptions[key];
          const cents = akisuitePriceCents(key, interval);
          const featured = key === "aki_enterprise";
          return (
            <article key={key} className={[styles.card, featured ? styles.featured : ""].join(" ")}>
              <div className={styles.cardHeader}>
                <span className={styles.eyebrow}>{key.startsWith("akihq") ? "AkiHQ" : key === "aki_enterprise" ? "AkiSuite" : "Aki"}</span>
                {featured && <span className={styles.pill}>{es ? "Pack completo" : "Complete bundle"}</span>}
              </div>
              <h3>{item.name}</h3>
              <p className={styles.description}>{details[locale]}</p>
              <div className={styles.price}>
                <strong>{currency.format(cents / 100)}</strong>
                <span>/{interval === "month" ? (es ? "mes" : "month") : (es ? "año" : "year")}</span>
              </div>
              {interval === "year" && <p className={styles.saving}>{es ? "20 % menos que doce pagos mensuales" : "20% off twelve monthly payments"}</p>}
              <ul className={styles.benefits}>
                {(es ? details.benefitsEs : details.benefitsEn).map((benefit) => <li key={benefit}>{benefit}</li>)}
              </ul>
              <form action={startAkiSuiteCheckout}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="plan" value={key} />
                <input type="hidden" name="interval" value={interval} />
                <button type="submit" className={featured ? "button button-strong" : "button secondary"}>
                  {key === "akihq_business_addon"
                    ? es ? "Añadir a AkiHQ Pro" : "Add to AkiHQ Pro"
                    : es ? "Elegir plan" : "Choose plan"}
                </button>
              </form>
            </article>
          );
        })}
      </div>
      <p className={styles.footnote}>{es ? "El total y los impuestos aplicables se muestran antes de confirmar el pago. Las funciones se activan tras la confirmación de Stripe." : "Final totals and applicable taxes appear before payment confirmation. Features activate only after Stripe confirmation."}</p>
    </section>
  );
}
