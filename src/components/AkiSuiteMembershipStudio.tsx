import type { ReactNode } from "react";
import Image from "next/image";
import styles from "./AkiSuiteMembershipStudio.module.css";

/**
 * Canonical AkiSuite membership presentation contract (v2).
 * Keep this module and its stylesheet identical in AkiPasa, AkiDuermo and
 * AkiCoches. Product adapters supply ONLY copy, prices, links and access state.
 * Branding belongs to two GROUP HEADERS, never to individual offer cards.
 */
export type MembershipTheme = "orange" | "mint" | "coral";

export type MembershipOffer = {
  id: string;
  name: string;
  label: string;
  description: string;
  price: string;
  period?: string;
  benefits: readonly string[];
  action: ReactNode;
  actionNote?: string;
  featured?: boolean;
};

type MembershipStudioProps = {
  theme: MembershipTheme;
  eyebrow: string;
  title: string;
  description: string;
  locale: "en" | "es";
  headingLevel?: 1 | 2;
  offers: readonly [
    MembershipOffer,
    MembershipOffer,
    MembershipOffer,
    MembershipOffer,
    MembershipOffer,
  ];
  beforeOffers?: ReactNode;
  afterOffers?: ReactNode;
  footnotes?: ReactNode;
};

function OfferCard({ offer, locale }: { offer: MembershipOffer; locale: "en" | "es" }) {
  return (
    <article
      id={offer.id}
      className={styles.card}
      data-featured={offer.featured || undefined}
      data-offer={offer.id}
    >
      <div className={styles.cardType}>{offer.label}{offer.featured && <span className={styles.recommended}>{locale === "es" ? "8 herramientas" : "8 tools"}</span>}</div>
      <h3>{offer.name}</h3>
      <p className={styles.description}>{offer.description}</p>
      <div className={styles.price}>
        <strong>{offer.price}</strong>
        {offer.period && <span>{offer.period}</span>}
      </div>
      <ul className={styles.features}>
        {offer.benefits.map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>
      <div className={styles.action}>
        {offer.action}
        {offer.actionNote && <small>{offer.actionNote}</small>}
      </div>
    </article>
  );
}

export function AkiSuiteMembershipStudio({
  theme,
  eyebrow,
  title,
  description,
  locale,
  headingLevel = 1,
  offers,
  beforeOffers,
  afterOffers,
  footnotes,
}: MembershipStudioProps) {
  const headingId = "akisuite-catalogue-title";
  const heading = headingLevel === 1
    ? <h1 id={headingId}>{title}</h1>
    : <h2 id={headingId}>{title}</h2>;

  return (
    <section className={styles.studio} data-theme={theme} aria-labelledby={headingId}>
      <header className={styles.intro}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        {heading}
        <p>{description}</p>
      </header>
      {beforeOffers}
      <div
        className={styles.scroller}
        role="region"
        aria-label={locale === "es" ? "Comparar las cinco membresías" : "Compare five membership plans"}
        tabIndex={0}
      >
        <div className={styles.track}>
          <div className={styles.hqGroup} aria-label="AkiHQ">
            <div className={styles.groupBrand}>
              <Image src="/brand/hq-mark.svg" alt="" width={52} height={52} unoptimized />
              <span className={styles.hqWordmark}>Aki<span>HQ.</span></span>
            </div>
          </div>
          <div className={styles.businessGroup} aria-label="AkiBusiness">
            <div className={styles.groupBrand}>
              <Image src="/brand/business-mark.svg" alt="" width={52} height={52} unoptimized />
              <span className={styles.businessWordmark}>Aki<span>Business.</span></span>
            </div>
          </div>
          {offers.map((offer) => <OfferCard offer={offer} locale={locale} key={offer.id} />)}
        </div>
      </div>
      {afterOffers}
      {footnotes && <div className={styles.footnotes}>{footnotes}</div>}
    </section>
  );
}
