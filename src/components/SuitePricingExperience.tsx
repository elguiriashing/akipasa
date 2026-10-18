"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./SuitePricingExperience.module.css";

export type DiscoveryProduct = "akipasa" | "akiduermo" | "akicoches" | "akihq";
type Locale = "en" | "es";
type Sector =
  | "hospitality"
  | "nightlife"
  | "accommodation"
  | "mobility"
  | "retail"
  | "services";
type Offer = "personal" | "listing" | "standard" | "pro" | "enterprise";

const sectors: {
  id: Sector;
  en: string;
  es: string;
  focus: { en: string; es: string };
}[] = [
  {
    id: "hospitality",
    en: "Restaurants & bars",
    es: "Restaurantes y bares",
    focus: {
      en: "Orders, shifts and guest relationships",
      es: "Pedidos, turnos y relación con clientes",
    },
  },
  {
    id: "nightlife",
    en: "Events & nightlife",
    es: "Eventos y ocio nocturno",
    focus: {
      en: "Events, teams and customer engagement",
      es: "Eventos, equipos y fidelización",
    },
  },
  {
    id: "accommodation",
    en: "Accommodation",
    es: "Alojamientos",
    focus: {
      en: "Reservations, operations and reporting",
      es: "Reservas, operaciones e informes",
    },
  },
  {
    id: "mobility",
    en: "Car rental",
    es: "Alquiler de coches",
    focus: {
      en: "Fleet workflows, teams and customers",
      es: "Flotas, equipos y clientes",
    },
  },
  {
    id: "retail",
    en: "Shops & retail",
    es: "Tiendas y comercios",
    focus: {
      en: "Inventory, sales and customer records",
      es: "Inventario, ventas y clientes",
    },
  },
  {
    id: "services",
    en: "Services & studios",
    es: "Servicios y estudios",
    focus: {
      en: "Bookings, tasks and client relationships",
      es: "Reservas, tareas y relación con clientes",
    },
  },
];

const products = {
  akipasa: {
    name: "AkiPasa",
    theme: "orange",
    logo: "/pwa/akipasa-192.png",
    en: {
      eyebrow: "PLACES. PEOPLE. POSSIBILITIES.",
      title: "More of the places you love.",
      intro:
        "Give your favourite discoveries a little extra. Give your business the tools to get discovered.",
    },
    es: {
      eyebrow: "LUGARES. GENTE. POSIBILIDADES.",
      title: "Más de los lugares que te encantan.",
      intro:
        "Más ventajas para descubrir lugares. Más herramientas para que descubran tu negocio.",
    },
    personalEn: [
      "Extra rewards for discovery",
      "Member-only benefits",
      "More ways to plan and save",
    ],
    personalEs: [
      "Más recompensas al descubrir",
      "Ventajas exclusivas",
      "Más formas de guardar y planificar",
    ],
    listingEn: [
      "Premium venue presence",
      "Enhanced media and presentation",
      "More tools for events and visibility",
    ],
    listingEs: [
      "Presencia Premium del local",
      "Presentación y fotos ampliadas",
      "Más herramientas para eventos y visibilidad",
    ],
  },
  akiduermo: {
    name: "AkiDuermo",
    theme: "mint",
    logo: "/brand/duermo-icon.png",
    en: {
      eyebrow: "GOOD NIGHTS. BETTER TRIPS.",
      title: "A better stay starts here.",
      intro:
        "Find your next favourite stay, or give your property a stronger presence.",
    },
    es: {
      eyebrow: "BUENAS NOCHES. MEJORES VIAJES.",
      title: "Tu próxima estancia empieza aquí.",
      intro: "Descubre dónde alojarte o haz que tu propiedad destaque.",
    },
    personalEn: [
      "Extra travel and saved-stay benefits",
      "Personal trip planning",
      "Premium discovery features",
    ],
    personalEs: [
      "Más ventajas para tus viajes",
      "Planificación personal",
      "Funciones Premium para descubrir",
    ],
    listingEn: [
      "Premium property presence",
      "Enhanced property media",
      "Additional insights for accommodation",
    ],
    listingEs: [
      "Presencia Premium de tu alojamiento",
      "Más opciones multimedia",
      "Información ampliada para alojamientos",
    ],
  },
  akicoches: {
    name: "AkiCoches",
    theme: "coral",
    logo: "/brand/conduzco-icon.svg",
    en: {
      eyebrow: "GO FURTHER.",
      title: "Your next journey, upgraded.",
      intro:
        "Explore with more confidence. Help your rental business stand out.",
    },
    es: {
      eyebrow: "LLEGA MÁS LEJOS.",
      title: "Mejora tu próximo viaje.",
      intro:
        "Descubre con más confianza. Haz que destaque tu empresa de alquiler.",
    },
    personalEn: [
      "Premium rental discovery experience",
      "More travel-planning convenience",
      "Personal member benefits",
    ],
    personalEs: [
      "Búsqueda de alquileres Premium",
      "Planificación más cómoda",
      "Ventajas para miembros",
    ],
    listingEn: [
      "Premium rental branch presence",
      "Enhanced fleet presentation",
      "More visibility and performance tools",
    ],
    listingEs: [
      "Presencia Premium de tu sucursal",
      "Presentación ampliada de la flota",
      "Más visibilidad y análisis",
    ],
  },
  akihq: {
    name: "AkiHQ",
    theme: "gold",
    logo: "/brand/hq-mark.svg",
    en: {
      eyebrow: "THE FREE BUSINESS HUB.",
      title: "Your business. One home.",
      intro:
        "Manage your AkiSuite presence for free. Add business tools only when you need them.",
    },
    es: {
      eyebrow: "TU CENTRO DE NEGOCIO GRATIS.",
      title: "Tu negocio. Un solo lugar.",
      intro:
        "Gestiona tu presencia en AkiSuite gratis. Añade herramientas cuando las necesites.",
    },
    personalEn: [],
    personalEs: [],
    listingEn: [
      "Premium listing tools on a discovery product",
      "Keep your existing AkiHQ management",
      "Business-focused upgrades",
    ],
    listingEs: [
      "Herramientas Premium para tu anuncio",
      "Mantén tu gestión gratuita en AkiHQ",
      "Mejoras para empresas",
    ],
  },
} as const;

