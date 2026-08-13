import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin business application workflow", () => {
  it("exposes the queue in Admin and retains trial controls", () => {
    const layout = readFileSync("src/app/[locale]/admin/layout.tsx", "utf8");
    const overview = readFileSync("src/app/[locale]/admin/page.tsx", "utf8");
    const queue = readFileSync(
      "src/app/[locale]/admin/business-applications/page.tsx",
      "utf8",
    );
    const action = readFileSync(
      "src/app/[locale]/admin/business-applications/actions.ts",
      "utf8",
    );

    expect(layout).toContain("Business applications");
    expect(layout).toContain("pendingApplications");
    expect(overview).toContain("Open business applications");
    expect(queue).toContain("trial_1_month");
    expect(queue).toContain("trial_3_month");
    expect(queue).toContain("waived");
    expect(action).toContain('supabase.rpc("grant_staff_billing_access"');
    expect(action).toContain('supabase.rpc("review_business_application"');
  });
});
