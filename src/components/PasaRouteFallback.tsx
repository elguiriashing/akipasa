"use client";

import Link from "next/link";
import { useId } from "react";
import { Icon } from "./Icons";
import { PortalLogo } from "./PortalLogo";
import { BrandLogo } from "./BrandLogo";
import { suiteHref } from "@/lib/suite-navigation";
import {
  useRouteBoundary,
  type RouteBoundaryProduct,
} from "./RouteBoundaryContext";
import styles from "./PasaRouteFallback.module.css";

type Kind = "not-found" | "error" | "loading";
const products = {
  akipasa: { name: "AkiPasa", logo: "pasa" },
  akibusiness: { name: "AkiBusiness", logo: "business" },
  akiduermo: { name: "AkiDuermo", logo: "duermo" },
  akiconduzco: { name: "AkiCoches", logo: "coches" },
} as const;

export function fallbackHome(
  product: RouteBoundaryProduct,
  locale: "en" | "es",
) {
  if (product === "akibusiness") return suiteHref("business", locale);
  if (product === "akiduermo") return suiteHref("duermo", locale);
  if (product === "akiconduzco") return suiteHref("coches", locale);
  return `/${locale}`;
}

const copy = {
  en: {
    "not-found": {
      label: "Page unavailable",
      title: "This path ends here.",
      body: "We couldn't find this page. It may have moved, or it may no longer be available.",
    },
    error: {
      label: "Please try again",
      title: "Let's try that again.",
      body: "This page couldn't load right now. Try again, or return to the start.",
    },
    loading: {
      label: "One moment",
      title: "Getting your page ready.",
      body: "Please wait while the page loads.",
    },
    retry: "Try again",
    retrying: "Trying again…",
    home: "Back to the start",
    map: "Explore the map",
    loadingLabel: "Loading page",
    privacy: "Privacy",
    support: "Contact support",
  },
  es: {
    "not-found": {
      label: "Página no disponible",
      title: "Este camino termina aquí.",
      body: "No hemos encontrado esta página. Puede que se haya movido o que ya no esté disponible.",
    },
    error: {
      label: "Vuelve a intentarlo",
      title: "Vamos a intentarlo de nuevo.",
      body: "No se ha podido cargar esta página. Inténtalo de nuevo o vuelve al inicio.",
    },
    loading: {
      label: "Un momento",
      title: "Estamos preparando tu página.",
      body: "Espera mientras se carga la página.",
    },
    retry: "Reintentar",
    retrying: "Reintentando…",
    home: "Volver al inicio",
    map: "Explorar el mapa",
    loadingLabel: "Cargando página",
    privacy: "Privacidad",
    support: "Contactar con soporte",
  },
} as const;

/** Never accepts an Error or request URL: provider details and tokens stay private. */
export function PasaRouteFallback({
  kind,
  standalone = false,
  embedded = false,
  pending = false,
  reset,
}: {
  kind: Kind;
  standalone?: boolean;
  embedded?: boolean;
  pending?: boolean;
  reset?: () => void;
}) {
  const { locale, product } = useRouteBoundary();
  const text = copy[locale],
    content = text[kind],
    brand = products[product];
  const titleId = useId(),
    descriptionId = useId();
  const home = fallbackHome(product, locale);
  const Surface = embedded ? "section" : "main",
    Heading = embedded ? "h2" : "h1";
  return (
    <Surface
      className={[
        styles.surface,
        standalone ? styles.standalone : "",
        embedded ? styles.embedded : "",
      ].join(" ")}
      data-route-fallback={kind}
      data-boundary-product={product}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      {standalone && (
        <header className={styles.header}>
          <Link href={home} aria-label={brand.name} className={styles.brand}>
            {product === "akipasa" ? (
              <BrandLogo />
            ) : (
              <PortalLogo product={brand.logo} />
            )}
          </Link>
          <span className={styles.locale}>{locale.toUpperCase()}</span>
        </header>
      )}
      <section className={styles.card}>
        <div className={styles.art} aria-hidden="true">
          <span />
          <span />
          <Icon name={kind === "error" ? "shield" : "map"} size={54} />
        </div>
        <div className={styles.content}>
          <p className={styles.eyebrow}>
            {brand.name} · {content.label}
          </p>
          {kind === "not-found" && (
            <span className={styles.code} aria-hidden="true">
              404
            </span>
          )}
          <Heading id={titleId} className={styles.title}>
            {content.title}
          </Heading>
          <p id={descriptionId} className={styles.description}>
            {content.body}
          </p>
          {kind === "loading" ? (
            <div
              className={styles.loading}
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span className={styles.dots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>{text.loadingLabel}</span>
            </div>
          ) : (
            <div className={styles.actions}>
              {kind === "error" && reset && (
                <button
                  className={styles.primary}
                  type="button"
                  onClick={reset}
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? text.retrying : text.retry}
                  <Icon name="arrow-right" size={18} />
                </button>
              )}
              <Link
                className={
                  kind === "not-found" ? styles.primary : styles.secondary
                }
                href={home}
              >
                {text.home}
                {kind === "not-found" && <Icon name="arrow-right" size={18} />}
              </Link>
              {product === "akipasa" && (
                <Link className={styles.secondary} href={`/${locale}/map`}>
                  {text.map}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
      {standalone && kind !== "loading" && (
        <nav
          className={styles.footer}
          aria-label={
            locale === "es" ? "Ayuda y privacidad" : "Help and privacy"
          }
        >
          <a
            href={
              product === "akipasa"
                ? `/${locale}/privacy`
                : `https://akipasa.com/${locale}/privacy`
            }
          >
            {text.privacy}
          </a>
          <a href="mailto:support@akipasa.com">{text.support}</a>
        </nav>
      )}
    </Surface>
  );
}