const price: Record<
  Exclude<Offer, "enterprise">,
  { month: number; year: number }
> = {
  personal: { month: 199, year: 1910 },
  listing: { month: 1499, year: 14390 },
  standard: { month: 2499, year: 23990 },
  pro: { month: 6499, year: 62390 },
};
const standardFeatures = {
  en: [
    "Daily operations workspace",
    "Tasks, staff and business overview",
    "Structured management tools",
  ],
  es: [
    "Espacio para las operaciones diarias",
    "Tareas, equipo y visión general",
    "Herramientas de gestión organizadas",
  ],
};
const proFeatures = {
  en: [
    "Everything in Standard",
    "Point of sale and inventory",
    "Advanced operations and team workflows",
  ],
  es: [
    "Todo lo de Standard",
    "TPV e inventario",
    "Operaciones avanzadas y equipos",
  ],
};
const enterpriseFeatures = {
  en: [
    "Premium across AkiSuite discovery products",
    "Business listing upgrades",
    "Advanced AkiBusiness operations",
  ],
  es: [
    "Premium en los productos de AkiSuite",
    "Mejoras para anuncios de empresas",
    "Operaciones avanzadas de AkiBusiness",
  ],
};

function formatCents(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function SuitePricingExperience({
  locale,
  product,
  personalUnlocked,
  logo,
}: {
  locale: Locale;
  product: DiscoveryProduct;
  personalUnlocked: boolean;
  logo?: string;
}) {
  const es = locale === "es";
  const app = products[product];
  const [cycle, setCycle] = useState<"month" | "year">("month");
  const [sector, setSector] = useState<Sector>("hospitality");
  const selectedSector =
    sectors.find((item) => item.id === sector) || sectors[0];
  const productOffers =
    product === "akihq"
      ? (["listing", "standard", "pro", "enterprise"] as Offer[])
      : ([
          ...(personalUnlocked ? (["personal"] as Offer[]) : []),
          "listing",
          "standard",
          "pro",
          "enterprise",
        ] as Offer[]);
  const catalogue: Record<
    Offer,
    { name: string; label: string; benefits: readonly string[] }
  > = {
    personal: {
      name: `${app.name} Premium`,
      label: es ? "Para ti" : "For you",
      benefits: es ? app.personalEs : app.personalEn,
    },
    listing: {
      name:
        product === "akihq" ? "Premium for businesses" : `${app.name} Premium`,
      label: es ? "Para empresas" : "For businesses",
      benefits: es ? app.listingEs : app.listingEn,
    },
    standard: {
      name: "AkiBusiness Standard",
      label: es ? "Operaciones" : "Operations",
      benefits: standardFeatures[locale],
    },
    pro: {
      name: "AkiBusiness Pro",
      label: es ? "Operaciones avanzadas" : "Advanced operations",
      benefits: proFeatures[locale],
    },
    enterprise: {
      name: "AkiEnterprise",
      label: es ? "Toda la suite" : "Complete suite",
      benefits: enterpriseFeatures[locale],
    },
  };
  const offerEmail = (offer: Offer) =>
    `mailto:alex@akipasa.com?subject=${encodeURIComponent(`AkiSuite enquiry: ${product} / ${catalogue[offer].name} (${offer})`)}`;
  return (
    <main className={styles.root} data-theme={app.theme} data-product={product}>
      <div className={styles.orbit} aria-hidden="true" />
      <div className={styles.inner}>
        <header className={styles.topline}>
          <a
            className={styles.brand}
            href={
              product === "akipasa"
                ? `/${locale}`
                : product === "akihq"
                  ? `/${locale}/business`
                  : `/?lang=${locale}`
            }
          >
            <Image
              src={logo || app.logo}
              alt=""
              width={40}
              height={40}
              unoptimized
            />
            <span>
              {app.name}
              <small>MEMBERSHIP STUDIO</small>
            </span>
          </a>
          <nav
            className={styles.topActions}
            aria-label={es ? "Acciones de membresía" : "Membership navigation"}
          >
            <a
              href={`https://akipasa.com/${locale}/account/subscription?from=${product === "akihq" ? "akibusiness" : product}`}
            >
              {es ? "Mis suscripciones" : "My subscriptions"}{" "}
              <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </header>

        <section className={styles.hero} aria-labelledby="suite-pricing-title">
          <div className={styles.heroCopy}>
            <span className={styles.overline}>
              <span className={styles.spark} aria-hidden="true">
                ✦
              </span>
              {app[locale].eyebrow}
            </span>
            <h1 id="suite-pricing-title">{app[locale].title}</h1>
            <p>{app[locale].intro}</p>
            <div className={styles.heroFacts}>
              <span>
                <span aria-hidden="true">✓</span>{" "}
                {es ? "Tu cuenta AkiSuite" : "One AkiSuite account"}
              </span>
              <span>
                <span aria-hidden="true">✓</span>{" "}
                {es
                  ? "Pago seguro cuando se active"
                  : "Secure checkout on launch"}
              </span>
            </div>
          </div>
          <div className={styles.heroArtwork} aria-hidden="true">
            <div className={styles.artGlow} />
            <div className={styles.artMain}>
              <Image
                src={logo || app.logo}
                width={92}
                height={92}
                alt=""
                unoptimized
              />
              <span>{app.name}</span>
            </div>
            <span className={styles.orbitOne}>✦</span>
            <span className={styles.orbitTwo}>✧</span>
          </div>
        </section>

        <section
          className={styles.catalogue}
          aria-labelledby="suite-packages-heading"
        >
          <div className={styles.catalogueTop}>
            <div>
              <span className={styles.kicker}>
                AKISUITE / {es ? "MEMBRESÍAS" : "MEMBERSHIPS"}
              </span>
              <h2 id="suite-packages-heading">
                {es
                  ? "El plan adecuado para cada paso."
                  : "A plan for your next move."}
              </h2>
              <p>
                {es
                  ? "Solo las opciones relevantes para esta aplicación."
                  : "Only the plans that make sense for this product."}
              </p>
            </div>
            <fieldset className={styles.billingSwitch}>
              <legend>{es ? "Facturación" : "Billing"}</legend>
              <div>
                <button
                  type="button"
                  aria-pressed={cycle === "month"}
                  onClick={() => setCycle("month")}
                >
                  {es ? "Mensual" : "Monthly"}
                </button>
                <button
                  type="button"
                  aria-pressed={cycle === "year"}
                  onClick={() => setCycle("year")}
                >
                  {es ? "Anual" : "Yearly"} <small>−20%</small>
                </button>
              </div>
            </fieldset>
          </div>
          <div className={styles.sectorBar}>
            <div className={styles.sectorHeading}>
              <span className={styles.sectorIcon} aria-hidden="true">
                ✳
              </span>
              <span>
                <strong>
                  {es
                    ? "¿Qué tipo de negocio tienes?"
                    : "What kind of business do you run?"}
                </strong>
                <small>
                  {es
                    ? "Personalizamos los ejemplos de Standard y Pro."
                    : "See how Standard and Pro fit your work."}
                </small>
              </span>
            </div>
            <label className={styles.sectorSelect}>
              <span>{es ? "Tu sector" : "Your industry"}</span>
              <select
                value={sector}
                onChange={(event) => setSector(event.target.value as Sector)}
              >
                {sectors.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option[locale]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.cards} data-count={productOffers.length}>
            {productOffers.map((offer) => {
              const item = catalogue[offer];
              const enterprise = offer === "enterprise";
              const featured = offer === "pro";
              const amount = !enterprise ? price[offer][cycle] : undefined;
              const focus = offer === "standard" || offer === "pro";
              return (
                <article
                  id={`suite-${offer}`}
                  key={offer}
                  className={styles.card}
                  data-featured={featured || undefined}
                  data-offer={offer}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.planIcon} aria-hidden="true">
                      {offer === "personal"
                        ? "✦"
                        : offer === "listing"
                          ? "◈"
                          : offer === "standard"
                            ? "▦"
                            : offer === "pro"
                              ? "✳"
                              : "✧"}
                    </span>
                    <span className={styles.cardType}>{item.label}</span>
                    {featured && (
                      <span className={styles.recommended}>
                        {es ? "Más completo" : "Advanced tools"}
                      </span>
                    )}
                  </div>
                  <h3>{item.name}</h3>
                  {offer === "listing" && (
                    <p className={styles.planSub}>
                      {es
                        ? "Mejora el perfil de tu negocio en esta aplicación."
                        : "Upgrade your business presence in this app."}
                    </p>
                  )}
                  {offer === "personal" && (
                    <p className={styles.planSub}>
                      {es
                        ? "Ventajas personales desbloqueadas."
                        : "Personal member benefits unlocked."}
                    </p>
                  )}
                  {focus && (
                    <p className={styles.planSub}>
                      {selectedSector.focus[locale]}
                    </p>
                  )}
                  {enterprise && (
                    <p className={styles.planSub}>
                      {es
                        ? "Un paquete adaptado a toda tu empresa."
                        : "A bundled solution for your whole business."}
                    </p>
                  )}
                  <div className={styles.price}>
                    <strong>
                      {amount === undefined
                        ? es
                          ? "A medida"
                          : "Let's talk"
                        : formatCents(amount, locale)}
                    </strong>
                    {amount !== undefined && (
                      <span>
                        /
                        {cycle === "year"
                          ? es
                            ? "año"
                            : "year"
                          : es
                            ? "mes"
                            : "month"}
                      </span>
                    )}
                  </div>
                  <p className={styles.cycleInfo}>
                    {enterprise
                      ? es
                        ? "Solicita una propuesta con todos los productos."
                        : "Ask about the complete AkiSuite bundle."
                      : cycle === "year"
                        ? es
                          ? "Equivale al 20 % de descuento anual."
                          : "20% off compared with 12 monthly payments."
                        : es
                          ? "También disponible con pago anual."
                          : "Annual billing available at 20% off."}
                  </p>
                  <div className={styles.planDivider} />
                  <ul className={styles.features}>
                    {item.benefits.map((benefit) => (
                      <li key={benefit}>
                        <span aria-hidden="true">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                    {focus && (
                      <li className={styles.dynamicFeature}>
                        <span aria-hidden="true">✓</span>
                        <span>
                          {selectedSector[locale]}:{" "}
                          {selectedSector.focus[locale]}
                        </span>
                      </li>
                    )}
                  </ul>
                  <div className={styles.cardBottom}>
                    <a
                      href={offerEmail(offer)}
                      className={
                        featured ? styles.primaryAction : styles.secondaryAction
                      }
                    >
                      {enterprise
                        ? es
                          ? "Consultar Enterprise"
                          : "Enquire about Enterprise"
                        : es
                          ? "Consultar disponibilidad"
                          : "Enquire about this plan"}
                      <span aria-hidden="true">↗</span>
                    </a>
                    <small>
                      {enterprise
                        ? es
                          ? "Precio según el paquete elegido"
                          : "Bundle price on request"
                        : es
                          ? "Precio previsto · activación pendiente"
                          : "Staged pricing · checkout not yet live"}
                    </small>
                  </div>
                </article>
              );
            })}
          </div>
          {!personalUnlocked && product !== "akihq" && (
            <p className={styles.privateNote} role="status">
              <span aria-hidden="true">✦</span>{" "}
              {es
                ? "Las membresías Premium personales se lanzarán cuando alcancemos nuestro objetivo de adopción. Las opciones para negocios siguen visibles."
                : "Personal Premium will appear when we reach our adoption milestone. Business options are always visible."}
            </p>
          )}
          <p className={styles.footerNote}>
            {es
              ? "Los precios son los del catálogo de lanzamiento previsto, antes de impuestos aplicables. No se realiza ningún cobro desde esta pantalla. Las suscripciones anteriores siguen disponibles desde Mis suscripciones."
              : "These are staged launch prices before applicable taxes. This page does not collect payment. Existing subscriptions remain manageable under My subscriptions."}
          </p>
        </section>
      </div>
    </main>
  );
}
