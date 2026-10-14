import type { Locale } from "./config";
import { reportSchema } from "./moderation";

export type CommunityView = "suggest" | "report" | "suggestions" | "reports";

const reportTargetSchema = reportSchema.pick({
  targetType: true,
  targetId: true,
});

export function communityWorkflowPath(
  locale: Locale,
  view: CommunityView,
  options: { target?: unknown; error?: string; created?: string } = {},
) {
  const query = new URLSearchParams({ view });
  if (view === "report" && typeof options.target === "string") {
    const [targetType, targetId, extra] = options.target.split(":");
    if (
      extra === undefined &&
      reportTargetSchema.safeParse({ targetType, targetId }).success
    ) {
      query.set("target", options.target);
    }
  }
  if (options.error) query.set("error", options.error);
  if (options.created) query.set("created", options.created);
  return `/${locale}/community?${query}`;
}
