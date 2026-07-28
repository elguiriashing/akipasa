import type { Bindings } from "../bindings";

export type DashboardData = {
  total: number;
  successful: number;
  successRate: number;
  averageLatencyMs: number;
  pendingJobs: number;
  lastReport: {
    created_at: string;
    report_type: string;
    telegram_message_id: string | null;
  } | null;
  executions: Array<{
    id: string;
    command: string;
    caller: string;
    started_at: string;
    duration_ms: number | null;
    success: number | null;
    error_code: string | null;
  }>;
};

export async function loadDashboardData(env: Bindings): Promise<DashboardData> {
  const [stats, latency, pending, lastReport, executions] = await Promise.all([
    env.AUTOMATION_DB.prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END), 0) AS successful
       FROM execution_logs
       WHERE completed_at IS NOT NULL`,
    ).first<{ total: number; successful: number }>(),
    env.AUTOMATION_DB.prepare(
      `SELECT COALESCE(AVG(duration_ms), 0) AS average
       FROM (
         SELECT duration_ms
         FROM execution_logs
         WHERE duration_ms IS NOT NULL
         ORDER BY started_at DESC
         LIMIT 50
       )`,
    ).first<{ average: number }>(),
    env.AUTOMATION_DB.prepare(
      `SELECT COUNT(*) AS total
       FROM automation_jobs
       WHERE state IN ('pending', 'running')`,
    ).first<{ total: number }>(),
    env.AUTOMATION_DB.prepare(
      `SELECT created_at, report_type, telegram_message_id
       FROM generated_reports
       ORDER BY created_at DESC
       LIMIT 1`,
    ).first<
      DashboardData["lastReport"] extends infer T ? NonNullable<T> : never
    >(),
    env.AUTOMATION_DB.prepare(
      `SELECT id, command, caller, started_at, duration_ms, success, error_code
       FROM execution_logs
       ORDER BY started_at DESC
       LIMIT 20`,
    ).all<DashboardData["executions"][number]>(),
  ]);

  const total = Number(stats?.total || 0);
  const successful = Number(stats?.successful || 0);
  return {
    total,
    successful,
    successRate: total ? Math.round((successful / total) * 1_000) / 10 : 100,
    averageLatencyMs: Math.round(Number(latency?.average || 0)),
    pendingJobs: Number(pending?.total || 0),
    lastReport,
    executions: executions.results,
  };
}
