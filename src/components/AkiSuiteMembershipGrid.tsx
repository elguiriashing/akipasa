"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { startAkiSuiteCheckout } from "@/app/[locale]/account/subscription/akisuite-actions";
import {
  akisuitePlans,
  akiSuiteApp,
  effectiveAkiSuitePlans,
  type AkiSuitePlan,
  type AkiSuiteApp,
} from "@/lib/akisuite-catalogue";
import { OPERATION_PRICES } from "@/lib/operations-billing/operations-contract.mjs";
import { suiteHref } from "@/lib/suite-navigation";
import styles from "./AkiSuiteMembershipGrid.module.css";

type Props = {
  locale: "en" | "es";
  checkoutReady?: boolean;
  purchaseMode?: "account" | "checkout";
  originatingApp?: AkiSuiteApp;
  personalPremiumUnlocked?: boolean;
  activePlans?: AkiSuitePlan[];
  accessUnavailable?: boolean;
  workspaces?: Array<{ id: string; name: string }>;
  workspacePlans?: Record<string, AkiSuitePlan[]>;
};
const listingCopy = {
  akipasa_premium: {
    label: "AkiPasa Premium",
    en: "Personal discovery rewards and benefits.",
    es: "Ventajas y recompensas personales al descubrir.",
  },
  akibusiness_premium: {
    label: "AkiPasa Listing Premium",
    en: "Premium venue listing: expanded media, recurring events and reusable templates.",
    es: "Listado Premium: más contenido multimedia, eventos recurrentes y plantillas reutilizables.",
  },
  akiduermo_premium: {
    label: "AkiDuermo Listing Premium",
    en: "Premium accommodation listing media and insights.",
    es: "Contenido multimedia y análisis para tu listado de alojamiento Premium.",
  },
} as const;
export function AkiSuiteMembershipGrid({
  locale,
  checkoutReady = false,
  purchaseMode = "checkout",
  originatingApp = "akipasa",
  personalPremiumUnlocked = false,
  activePlans = [],
  accessUnavailable = false,
  workspaces = [],
  workspacePlans = {},
}: Props) {
  const es = locale === "es",
    origin = akiSuiteApp(originatingApp);
  const [workspaceId, setWorkspaceId] = useState(
    workspaces.length === 1 ? workspaces[0].id : "",
  );
  const validWorkspace = /^[a-z0-9][a-z0-9_-]{2,79}$/.test(workspaceId)
    ? workspaceId
    : "";
  const operations = `/${locale}/account/subscription/operations${validWorkspace ? `?workspace=${encodeURIComponent(validWorkspace)}` : ""}`;
  const included = effectiveAkiSuitePlans([
    ...activePlans,
    ...(workspacePlans[validWorkspace] || []),
  ]);
  const money = (cents: number) =>
    new Intl.NumberFormat(es ? "es-ES" : "en-IE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  const listingPlans: Array<keyof typeof listingCopy> =
    origin === "akiduermo"
      ? ["akiduermo_premium"]
      : origin === "akipasa" || origin === "akibusiness"
        ? ["akibusiness_premium"]
        : [];
  if (origin === "akipasa" && personalPremiumUnlocked)
    listingPlans.unshift("akipasa_premium");
  return (
    <section className={styles.root} aria-labelledby="akisuite-catalogue-title">
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">AkiSuite</span>
          <h2 id="akisuite-catalogue-title">
            {es
              ? "Gestiona gratis. Elige tus herramientas."
              : "Manage for free. Choose your tools."}
          </h2>
          <p>
            {es
              ? "AkiHQ es tu centro gratuito. AkiBusiness es la suite de operaciones de pago por ubicación."
              : "AkiHQ is your free management hub. AkiBusiness is the paid operating suite per location."}
          </p>
        </div>
      </header>
      {workspaces.length > 1 && (
        <label className={styles.workspaceChoice}>
          {es ? "Ubicación de operaciones" : "Operating location"}
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          >
            <option value="">
              {es ? "Elegir ubicación" : "Choose a location"}
            </option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {accessUnavailable && (
        <p role="status">
          {es
            ? "No pudimos verificar tu acceso actual. Revisa tu cuenta antes de cambiar suscripciones."
            : "We couldn't verify your current access. Review your account before changing subscriptions."}{" "}
          <Link href={`/${locale}/account/subscription`}>
            {es ? "Reintentar acceso" : "Retry account access"}
          </Link>
        </p>
      )}
      <div className={styles.grid}>
        <article id="akihq-free" className={styles.card} data-product="akihq">
          <div className={styles.brandIdentity}>
            <Image src="/brand/hq-mark.svg" width={46} height={46} alt="" unoptimized />
            <span className={styles.eyebrow}>AkiHQ</span>
          </div>
          <h3>{es ? "Gestión gratuita" : "Free management"}</h3>
          <p>
            {es
              ? "Organizaciones, ubicaciones, listados, titularidad y permisos esenciales."
              : "Organisations, locations, listings, ownership and essential permissions."}
          </p>
          <div className={styles.price}>
            <strong>{money(0)}</strong>
          </div>
          <Link className="button secondary" href={suiteHref("hq", locale)}>
            {es ? "Abrir AkiHQ gratis" : "Open free AkiHQ"}
          </Link>
        </article>
        {(
          Object.keys(OPERATION_PRICES) as Array<keyof typeof OPERATION_PRICES>
        ).map((tier) => {
          const offer = OPERATION_PRICES[tier],
            swaps = tier === "basico" ? 1 : tier === "standard" ? 2 : null;
          return (
            <article
              id={`operations-${tier}`}
              key={tier}
              className={styles.card}
              data-product="akibusiness"
            >
              <div className={styles.brandIdentity}>
                <Image
                  src="/brand/business-mark.svg"
                  width={46}
                  height={46}
                  alt=""
                  unoptimized
                />
                <span className={styles.eyebrow}>AkiBusiness</span>
              </div>
              <h3>
                {tier === "basico"
                  ? "Standard"
                  : tier === "standard"
                    ? "Plus"
                    : "Pro"}
              </h3>
              <p>
                {tier === "pro"
                  ? es
                    ? "Pro habilita las doce herramientas; no necesita selección."
                    : "Pro enables all twelve tools and needs no selection."
                  : es
                    ? "Las selecciones guardadas se activan en la próxima rotación mensual."
                    : "Saved selections activate at the next monthly rotation."}
              </p>
              <div className={styles.price}>
                <strong>{money(offer.amount)}</strong>
                <span>/{es ? "mes por ubicación" : "month per location"}</span>
              </div>
              <ul className={styles.benefits}>
                <li>
                  {es
                    ? `${offer.tools} de 12 herramientas activas`
                    : `${offer.tools} of 12 active tools`}
                </li>
                <li>
                  {swaps === null
                    ? es
                      ? "Todas las herramientas, sin selección ni límite de sustituciones"
                      : "All tools, no selection or replacement limit"
                    : es
                      ? `${swaps} ${swaps === 1 ? "sustitución mensual" : "sustituciones mensuales"}`
                      : `${swaps} monthly ${swaps === 1 ? "replacement" : "replacements"}`}
                </li>
                <li>
                  {es
                    ? "Delegación al equipo inmediata dentro de las herramientas activas"
                    : "Instant staff delegation within active tools"}
                </li>
              </ul>

              <Link className="button secondary" href={operations}>
                {es
                  ? "Gestionar herramientas de operaciones"
                  : "Manage operating tools"}
              </Link>
            </article>
          );
        })}
        {listingPlans.length > 0 && (
          <>
            {listingPlans.map((plan) => {
              const info = listingCopy[plan],
                current = included.has(plan),
                personal = plan === "akipasa_premium",
                planReady =
                  checkoutReady &&
                  (plan !== "akiduermo_premium" || personalPremiumUnlocked),
                blocked =
                  accessUnavailable ||
                  !planReady ||
                  current ||
                  (!personal && !validWorkspace);
              return (
                <article
                  key={plan}
                  id={plan}
                  className={styles.card}
                  data-product={
                    plan === "akiduermo_premium" ? "akiduermo" : "akipasa"
                  }
                >
                  <Image
                    src={
                      plan === "akiduermo_premium"
                        ? "/brand/duermo-icon.png"
                        : "/pwa/akipasa-192.png"
                    }
                    width={44}
                    height={44}
                    alt=""
                  />
                  <h3>{info.label}</h3>
                  <p>{info[locale]}</p>
                  <div className={styles.price}>
                    <strong>{money(akisuitePlans[plan].monthlyCents)}</strong>
                    <span>/{es ? "mes" : "month"}</span>
                  </div>
                  {accessUnavailable ? (
                    <button type="button" disabled>
                      {es ? "Acceso no disponible" : "Access unavailable"}
                    </button>
                  ) : current ? (
                    <Link href={`/${locale}/account/subscription`}>
                      {es ? "Ver mi acceso" : "View my access"}
                    </Link>
                  ) : purchaseMode === "account" ? (
                    <Link
                      href={`/${locale}/account/subscription?from=${origin}`}
                    >
                      {es ? "Continuar en mi cuenta" : "Continue in my account"}
                    </Link>
                  ) : (
                    <form action={startAkiSuiteCheckout}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="plan" value={plan} />
                      <input type="hidden" name="interval" value="month" />
                      {!personal && validWorkspace && (
                        <input
                          type="hidden"
                          name="workspaceId"
                          value={validWorkspace}
                        />
                      )}
                      <button
                        type="submit"
                        className="button secondary"
                        disabled={blocked}
                      >
                        {!planReady
                          ? es
                            ? "Disponible próximamente"
                            : "Coming soon"
                          : es
                            ? "Revisar Premium"
                            : "Review Premium"}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </>
        )}
      </div>
      <p className={styles.footnote}>
        {es
          ? "Listing Premium y las herramientas operativas son suscripciones independientes."
          : "Listing Premium and operating tools are independent subscriptions."}
      </p>
      <p className={styles.footnote}>
        {es
          ? "La titularidad de un listado es independiente de Premium. Los importes e impuestos se confirman antes del pago. Ninguna devolución del checkout activa funciones por sí sola."
          : "Listing ownership is independent of Premium. Amounts and taxes are confirmed before payment. Returning from checkout alone never activates features."}
      </p>
    </section>
  );
}
