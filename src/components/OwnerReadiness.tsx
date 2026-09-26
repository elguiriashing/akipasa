import Link from "next/link";
import type { Locale } from "@/lib/config";
export function OwnerReadiness({
  locale,
  venueId,
  profileComplete,
  photos,
  upcomingEvents,
  loyaltyReady,
  results,
}: {
  locale: Locale;
  venueId: string;
  profileComplete: boolean;
  photos: number;
  upcomingEvents: number;
  loyaltyReady: boolean;
  results: Record<string, number> | null;
}) {
  const es = locale === "es";
  const tasks = [
    {
      done: profileComplete,
      section: "profile",
      label: es
        ? "Completa descripción y contacto"
        : "Complete description and contact details",
    },
    {
      done: photos > 0,
      section: "profile",
      label: es ? "Añade una foto de tu local" : "Add a photo of your venue",
    },
    {
      done: upcomingEvents > 0,
      section: "events",
      label: es ? "Publica tu próximo evento" : "Publish your next event",
    },
    {
      done: loyaltyReady,
      section: "rewards",
      label: es
        ? "Configura una tarjeta y su recompensa (opcional)"
        : "Set up a stamp card and its reward (optional)",
    },
  ];
  const metrics = [
    ["listing_views", es ? "Visitas a la ficha" : "Listing views"],
    ["event_views", es ? "Visitas a eventos" : "Event views"],
    ["directions", es ? "Clics en cómo llegar" : "Directions clicks"],
    [
      "website_clicks",
      es ? "Clics a web o reserva" : "Website / booking clicks",
    ],
    ["contact_clicks", es ? "Clics de contacto" : "Contact clicks"],
    ["accepted_checkins", es ? "Check-ins aceptados" : "Accepted check-ins"],
    ["rewards_redeemed", es ? "Premios canjeados" : "Rewards redeemed"],
  ] as const;
  return (
    <div className="stack">
      <article className="panel">
        <h2>
          {es
            ? "Prepara tu local para recibir visitas"
            : "Get your venue ready for visitors"}
        </h2>
        <ul>
          {tasks.map((t) => (
            <li key={t.section + t.label}>
              {t.done ? "✓ " : ""}
              <Link
                href={`/${locale}/business/venue/${venueId}?section=${t.section}`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
        {!upcomingEvents && (
          <p>
            {es
              ? "No tienes fechas futuras publicadas. Añade una fecha real para aparecer en el descubrimiento de eventos."
              : "You have no upcoming published dates. Add a real date to appear in event discovery."}
          </p>
        )}
      </article>
      <article className="panel">
        <h2>
          {es
            ? "Resultados de los últimos 30 días"
            : "Results over the last 30 days"}
        </h2>
        {results ? (
          <dl>
            {metrics.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{Number(results[key] || 0).toLocaleString(locale)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p role="status">
            {es
              ? "Los resultados no están disponibles ahora. Inténtalo más tarde."
              : "Results are currently unavailable. Try again later."}
          </p>
        )}
        <p className="muted">
          {es
            ? "Las visitas y clics reflejan interacciones registradas con permiso; no son clientes únicos ni ventas confirmadas. Los check-ins y canjes se cuentan por separado. No incluye impresiones de Google."
            : "Views and clicks reflect interactions recorded with permission; they are not unique customers or confirmed sales. Check-ins and redemptions are counted separately. Google impressions are not included."}
        </p>
      </article>
    </div>
  );
}
