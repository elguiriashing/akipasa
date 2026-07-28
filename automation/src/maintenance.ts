import type { Bindings } from "./bindings";

function retentionBoundary(days: string, now: Date) {
  const parsed = Number(days);
  const safeDays = Number.isFinite(parsed) && parsed >= 1 ? parsed : 90;
  return new Date(now.getTime() - safeDays * 86_400_000).toISOString();
}

export async function runMaintenance(env: Bindings, now = new Date()) {
  const nonceExpiry = now.toISOString();
  const reportBoundary = retentionBoundary(env.REPORT_RETENTION_DAYS, now);
  const logBoundary = retentionBoundary(env.EXECUTION_LOG_RETENTION_DAYS, now);
  await env.AUTOMATION_DB.batch([
    env.AUTOMATION_DB.prepare(
      "DELETE FROM request_nonces WHERE expires_at < ?",
    ).bind(nonceExpiry),
    env.AUTOMATION_DB.prepare(
      "DELETE FROM generated_reports WHERE created_at < ?",
    ).bind(reportBoundary),
    env.AUTOMATION_DB.prepare(
      `DELETE FROM execution_logs
       WHERE started_at < ?
         AND id NOT IN (SELECT execution_id FROM generated_reports)`,
    ).bind(logBoundary),
  ]);
}
