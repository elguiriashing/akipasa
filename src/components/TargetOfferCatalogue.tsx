import Link from "next/link";
import type { Locale } from "../lib/config";
import { targetOffers, targetOfferBlockerCopy } from "../lib/target-offers";

const scopes = {
  account: {
    en: "One individual account, only in this product",
    es: "Una cuenta individual, solo en este producto",
  },
  venue: { en: "One AkiPasa listing", es: "Un anuncio de AkiPasa" },
  property: {
    en: "One accommodation property, regardless of room count",
    es: "Un alojamiento, independientemente del número de habitaciones",
  },
  rental_branch: {
    en: "One rental branch, regardless of vehicle count",
    es: "Una sucursal de alquiler, independientemente del número de vehículos",
  },
  workspace: {
    en: "One operating location; no public listing required",
    es: "Una ubicación operativa; no requiere anuncio público",
  },
  management: {
    en: "Free basic management for authorised owners and teams",
    es: "Gestión básica gratuita para propietarios y equipos autorizados",
  },
} as const;

export function TargetOfferCatalogue({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const price = new Intl.NumberFormat(es ? "es-ES" : "en-IE", {
    style: "currency",
    currency: "EUR",
  });
  return (
    <>
      <p>
        {es
          ? "Esta es la estructura prevista de productos. Las nuevas ofertas de pago todavía no están disponibles para contratar. Tus contratos y accesos actuales se mantienen."
          : "This is the planned product structure. New paid offers are not yet available to purchase. Your existing contracts and access are preserved."}
      </p>
      <p>
        {es
          ? "Los importes mensuales son objetivos, no una oferta de compra. El tratamiento fiscal y los precios anuales están pendientes de validación."
          : "Monthly amounts are targets, not a purchase offer. Tax treatment and annual pricing await validation."}
      </p>
      <div className="target-offer-grid">
        {targetOffers.map((offer) => (
          <article key={offer.id} className="panel target-offer-card">
            <h2>{offer.name}</h2>
            <p className="target-offer-price">
              {offer.scope === "management"
                ? es
                  ? "Gratis"
                  : "Free"
                : `${es ? "Objetivo" : "Target"}: ${price.format(offer.monthlyTargetCents / 100)} / ${es ? "mes" : "month"}`}
            </p>
            <p>{scopes[offer.scope][locale]}</p>
            {offer.scope === "management" ? (
              <p>
                {es
                  ? "No es una suscripción ni concede permisos sobre negocios ajenos."
                  : "This is not a subscription and does not grant access to other businesses."}
              </p>
            ) : (
              <>
                <p>
                  <strong>
                    {es
                      ? "No disponible para contratar"
                      : "Not available to purchase"}
                  </strong>
                </p>
                <ul>
                  {offer.blockers.map((blocker) => (
                    <li key={blocker}>
                      {targetOfferBlockerCopy[blocker][locale]}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>
        ))}
      </div>
      <p>
        {es
          ? "Premium personal no concede acceso empresarial. Una mejora de anuncio solo afecta a ese anuncio. Los permisos del equipo y las prestaciones de pago se verifican por separado."
          : "Personal Premium does not grant business access. A listing upgrade affects only that listing. Team permissions and paid benefits are verified separately."}
      </p>
      <Link href={`/${locale}/account/subscription`}>
        {es
          ? "Ver mis contratos y facturación actuales"
          : "View my existing contracts and billing"}
      </Link>
    </>
  );
}
