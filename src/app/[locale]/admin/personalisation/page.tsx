import { notFound } from "next/navigation";
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

function rate(numerator = 0, denominator = 0) {
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
  const metrics = (data || {}) as Metrics;
  const es = locale === "es";
  const successfulPlans =
    (metrics.saves || 0) +
    (metrics.going || 0) +
    (metrics.directions || 0) +
    (metrics.verified_check_ins || 0);
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
      {error ? (
        <p className="notice" role="alert">
          {es
            ? "Las métricas estarán disponibles después de aplicar la migración de personalización."
            : "Metrics will be available after the personalisation migration is applied."}
        </p>
      ) : null}
      <section className="metrics-grid">
        <ConsoleMetric
          label={es ? "Perfiles de gusto" : "Taste profiles"}
          value={metrics.preference_profiles || 0}
          detail={
            es
              ? "Cuentas y sesiones anónimas"
              : "Accounts and anonymous sessions"
          }
        />
        <ConsoleMetric
          label={es ? "Recomendaciones" : "Recommendations"}
          value={metrics.recommendation_requests || 0}
          detail={`${metrics.average_latency_ms || 0} ms ${es ? "de latencia media" : "average latency"}`}
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
              <dd>{metrics.impressions || 0}</dd>
            </div>
            <div>
              <dt>{es ? "Aperturas" : "Opens"}</dt>
              <dd>{metrics.opens || 0}</dd>
            </div>
            <div>
              <dt>{es ? "Guardados" : "Saves"}</dt>
              <dd>{metrics.saves || 0}</dd>
            </div>
            <div>
              <dt>{es ? "Voy" : "Going"}</dt>
              <dd>{metrics.going || 0}</dd>
            </div>
            <div>
              <dt>{es ? "Rutas" : "Directions"}</dt>
              <dd>{metrics.directions || 0}</dd>
            </div>
            <div>
              <dt>Check-ins</dt>
              <dd>{metrics.verified_check_ins || 0}</dd>
            </div>
          </dl>
        </article>
        <article className="panel console-card">
          <h2>{es ? "Calidad de señal" : "Signal quality"}</h2>
          <dl className="detail-facts">
            <div>
              <dt>{es ? "Eventos registrados" : "Events recorded"}</dt>
              <dd>{metrics.behaviour_events || 0}</dd>
            </div>
            <div>
              <dt>{es ? "Señales anónimas" : "Anonymous signals"}</dt>
              <dd>{metrics.anonymous_events || 0}</dd>
            </div>
            <div>
              <dt>{es ? "Saltos" : "Skips"}</dt>
              <dd>{metrics.skips || 0}</dd>
            </div>
            <div>
              <dt>{es ? "Salidas rápidas" : "Quick exits"}</dt>
              <dd>{metrics.quick_exits || 0}</dd>
            </div>
            <div>
              <dt>{es ? "No interesa" : "Not interested"}</dt>
              <dd>{metrics.not_interested || 0}</dd>
            </div>
            <div>
              <dt>Fallbacks</dt>
              <dd>{metrics.fallback_requests || 0}</dd>
            </div>
          </dl>
        </article>
      </section>
      <section className="panel console-card">
        <h2>{es ? "Ranking activo" : "Active ranking"}</h2>
        <p>
          <strong>
            {metrics.active_ranking?.key || "weighted_ranker"} v
            {metrics.active_ranking?.version || 1}
          </strong>
        </p>
        <p>
          {es ? "Exploración" : "Exploration"}:{" "}
          {Math.round(
            (metrics.active_ranking?.exploration_ratio || 0.15) * 100,
          )}
          % ·{" "}
          {es ? "Relevancia mínima patrocinada" : "Sponsored minimum relevance"}
          : {metrics.active_ranking?.sponsored_minimum_relevance ?? 0.25}
        </p>
      </section>
    </>
  );
}
