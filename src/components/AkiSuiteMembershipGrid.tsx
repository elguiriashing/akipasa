"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { startAkiSuiteCheckout } from "@/app/[locale]/account/subscription/akisuite-actions";
import {
  akiSuiteApp,
  effectiveAkiSuitePlans,
  type AkiSuiteApp,
  type AkiSuitePlan,
} from "@/lib/akisuite-catalogue";
import { suiteHref } from "@/lib/suite-navigation";
import {
  approvedPricing,
  monthlyPrice,
  premiumName,
} from "@/lib/approved-pricing";
import {
  AkiSuiteAudienceStudio,
  type MembershipAudienceOffer,
} from "./AkiSuiteAudienceStudio";
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
  const isStay = origin === "akiduermo";
  const discoveryName = isStay ? "AkiDuermo" : "AkiPasa";
  const noun = isStay
    ? es
      ? "alojamiento"
      : "property"
    : es
      ? "local"
      : "venue";
  const pricingProduct = isStay ? "akiduermo" : "akipasa";
  const prices = approvedPricing.discovery[pricingProduct];
  const [workspaceId, setWorkspaceId] = useState(
    workspaces.length === 1 ? workspaces[0].id : "",
  );
  const validWorkspace = /^[a-z0-9][a-z0-9_-]{2,79}$/.test(workspaceId)
    ? workspaceId
    : "";
  const included = effectiveAkiSuitePlans([
    ...activePlans,
    ...(workspacePlans[validWorkspace] || []),
  ]);

  function planAction(
    plan: "akipasa_premium" | "akibusiness_premium" | "akiduermo_premium",
  ) {
    const personal = plan === "akipasa_premium";
    const current = included.has(plan);
    const ready =
      checkoutReady &&
      (plan !== "akiduermo_premium" || personalPremiumUnlocked);
    const blocked =
      accessUnavailable || !ready || current || (!personal && !validWorkspace);
    if (accessUnavailable)
      return (
        <button type="button" disabled>
          {es ? "Acceso no disponible" : "Access unavailable"}
        </button>
      );
    if (current)
      return (
        <Link
          href={`/${locale}/account/subscription?audience=${personal ? "individual" : "business"}`}
        >
          {es ? "Ver mi acceso" : "View my access"}
        </Link>
      );
    if (purchaseMode === "account")
      return (
        <Link
          href={`/${locale}/account/subscription?from=${origin}&audience=${personal ? "individual" : "business"}`}
        >
          {personal
            ? es
              ? "Explorar mi Premium"
              : "Explore my Premium"
            : es
              ? "Mejorar mi ficha"
              : "Upgrade my listing"}
        </Link>
      );
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
            ? es
              ? "Próximamente"
              : "Coming soon"
            : es
              ? "Mejorar mi ficha"
              : "Upgrade my listing"}
        </button>
      </form>
    );
  }

  const individual: [MembershipAudienceOffer, MembershipAudienceOffer] = [
    {
      id: "personal-free",
      label: es ? "Para particulares" : "For individuals",
      name: `${discoveryName} Free`,
      description: es
        ? `Descubre y guarda tus favoritos en ${discoveryName} sin pagar una membresía.`
        : `Explore and save your favourites on ${discoveryName} without a membership fee.`,
      price: es ? "Gratis" : "Free",
      benefits: es
        ? ["Explora y descubre", "Guarda tus favoritos", "Sin compromiso"]
        : [
            "Explore and discover",
            "Save your favourites",
            "No subscription needed",
          ],
      action: (
        <Link href={isStay ? suiteHref("duermo", locale) : `/${locale}`}>
          {es ? "Empezar gratis" : "Explore for free"}{" "}
          <Icon
            name="arrow-right"
            size={16}
            style={{
              transform: "rotate(-45deg)",
              display: "inline-block",
              verticalAlign: "middle",
              flexShrink: 0,
            }}
          />
        </Link>
      ),
    },
    {
      id: "akipasa_premium",
      label: es ? "Premium personal" : "Personal Premium",
      name: premiumName(pricingProduct, "individual", locale),
      description: es
        ? "Ventajas personales para descubrir y disfrutar. No mejora un anuncio empresarial."
        : "Personal discovery benefits. This does not upgrade a business listing.",
      price: monthlyPrice(prices.individualCents, locale),
      period: es ? "/ mes" : "/ month",
      benefits: es
        ? [
            "Ventajas personales",
            "Independiente de AkiHQ",
            "No incluye herramientas operativas",
          ]
        : [
            "Personal member benefits",
            "Separate from AkiHQ",
            "No operating software included",
          ],
      highlighted: true,
      action:
        !isStay && personalPremiumUnlocked ? (
          planAction("akipasa_premium")
        ) : (
          <button type="button" disabled>
            {es ? "Aún no disponible" : "Not available yet"}
          </button>
        ),
      note: es
        ? "Se habilitará cuando esté disponible para nuevas altas."
        : "New purchases remain gated until launch.",
    },
  ];
  const business: [MembershipAudienceOffer, MembershipAudienceOffer] = [
    {
      id: "akihq-free",
      label: es ? "Gestión empresarial gratuita" : "Free business management",
      name: "AkiHQ",
      description: es
        ? `Tu centro para gestionar gratis tu ${noun} de ${discoveryName}.`
        : `Your home for managing your free ${discoveryName} ${noun} listing.`,
      price: es ? "Gratis" : "Free",
      benefits: es
        ? [
            "Gestiona tus fichas y ubicaciones",
            "Accesos del equipo",
            "Sin suscripción obligatoria",
          ]
        : [
            "Manage listings and locations",
            "Team permissions",
            "No required subscription",
          ],
      action: (
        <Link href={suiteHref("hq", locale)}>
          {es ? "Abrir AkiHQ gratis" : "Open free AkiHQ"}{" "}
          <Icon
            name="arrow-right"
            size={16}
            style={{
              transform: "rotate(-45deg)",
              display: "inline-block",
              verticalAlign: "middle",
              flexShrink: 0,
            }}
          />
        </Link>
      ),
      note: es ? "Siempre disponible" : "Always available",
    },
    {
      id: isStay ? "akiduermo-listing-premium" : "akibusiness_premium",
      label: es
        ? "Premium empresarial para AkiHQ"
        : "Business Premium for AkiHQ",
      name: premiumName(pricingProduct, "business", locale),
      description: es
        ? `Una ficha básica cuenta lo esencial. Da a tus clientes más motivos para elegir tu ${noun} con contenido ampliado y herramientas Premium en AkiHQ.`
        : `A basic listing covers the essentials. Give customers more reasons to choose your ${noun} with enhanced media and Premium listing tools in AkiHQ.`,
      price: monthlyPrice(prices.businessCents, locale),
      period: es ? "/ mes por ubicación" : "/ month per location",
      benefits: es
        ? [
            "Presencia Premium",
            "Multimedia y presentación ampliadas",
            "No incluye las 12 herramientas de AkiBusiness",
          ]
        : [
            "Premium listing visibility",
            "Enhanced media and presentation",
            "AkiBusiness tools sold separately",
          ],
      highlighted: true,
      action: isStay ? (
        <Link
          href={`${suiteHref("duermo", locale, { path: "/membership" })}&audience=business`}
        >
          {es ? "Explorar Premium" : "Explore listing Premium"}{" "}
          <Icon
            name="arrow-right"
            size={16}
            style={{
              transform: "rotate(-45deg)",
              display: "inline-block",
              verticalAlign: "middle",
              flexShrink: 0,
            }}
          />
        </Link>
      ) : (
        planAction("akibusiness_premium")
      ),
      note: isStay
        ? es
          ? "Precio orientativo; compra aún no activada"
          : "Staged price; checkout not yet live"
        : es
          ? "La activación requiere verificación"
          : "Activation requires verification",
    },
  ];
  const beforeOffers = (
    <>
      {workspaces.length > 1 && (
        <label className={styles.workspaceChoice}>
          {es ? "Ubicación de la empresa" : "Business location"}
          <select
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
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
        <p role="status" className={styles.footnote}>
          {es
            ? "No se pudo verificar tu acceso. Revisa tu cuenta antes de cambiar planes."
            : "We couldn't verify your access. Review your account before changing plans."}
        </p>
      )}
    </>
  );
  return (
    <section className={styles.root}>
      <AkiSuiteAudienceStudio
        locale={locale}
        theme="orange"
        product={discoveryName}
        headingLevel={2}
        eyebrow="AKIPASA / AKISUITE"
        title={
          es
            ? "Un plan para cada forma de disfrutar AkiPasa."
            : "Choose how you use AkiPasa."
        }
        description={
          es
            ? "Particular para descubrir lugares. Negocios para gestionar tu ficha desde AkiHQ. Las herramientas operativas son de AkiBusiness."
            : "Individual for discovery. Business for managing your listing through AkiHQ. Operations software lives in AkiBusiness."
        }
        individual={individual}
        business={business}
        beforeOffers={beforeOffers}
        businessSoftwareHref={suiteHref("business", locale)}
        footerNote={
          <p>
            {es
              ? "Premium personal, Premium de fichas y AkiBusiness son productos independientes. Los importes finales e impuestos se confirman antes del pago."
              : "Personal Premium, listing Premium and AkiBusiness are separate products. Final totals and taxes are confirmed before payment."}
          </p>
        }
      />
    </section>
  );
}
