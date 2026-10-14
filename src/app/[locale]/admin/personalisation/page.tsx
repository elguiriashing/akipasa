import { notFound } from "next/navigation";
import Link from "next/link";
import { ConsoleMetric } from "@/components/ConsoleChrome";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

type Metrics = {
  behaviour_events?: number;
  anonymous_events?: number;
  preference_profiles?: number;
  recommendation_requests?: number;
  average_latency_ms?: number;
  fallback_requests?: number;
  impressions?: number;
  opens?: number;
  skips?: number;
  quick_exits?: number;
  saves?: number;
  going?: number;
  directions?: number;
  verified_check_ins?: number;
  not_interested?: number;
  active_ranking?: {
    key?: string;
    version?: number;
    exploration_ratio?: number;
    sponsored_minimum_relevance?: number;
  } | null;
};

const numericMetricKeys = [
  "behaviour_events",
  "anonymous_events",
  "preference_profiles",
  "recommendation_requests",
  "average_latency_ms",
  "fallback_requests",
  "impressions",
  "opens",
  "skips",
  "quick_exits",
  "saves",
  "going",
  "directions",
  "verified_check_ins",
  "not_interested",
] as const;

type AvailableMetrics = Metrics &
  Record<(typeof numericMetricKeys)[number], number>;

function availableMetrics(value: unknown): value is AvailableMetrics {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    numericMetricKeys.every((key) =>
      Number.isFinite((value as Record<string, unknown>)[key]),
    )
  );
}

function rate(numerator: number, denominator: number) {
  return denominator
    ? `${((numerator / denominator) * 100).toFixed(1)}%`
    : "0.0%";
}

export default async function AdminPersonalisationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(
    locale,
    `/${locale}/admin/personalisation`,
  );
  const { data, error } = await supabase.rpc("personalisation_admin_metrics", {
    p_since: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  });
  const es = locale === "es";
  const metrics = !error && availableMetrics(data) ? data : null;
  if (!metrics) {
    return (
      <>
        <WorkspacePageHeader
          eyebrow={es ? "Últimos 30 días" : "Last 30 days"}
          title={
            es
              ? "Personalización y recomendaciones"
              : "Personalisation and recommendations"
          }
          description={
            es
              ? "Salud agregada del aprendizaje, ranking y descubrimiento. No muestra historiales individuales."
              : "Aggregate learning, ranking and discovery health. Individual histories are never shown."
          }
        />
        <p className="notice" role="alert">
          {es
            ? "No se pudieron cargar las métricas de personalización. No se muestran ceros hasta confirmar los datos."
            : "Personalisation metrics could not be loaded. Zero values are hidden until the data can be confirmed."}{" "}
          <Link href={`/${locale}/admin/personalisation`}>
            {es ? "Reintentar" : "Retry"}
          </Link>
        </p>
      </>
    );
  }
  const successfulPlans =
    metrics.saves +
    metrics.going +
    metrics.directions +
    metrics.verified_check_ins;
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Últimos 30 días" : "Last 30 days"}
        title={
          es
            ? "Personalización y recomendaciones"
            : "Personalisation and recommendations"
        }
        description={
          es
            ? "Salud agregada del aprendizaje, ranking y descubrimiento. No muestra historiales individuales."
            : "Aggregate learning, ranking and discovery health. Individual histories are never shown."
        }
      />
      <section className="metrics-grid">
        <ConsoleMetric
          label={es ? "Perfiles de gusto" : "Taste profiles"}
          value={metrics.preference_profiles}
          detail={
            es
              ? "Cuentas y sesiones anónimas"
              : "Accounts and anonymous sessions"
          }
        />
        <ConsoleMetric
          label={es ? "Recomendaciones" : "Recommendations"}
          value={metrics.recommendation_requests}
          detail={`${metrics.average_latency_ms} ms ${es ? "de latencia media" : "average latency"}`}
        />
        <ConsoleMetric
          label="CTR"
          value={rate(metrics.opens, metrics.impressions)}
          detail={es ? "Aperturas / impresiones" : "Opens / impressions"}
        />
        <ConsoleMetric
          label={es ? "Planes con éxito" : "Successful plans"}
          value={successfulPlans}
          detail={
            es
              ? "Guardados, Voy, rutas y check-ins"
              : "Saves, Going, directions and check-ins"
          }
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel console-card">
          <h2>{es ? "Embudo de descubrimiento" : "Discovery funnel"}</h2>
          <dl className="detail-facts">
            <div>
              <dt>{es ? "Impresiones" : "Impressions"}</dt>
              <dd>{metrics.impressions}</dd>
            </div>
            <div>
              <dt>{es ? "Aperturas" : "Opens"}</dt>
              <dd>{metrics.opens}</dd>
            </div>
            <div>
              <dt>{es ? "Guardados" : "Saves"}</dt>
              <dd>{metrics.saves}</dd>
            </div>
            <div>
              <dt>{es ? "Voy" : "Going"}</dt>
              <dd>{metrics.going}</dd>
            </div>
            <div>
              <dt>{es ? "Rutas" : "Directions"}</dt>
              <dd>{metrics.directions}</dd>
            </div>
            <div>
              <dt>Check-ins</dt>
              <dd>{metrics.verified_check_ins}</dd>
            </div>
          </dl>
        </article>
        <article className="panel console-card">
          <h2>{es ? "Calidad de señal" : "Signal quality"}</h2>
          <dl className="detail-facts">
            <div>
              <dt>{es ? "Eventos registrados" : "Events recorded"}</dt>
              <dd>{metrics.behaviour_events}</dd>
            </div>
            <div>
              <dt>{es ? "Señales anónimas" : "Anonymous signals"}</dt>
              <dd>{metrics.anonymous_events}</dd>
            </div>
            <div>
              <dt>{es ? "Saltos" : "Skips"}</dt>
              <dd>{metrics.skips}</dd>
            </div>
            <div>
              <dt>{es ? "Salidas rápidas" : "Quick exits"}</dt>
              <dd>{metrics.quick_exits}</dd>
            </div>
            <div>
              <dt>{es ? "No interesa" : "Not interested"}</dt>
              <dd>{metrics.not_interested}</dd>
            </div>
            <div>
              <dt>Fallbacks</dt>
              <dd>{metrics.fallback_requests}</dd>
            </div>
          </dl>
        </article>
      </section>
      <section className="panel console-card">
        <h2>{es ? "Ranking activo" : "Active ranking"}</h2>
        {metrics.active_ranking?.key &&
        Number.isFinite(metrics.active_ranking.version) &&
        Number.isFinite(metrics.active_ranking.exploration_ratio) &&
        Number.isFinite(metrics.active_ranking.sponsored_minimum_relevance) ? (
          <>
            <p>
              <strong>
                {metrics.active_ranking.key} v{metrics.active_ranking.version}
              </strong>
            </p>
            <p>
              {es ? "Exploración" : "Exploration"}:{" "}
              {Math.round(metrics.active_ranking.exploration_ratio! * 100)}% ·{" "}
              {es
                ? "Relevancia mínima patrocinada"
                : "Sponsored minimum relevance"}
              : {metrics.active_ranking.sponsored_minimum_relevance}
            </p>
          </>
        ) : (
          <p>
            {metrics.active_ranking === null
              ? es
                ? "No hay una configuración de ranking activa."
                : "No active ranking configuration."
              : es
                ? "Los datos del ranking no están disponibles."
                : "Ranking data is unavailable."}
          </p>
        )}
      </section>
    </>
  );
}
