"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import styles from "./AkiSuiteAudienceStudio.module.css";

/** One identical audience-first presentation component in all three discovery apps.
 * Adapters own approved prices, checkout/readiness, product copy and navigation.
 * This component never grants an entitlement or initiates a payment.
 */
export type MembershipAudienceOffer = {
  id: string;
  label: string;
  name: string;
  description: string;
  price: string;
  period?: string;
  benefits: readonly string[];
  action: ReactNode;
  note?: string;
  highlighted?: boolean;
};
export type MembershipAudienceStudioProps = {
  locale: "en" | "es";
  theme: "orange" | "mint" | "coral";
  product: string;
  eyebrow: string;
  title: string;
  description: string;
  headingLevel?: 1 | 2;
  individual: readonly [MembershipAudienceOffer, MembershipAudienceOffer];
  business: readonly [MembershipAudienceOffer, MembershipAudienceOffer];
  beforeOffers?: ReactNode;
  footerNote?: ReactNode;
  businessSoftwareHref: string;
};

function Plan({ plan }: { plan: MembershipAudienceOffer }) {
  return (
    <article
      id={plan.id}
      data-offer={plan.id}
      data-highlighted={plan.highlighted || undefined}
      className={styles.card}
    >
      <p className={styles.cardLabel}>{plan.label}</p>
      <h3>{plan.name}</h3>
      <p className={styles.cardDescription}>{plan.description}</p>
      <div className={styles.price}>
        <strong>{plan.price}</strong>
        {plan.period && <span>{plan.period}</span>}
      </div>
      <ul className={styles.features}>
        {plan.benefits.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <div className={styles.action}>
        {plan.action}
        {plan.note && <small>{plan.note}</small>}
      </div>
    </article>
  );
}

export function AkiSuiteAudienceStudio({
  locale,
  theme,
  product,
  eyebrow,
  title,
  description,
  headingLevel = 1,
  individual,
  business,
  beforeOffers,
  footerNote,
  businessSoftwareHref,
}: MembershipAudienceStudioProps) {
  const es = locale === "es";
  const [audience, setAudience] = useState<"individual" | "business">(
    "individual",
  );
  const id = useId();
  const tabId = (key: "individual" | "business") => `${id}-${key}`;
  const heading =
    headingLevel === 1 ? (
      <h1 id={`${id}-heading`}>{title}</h1>
    ) : (
      <h2 id={`${id}-heading`}>{title}</h2>
    );
  const selected = audience === "individual" ? individual : business;
  return (
    <section
      className={styles.studio}
      data-theme={theme}
      data-product={product}
      aria-labelledby={`${id}-heading`}
    >
      <header className={styles.intro}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        {heading}
        <p>{description}</p>
      </header>
      <nav
        className={styles.audience}
        role="tablist"
        aria-label={es ? "Tipo de membresía" : "Membership type"}
      >
        {(["individual", "business"] as const).map((key) => (
          <button
            key={key}
            id={tabId(key)}
            type="button"
            role="tab"
            aria-controls={`${id}-offers`}
            aria-selected={audience === key}
            tabIndex={audience === key ? 0 : -1}
            onClick={() => setAudience(key)}
            onKeyDown={(event) => {
              if (
                event.key === "ArrowLeft" ||
                event.key === "ArrowRight" ||
                event.key === "Home" ||
                event.key === "End"
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "individual"
                    : event.key === "End"
                      ? "business"
                      : key === "individual"
                        ? "business"
                        : "individual";
                setAudience(next);
                document.getElementById(tabId(next))?.focus();
              }
            }}
          >
            {key === "individual"
              ? es
                ? "Particular"
                : "Individual"
              : es
                ? "Negocios"
                : "Business"}
          </button>
        ))}
      </nav>
      <div
        id={`${id}-offers`}
        role="tabpanel"
        aria-labelledby={tabId(audience)}
        className={styles.panel}
      >
        <p className={styles.explainer}>
          {audience === "individual"
            ? es
              ? `Para descubrir y disfrutar de ${product}. No necesitas tener un negocio.`
              : `For discovering and enjoying ${product}. No business account needed.`
            : es
              ? `Para propietarios que gestionan su presencia en ${product} mediante AkiHQ.`
              : `For owners managing their ${product} presence through AkiHQ.`}
        </p>
        {audience === "business" && beforeOffers}
        <div className={styles.grid}>
          {selected.map((plan) => (
            <Plan key={plan.id} plan={plan} />
          ))}
        </div>
        {audience === "business" && (
          <aside className={styles.software}>
            <Image
              src="/brand/business-mark.svg"
              alt=""
              width={36}
              height={36}
              unoptimized
            />
            <div>
              <strong>
                {es
                  ? "¿Necesitas software para gestionar tu negocio?"
                  : "Need software to run your business?"}
              </strong>
              <p>
                {es
                  ? "AkiBusiness Standard, Plus y Pro añaden herramientas de operaciones de pago por ubicación. No están incluidas en Premium."
                  : "AkiBusiness Standard, Plus and Pro add separate paid operating tools per location. They are not included in listing Premium."}
              </p>
            </div>
            <a href={businessSoftwareHref}>
              {es ? "Explorar AkiBusiness" : "Explore AkiBusiness"}{" "}
              <span aria-hidden="true">↗</span>
            </a>
          </aside>
        )}
      </div>
      {footerNote && <footer className={styles.footnotes}>{footerNote}</footer>}
    </section>
  );
}
