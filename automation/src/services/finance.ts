import type { Bindings } from "../bindings";
import { AppError } from "../errors";

type CompanyMetricRow = {
  company_id: string;
  company_name: string;
  currency: string;
  cash_balance_minor: number;
  mrr_minor: number;
  as_of: string;
};

export type ExpenseSummaryRow = {
  merchant: string;
  category: string;
  amount_minor: number;
  incurred_at: string;
};

export type FinancialSnapshot = {
  companyId: string;
  companyName: string;
  currency: string;
  cashRemainingMinor: number;
  mrrMinor: number;
  revenueMinor: number;
  totalExpensesMinor: number;
  netMinor: number;
  monthlyBurnMinor: number;
  runwayWeeks: number | null;
  latestPurchases: ExpenseSummaryRow[];
  periodStart: string;
  asOf: string;
};

export async function loadFinancialSnapshot(
  env: Bindings,
  now = new Date(),
): Promise<FinancialSnapshot> {
  const company = await env.AUTOMATION_DB.prepare(
    `SELECT company_id, company_name, currency, cash_balance_minor, mrr_minor, as_of
     FROM company_metrics
     WHERE company_id = ?`,
  )
    .bind(env.DEFAULT_COMPANY_ID)
    .first<CompanyMetricRow>();

  if (!company || new Date(company.as_of).getUTCFullYear() < 2020) {
    throw new AppError(
      "metrics-not-configured",
      422,
      "Current company metrics have not been configured.",
      true,
    );
  }

  const periodStart = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const [revenue, expenses, latest] = await Promise.all([
    env.AUTOMATION_DB.prepare(
      `SELECT COALESCE(SUM(amount_minor), 0) AS total
       FROM revenue_entries
       WHERE company_id = ? AND received_at >= ? AND received_at <= ?`,
    )
      .bind(company.company_id, periodStart, now.toISOString())
      .first<{ total: number }>(),
    env.AUTOMATION_DB.prepare(
      `SELECT COALESCE(SUM(amount_minor), 0) AS total
       FROM expense_entries
       WHERE company_id = ? AND incurred_at >= ? AND incurred_at <= ?`,
    )
      .bind(company.company_id, periodStart, now.toISOString())
      .first<{ total: number }>(),
    env.AUTOMATION_DB.prepare(
      `SELECT merchant, category, amount_minor, incurred_at
       FROM expense_entries
       WHERE company_id = ?
       ORDER BY incurred_at DESC
       LIMIT 5`,
    )
      .bind(company.company_id)
      .all<ExpenseSummaryRow>(),
  ]);

  const revenueMinor = Number(revenue?.total || 0);
  const totalExpensesMinor = Number(expenses?.total || 0);
  const weeklyBurn = (totalExpensesMinor * 12) / 52;
  return {
    companyId: company.company_id,
    companyName: company.company_name,
    currency: company.currency,
    cashRemainingMinor: company.cash_balance_minor,
    mrrMinor: company.mrr_minor,
    revenueMinor,
    totalExpensesMinor,
    netMinor: revenueMinor - totalExpensesMinor,
    monthlyBurnMinor: totalExpensesMinor,
    runwayWeeks:
      weeklyBurn > 0
        ? Math.max(0, Math.floor(company.cash_balance_minor / weeklyBurn))
        : null,
    latestPurchases: latest.results,
    periodStart,
    asOf: now.toISOString(),
  };
}
