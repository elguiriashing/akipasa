"use client";

import { useState } from "react";
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
import {
  AkiSuiteMembershipStudio,
  type MembershipOffer,
} from "./AkiSuiteMembershipStudio";
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
  const es = locale === "es";
  const origin = akiSuiteApp(originatingApp);
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

  // The origin selects a listing, never grants the separate operating toolbox.
  // Existing accommodation catalogue/checkout entitlements remain untouched.
  const listingPlan = origin === "akiduermo"
    ? "akiduermo_premium"
    : "akibusiness_premium";
  const discoveryName = origin === "akiduermo" ? "AkiDuermo" : "AkiPasa";
  const listingReady =
    checkoutReady &&
    (listingPlan !== "akiduermo_premium" || personalPremiumUnlocked);

  function planAction(plan: "akibusiness_premium" | "akiduermo_premium" | "akipasa_premium") {
    const personal = plan === "akipasa_premium";
    const isCurrent = included.has(plan);
    const ready = checkoutReady && (plan !== "akiduermo_premium" || personalPremiumUnlocked);
    const blocked = accessUnavailable || !ready || isCurrent || (!personal && !validWorkspace);
    if (accessUnavailable)
      return <button type="button" disabled>{es ? "Acceso no disponible" : "Access unavailable"}</button>;
    if (isCurrent)
      return <Link href={`/${locale}/account/subscription`}>{es ? "Ver mi acceso" : "View my access"}</Link>;
    if (purchaseMode === "account")
      return <Link href={`/${locale}/account/subscription?from=${origin}`}>{es ? "Continuar en mi cuenta" : "Continue in my account"}</Link>;
    return (
      <form action={startAkiSuiteCheckout}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="plan" value={plan} />
        <input type="hidden" name="interval" value="month" />
        {!personal && validWorkspace && (
          <input type="hidden" name="workspaceId" value={validWorkspace} />
        )}
        <button type="submit" disabled={blocked}>
          {!ready
            ? (es ? "Disponible próximamente" : "Coming soon")
            : (es ? "Revisar Premium" : "Review Premium")}
        </button>
      </form>
    );
  }

  const operationsOffers = (Object.keys(OPERATION_PRICES) as Array<keyof typeof OPERATION_PRICES>)
    .map((tier): MembershipOffer => {
      const plan = OPERATION_PRICES[tier];
      const name = tier === "basico" ? "Standard" : tier === "standard" ? "Plus" : "Pro";
      const replacements = tier === "basico" ? 1 : tier === "standard" ? 2 : null;
      return {
        id: `operations-${tier}`,
        name: `AkiBusiness ${name}`,
        label: tier === "basico"
          ? (es ? "Operaciones" : "Operations")
          : tier === "standard"
            ? (es ? "Más capacidad" : "More capacity")
            : (es ? "Operaciones avanzadas" : "Advanced operations"),
        description: tier === "pro"
          ? (es ? "Todas las herramientas operativas para tu ubicación." : "Every operating tool for your location.")
          : tier === "standard"
            ? (es ? "Más herramientas y capacidad para tu equipo." : "More tools and capacity for your team.")
            : (es ? "Herramientas esenciales para una ubicación." : "Essential operating tools for one location."),
        price: money(plan.amount),
        period: es ? "/ mes por ubicación" : "/ month per location",
        benefits: [
          es ? `${plan.tools} de 12 herramientas activas` : `${plan.tools} of 12 active tools`,
          replacements === null
            ? (es ? "Todas las herramientas, sin selección ni límite de sustituciones" : "All tools, no selection or replacement limit")
            : (es
              ? `${replacements} ${replacements === 1 ? "sustitución mensual" : "sustituciones mensuales"}`
              : `${replacements} monthly ${replacements === 1 ? "replacement" : "replacements"}`),
          es ? "Delegación inmediata al equipo de las herramientas activas" : "Instant staff delegation within active tools",
        ],
        featured: tier === "standard",
        action: <Link href={operations}>
          {es ? "Gestionar herramientas de operaciones" : "Manage operating tools"}
          <span aria-hidden="true">↗</span>
        </Link>,
      };
    });

  const offers: [
    MembershipOffer,
    MembershipOffer,
    MembershipOffer,
    MembershipOffer,
    MembershipOffer,
  ] = [
    {
      id: "akihq-free",
      name: "AkiHQ",
      label: es ? "Gestión gratuita" : "Free management",
      description: es
        ? `Tu centro para gestionar gratis tu ficha de ${discoveryName}.`
        : `Your home for managing your free ${discoveryName} listing.`,
      price: es ? "Gratis" : "Free",
      benefits: es
        ? ["Fichas, ubicaciones y equipos", "Un centro de gestión gratuito", "Mejora solo cuando necesites operaciones"]
        : ["Listings, locations and teams", "One free management hub", "Upgrade only when you need operations"],
      action: <Link href={suiteHref("hq", locale)}>
        {es ? "Abrir AkiHQ gratis" : "Open free AkiHQ"}
        <span aria-hidden="true">↗</span>
      </Link>,
      actionNote: es ? "Siempre disponible" : "Always available",
    },
    {
      id: listingPlan,
      name: `${discoveryName} Listing Premium`,
      label: es ? "PARA AKIHQ · MÁS VISIBILIDAD" : "FOR AKIHQ · MORE VISIBILITY",
      description: es
        ? `Mejora tu presencia y accede a las herramientas Premium de ${discoveryName} para gestionar tu ficha desde AkiHQ.`
        : `Upgrade your presence and unlock the deluxe suite of ${discoveryName} listing tools in AkiHQ.`,
      price: money(akisuitePlans[listingPlan].monthlyCents),
      period: es ? "/ mes por ubicación" : "/ month per location",
      benefits: es
        ? ["Presencia Premium en tu ficha", "Más contenido y visibilidad", "Gestión de la ficha mejorada desde AkiHQ"]
        : ["Premium listing presence", "Enhanced media and visibility", "Manage your upgraded listing in AkiHQ"],
      action: planAction(listingPlan),
      actionNote: !listingReady
        ? (es ? "Activación pendiente" : "Activation pending")
        : (es ? "Acceso sujeto a verificación" : "Access subject to verification"),
    },
    ...operationsOffers,
  ] as [
    MembershipOffer,
    MembershipOffer,
    MembershipOffer,
    MembershipOffer,
    MembershipOffer,
  ];

  return (
    <section className={styles.root} aria-label={es ? "Membresías AkiSuite" : "AkiSuite memberships"}>
      <AkiSuiteMembershipStudio
        theme="orange"
        locale={locale}
        headingLevel={2}
        eyebrow="AKIPASA / AKISUITE"
        title={es ? "Gestiona gratis. Elige tus herramientas." : "Manage for free. Choose your tools."}
        description={es
          ? "AkiHQ es tu centro gratuito. Premium mejora tu ficha de AkiPasa; AkiBusiness ofrece herramientas operativas de pago por ubicación."
          : "AkiHQ is your free hub. AkiPasa Premium upgrades your listing; AkiBusiness adds separately paid operating tools per location."}
        beforeOffers={<>
          {workspaces.length > 1 && (
            <label className={styles.workspaceChoice}>
              {es ? "Ubicación de operaciones" : "Operating location"}
              <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
                <option value="">{es ? "Elegir ubicación" : "Choose a location"}</option>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
          )}
          {accessUnavailable && (
            <p role="status" className={styles.footnote}>
              {es
                ? "No pudimos verificar tu acceso actual. Revisa tu cuenta antes de cambiar suscripciones."
                : "We couldn't verify your current access. Review your account before changing subscriptions."}{" "}
              <Link href={`/${locale}/account/subscription`}>
                {es ? "Reintentar acceso" : "Retry account access"}
              </Link>
            </p>
          )}
        </>}
        offers={offers}
        afterOffers={origin === "akipasa" && personalPremiumUnlocked ? (
          <div className={styles.personalPromo} id="akipasa_premium">
            <div>
              <strong>{es ? "Premium personal de AkiPasa" : "AkiPasa Personal Premium"}</strong>
              <p>{es
                ? "Ventajas personales para descubrir lugares. Es distinto de las mejoras del listado y de las herramientas de negocio."
                : "Personal discovery benefits, separate from listing upgrades and business tools."}</p>
              <span>{money(akisuitePlans.akipasa_premium.monthlyCents)} / {es ? "mes" : "month"}</span>
            </div>
            <div className={styles.personalAction}>{planAction("akipasa_premium")}</div>
          </div>
        ) : undefined}
        footnotes={<>
          <p>{es
            ? "AkiHQ es gratis. Las mejoras Premium de ficha y las herramientas operativas AkiBusiness son suscripciones independientes; Premium no incluye las doce herramientas de AkiBusiness."
            : "AkiHQ is free. Listing Premium and AkiBusiness operating tools are separate subscriptions; listing Premium does not unlock all twelve AkiBusiness tools."}</p>
          <p>{es
            ? "Los cambios de herramientas guardados se aplican en el siguiente ciclo mensual; puedes delegar herramientas activas al instante. Los impuestos y el importe final se confirman antes del pago."
            : "Saved toolbox changes activate at the next monthly rotation; active tools can be delegated instantly. Final prices and taxes are confirmed before payment."}</p>
        </>}
      />
    </section>
  );
}
