import type { Locale } from "./config";
import { reportSchema } from "./moderation";

export type CommunityView = "suggest" | "report" | "suggestions" | "reports";

const reportTargetSchema = reportSchema.pick({
  targetType: true,
  targetId: true,
});

export function parseCommunityReportTarget(target: unknown) {
  if (typeof target !== "string") return null;
  const [targetType, targetId, extra] = target.split(":");
  if (extra !== undefined) return null;
  const parsed = reportTargetSchema.safeParse({ targetType, targetId });
  return parsed.success ? parsed.data : null;
}

export function communityWorkflowPath(
  locale: Locale,
  view: CommunityView,
  options: {
    target?: unknown;
    targetQuery?: unknown;
    error?: string;
    created?: string;
  } = {},
) {
  const query = new URLSearchParams({ view });
  if (view === "report" && parseCommunityReportTarget(options.target)) {
    query.set("target", String(options.target));
  }
  if (
    view === "report" &&
    typeof options.targetQuery === "string" &&
    options.targetQuery.trim()
  ) {
    query.set("target_q", options.targetQuery.trim().slice(0, 80));
  }
  if (options.error) query.set("error", options.error);
  if (options.created) query.set("created", options.created);
  return `/${locale}/community?${query}`;
}
