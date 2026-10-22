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

  const listingPlan: "akibusiness_premium" | "akiduermo_premium" =
    origin === "akiduermo" ? "akiduermo_premium" : "akibusiness_premium";
  const info = listingCopy[listingPlan];
  const listingCurrent = included.has(listingPlan);
  const listingReady =
    checkoutReady &&
    (listingPlan !== "akiduermo_premium" || personalPremiumUnlocked);
  const listingBlocked =
    accessUnavailable || !listingReady || listingCurrent || !validWorkspace;

  const listingAction = accessUnavailable ? (
    <button type="button" disabled>
      {es ? "Acceso no disponible" : "Access unavailable"}
    </button>
  ) : listingCurrent ? (
    <Link href={`/${locale}/account/subscription`}>
      {es ? "Ver mi acceso" : "View my access"}
    </Link>
  ) : purchaseMode === "account" ? (
    <Link href={`/${locale}/account/subscription?from=${origin}`}>
      {es ? "Continuar en mi cuenta" : "Continue in my account"}
    </Link>
  ) : (
    <form action={startAkiSuiteCheckout}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="plan" value={listingPlan} />
      <input type="hidden" name="interval" value="month" />
      {validWorkspace && (
        <input type="hidden" name="workspaceId" value={validWorkspace} />
      )}
      <button type="submit" disabled={listingBlocked}>
        {!listingReady
          ? es
            ? "Disponible próximamente"
            : "Coming soon"
          : es
            ? "Revisar Premium"
            : "Review Premium"}
      </button>
    </form>
  );

  const offers: MembershipOffer[] = [
    {
      id: "akihq-free",
      name: "AkiHQ",
      label: es ? "Gestión gratuita" : "Free management",
      description: es
        ? "Organizaciones, ubicaciones, listados, titularidad y permisos esenciales."
        : "Organisations, locations, listings, ownership and essential permissions.",
      price: money(0),
      benefits: es
        ? ["Fichas y ubicaciones", "Equipo y permisos", "Siempre gratis"]
        : ["Listings and locations", "Team and permissions", "Always free"],
      action: (
        <Link href={suiteHref("hq", locale)}>
          {es ? "Abrir AkiHQ gratis" : "Open free AkiHQ"}
        </Link>
      ),
    },
    {
      id: listingPlan,
      name: info.label,
      label: es ? "Más visibilidad" : "More visibility",
      description: info[locale],
      price: money(akisuitePlans[listingPlan].monthlyCents),
      period: es ? "/ mes por listado" : "/ month per listing",
      benefits: es
        ? [
            "Presencia Premium",
            "Más contenido multimedia",
            "Ventajas del listado",
          ]
        : ["Premium visibility", "Enhanced listing media", "Listing benefits"],
      action: listingAction,
    },
    ...(
      Object.keys(OPERATION_PRICES) as Array<keyof typeof OPERATION_PRICES>
    ).map((tier): MembershipOffer => {
      const offer = OPERATION_PRICES[tier];
      const swaps = tier === "basico" ? 1 : tier === "standard" ? 2 : null;
      return {
        id: `operations-${tier}`,
        name:
          tier === "basico"
            ? "AkiBusiness Standard"
            : tier === "standard"
              ? "AkiBusiness Plus"
              : "AkiBusiness Pro",
        label:
          tier === "basico"
            ? es
              ? "Operaciones"
              : "Operations"
            : tier === "standard"
              ? es
                ? "Más capacidad"
                : "More capacity"
              : es
                ? "Operaciones avanzadas"
                : "Advanced operations",
        description:
          tier === "pro"
            ? es
              ? "Pro habilita las doce herramientas; no necesita selección."
              : "Pro enables all twelve tools and needs no selection."
            : es
              ? "Las selecciones guardadas se activan en la próxima rotación mensual."
              : "Saved selections activate at the next monthly rotation.",
        price: money(offer.amount),
        period: es ? "/ mes por ubicación" : "/ month per location",
        benefits: [
          es
            ? `${offer.tools} de 12 herramientas activas`
            : `${offer.tools} of 12 active tools`,
          swaps === null
            ? es
              ? "Todas las herramientas, sin selección ni límite de sustituciones"
              : "All tools, no selection or replacement limit"
            : es
              ? `${swaps} ${swaps === 1 ? "sustitución mensual" : "sustituciones mensuales"}`
              : `${swaps} monthly ${swaps === 1 ? "replacement" : "replacements"}`,
          es
            ? "Delegación al equipo inmediata dentro de las herramientas activas"
            : "Instant staff delegation within active tools",
        ],
        featured: tier === "standard",
        action: (
          <Link href={operations}>
            {es
              ? "Gestionar herramientas de operaciones"
              : "Manage operating tools"}
          </Link>
        ),
      };
    }),
  ];

  // AkiPasa personal premium is independently gated and never displaces the
  // first two HQ or last three AkiBusiness group columns.
  const showPersonal = origin === "akipasa" && personalPremiumUnlocked;
  const personalCurrent = included.has("akipasa_premium");
  const personalReady = checkoutReady && personalPremiumUnlocked;
  const personalAction = personalCurrent ? (
    <Link href={`/${locale}/account/subscription`}>
      {es ? "Ver mi acceso" : "View my access"}
    </Link>
  ) : purchaseMode === "account" ? (
    <Link href={`/${locale}/account/subscription?from=${origin}`}>
      {es ? "Continuar en mi cuenta" : "Continue in my account"}
    </Link>
  ) : (
    <form action={startAkiSuiteCheckout}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="plan" value="akipasa_premium" />
      <input type="hidden" name="interval" value="month" />
      <button
        type="submit"
        disabled={accessUnavailable || !personalReady || personalCurrent}
      >
        {!personalReady
          ? es
            ? "Disponible próximamente"
            : "Coming soon"
          : es
            ? "Revisar Premium"
            : "Review Premium"}
      </button>
    </form>
  );

  return (
    <AkiSuiteMembershipStudio
      theme="orange"
      locale={locale}
      headingLevel={2}
      eyebrow="AKIPASA / AKISUITE"
      title={
        es
          ? "Gestiona gratis. Elige tus herramientas."
          : "Manage for free. Choose your tools."
      }
      description={
        es
          ? "AkiHQ es tu centro gratuito. AkiBusiness es la suite de operaciones de pago por ubicación."
          : "AkiHQ is your free management hub. AkiBusiness is the paid operating suite per location."
      }
      offers={
        offers as [
          MembershipOffer,
          MembershipOffer,
          MembershipOffer,
          MembershipOffer,
          MembershipOffer,
        ]
      }
      beforeOffers={
        <>
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
        </>
      }
      afterOffers={
        showPersonal ? (
          <section
            className={styles.personal}
            id="akipasa_premium"
            aria-label={listingCopy.akipasa_premium.label}
          >
            <h3>{listingCopy.akipasa_premium.label}</h3>
            <p>{listingCopy.akipasa_premium[locale]}</p>
            <strong>
              {money(akisuitePlans.akipasa_premium.monthlyCents)} /{" "}
              {es ? "mes" : "month"}
            </strong>
            {personalAction}
          </section>
        ) : null
      }
      footnotes={
        <>
          <p>
            {es
              ? "Listing Premium y las herramientas operativas son suscripciones independientes."
              : "Listing Premium and operating tools are independent subscriptions."}
          </p>
          <p>
            {es
              ? "La titularidad de un listado es independiente de Premium. Los importes e impuestos se confirman antes del pago. Ninguna devolución del checkout activa funciones por sí sola."
              : "Listing ownership is independent of Premium. Amounts and taxes are confirmed before payment. Returning from checkout alone never activates features."}
          </p>
        </>
      }
    />
  );
}
