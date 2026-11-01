import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const state = vi.hoisted(() => ({
  failed: "",
  stale: true,
  empty: false,
  rpc: vi.fn(),
  from: vi.fn(),
  require: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: state.require }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("404");
  },
}));
vi.mock("../src/app/[locale]/account/referrals/actions", () => ({
  captureReferral: vi.fn(),
  reportReferralCase: vi.fn(),
  joinReferralProgramme: vi.fn(),
  saveReferralLead: vi.fn(),
  updateReferralLead: vi.fn(),
}));
vi.mock("../src/app/[locale]/account/subscription/operations-actions", () => ({
  configureOperationsInitial: vi.fn(),
  startOperationsCheckout: vi.fn(),
}));
import Referrals from "../src/app/[locale]/account/referrals/page";
import Operations from "../src/app/[locale]/account/subscription/operations/page";
const dashboard = {
  codes: [],
  referrals: 7,
  conversions: 3,
  invoice_count: 3,
  available_programmes: [],
  recent_activity: [],
  held: true,
  payouts_enabled: false,
};
function result(name: string, data: unknown) {
  return {
    data: state.failed === name && !state.stale ? null : data,
    error:
      state.failed === name ? { message: "PRIVATE PROVIDER DETAILS" } : null,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.failed = "";
  state.stale = true;
  state.empty = false;
  vi.stubEnv("AKISUITE_REFERRALS_READY", "true");
  vi.stubEnv("AKISUITE_REFERRAL_REP_EVIDENCE_READY", "true");
  for (const name of ["CHECKOUT", "BILLING", "TAX"])
    vi.stubEnv(`AKIBUSINESS_OPERATIONS_${name}_READY`, "true");
  state.from.mockImplementation((table: string) => {
    const rows: Record<string, unknown> = {
      crm_workspaces: state.empty
        ? []
        : [{ id: "owned-location", name: "Known location" }],
      suite_referral_representatives: { state: "approved" },
      suite_referral_leads: [
        { id: "lead", business_name: "Known lead", stage: "registered" },
      ],
      suite_referral_cases: [
        {
          id: "case",
          case_type: "other",
          state: "open",
          resolution: "Known case",
        },
      ],
    };
    const q = {
      select: () => q,
      eq: () => q,
      in: () => q,
      order: () => q,
      limit: async () => result(table, rows[table]),
      maybeSingle: async () => result(table, rows[table]),
    };
    return q;
  });
  state.rpc.mockImplementation(async (name: string) =>
    result(
      name,
      name === "suite_referral_dashboard"
        ? dashboard
        : name === "crm_operations_initial_state"
          ? { initial_open: true, tools: ["crm"] }
          : null,
    ),
  );
  state.require.mockResolvedValue({
    user: { id: "owner" },
    supabase: { from: state.from, rpc: state.rpc },
  });
});
const render = async (
  page: typeof Referrals | typeof Operations,
  locale: "en" | "es",
  query: Record<string, string> = {},
) =>
  renderToStaticMarkup(
    await page({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve(query),
    }),
  );
for (const locale of ["en", "es"] as const) {
  describe(`${locale} truthful consumer read recovery`, () => {
    it.each([true, false])(
      "does not render referral mutations or stale metrics on dashboard failure (stale=%s)",
      async (stale) => {
        state.failed = "suite_referral_dashboard";
        state.stale = stale;
        const html = await render(Referrals, locale);
        expect(html).toContain('role="alert"');
        expect(html).toContain(`href="/${locale}/account/referrals"`);
        expect(html).not.toContain("<form");
        expect(html).not.toContain("<strong>7</strong>");
        expect(html).not.toContain("PRIVATE PROVIDER DETAILS");
      },
    );
    it("withholds stale representative editor without hiding healthy overview", async () => {
      state.failed = "suite_referral_representatives";
      const html = await render(Referrals, locale);
      expect(html).toContain("<strong>7</strong>");
      expect(html).toContain('name="kind"');
      expect(html).not.toContain('name="business"');
      expect(html).not.toContain("Known lead");
      expect(
        state.rpc.mock.calls.some(
          ([name]) => name === "suite_referral_representative_evidence",
        ),
      ).toBe(false);
      expect(html).toContain('role="alert"');
    });
    it.each(["suite_referral_cases", "suite_referral_leads"])(
      "suppresses only failed %s stale list",
      async (table) => {
        state.failed = table;
        const html = await render(Referrals, locale);
        expect(html).toContain("<strong>7</strong>");
        expect(html).toContain('name="business"');
        expect(html).not.toContain(
          table.endsWith("cases") ? "Known case" : "Known lead",
        );
        expect(html).toContain(
          table.endsWith("cases") ? "Known lead" : "Known case",
        );
        expect(html).toContain(`href="/${locale}/account/referrals"`);
      },
    );
    it("sanitizes retry navigation while retaining legitimate referral filters", async () => {
      state.failed = "suite_referral_dashboard";
      const html = await render(Referrals, locale, {
        ref: "ABCD1234",
        period: "365",
        result: "saved",
        next: "https://evil.invalid",
      });
      expect(html).toContain(
        `href="/${locale}/account/referrals?ref=ABCD1234&amp;period=365"`,
      );
      expect(html).not.toContain("evil.invalid");
    });
    it("sanitizes retry navigation while retaining the owned location and tier", async () => {
      state.failed = "crm_workspaces";
      const html = await render(Operations, locale, {
        workspace: "owned-location",
        tier: "pro",
        saved: "initial",
        next: "https://evil.invalid",
      });
      expect(html).toContain(
        `href="/${locale}/account/subscription/operations?workspace=owned-location&amp;tier=pro"`,
      );
      expect(html).not.toContain("evil.invalid");
    });
    it("keeps programme-off read-free and without mutations", async () => {
      vi.stubEnv("AKISUITE_REFERRALS_READY", "false");
      const html = await render(Referrals, locale);
      expect(html).not.toContain("<form");
      expect(html).not.toContain('role="alert"');
      expect(state.from).not.toHaveBeenCalled();
      expect(state.rpc).not.toHaveBeenCalled();
    });
    it.each([true, false])(
      "does not turn workspace failure into missing location or initial editor (stale=%s)",
      async (stale) => {
        state.failed = "crm_workspaces";
        state.stale = stale;
        const html = await render(Operations, locale);
        expect(html).toContain('role="alert"');
        expect(html).toContain(
          `href="/${locale}/account/subscription/operations"`,
        );
        expect(html).not.toContain("<form");
        expect(html).not.toContain("akihq.app");
        expect(html).not.toContain("PRIVATE PROVIDER DETAILS");
        expect(state.rpc).not.toHaveBeenCalled();
      },
    );
    it.each([
      "crm_operations_initial_state",
      "crm_operations_scheduled_change",
      "crm_operations_migration_status",
    ])("shows retry and disables checkout on %s error", async (name) => {
      state.failed = name;
      const html = await render(Operations, locale);
      expect(html).toContain('role="alert"');
      expect(html).toContain('disabled=""');
      expect(html).toContain(
        `href="/${locale}/account/subscription/operations"`,
      );
      expect(html).not.toContain("PRIVATE PROVIDER DETAILS");
      if (name === "crm_operations_initial_state")
        expect(html.match(/<form/g)).toHaveLength(1);
    });
    it("retains genuine empty location onboarding without false error", async () => {
      state.empty = true;
      const html = await render(Operations, locale);
      expect(html).toContain(`https://akihq.app/${locale}/business/locations`);
      expect(html).not.toContain('role="alert"');
      expect(state.rpc).not.toHaveBeenCalled();
    });

    it.each(["CHECKOUT", "BILLING", "TAX"])(
      "retains the %s readiness gate even with healthy reads",
      async (gate) => {
        vi.stubEnv(`AKIBUSINESS_OPERATIONS_${gate}_READY`, "false");
        const html = await render(Operations, locale);
        expect(
          html.match(/<button class="button primary"[^>]*>/)?.[0],
        ).toContain('disabled=""');
        expect(html).not.toContain('role="alert"');
      },
    );
    it("keeps healthy forms and all twelve tools", async () => {
      const html = await render(Operations, locale);
      expect(html).not.toContain('role="alert"');
      expect(
        html.match(/<button class="button primary"[^>]*>/)?.[0],
      ).not.toContain('disabled=""');
      expect(html.match(/<form/g)).toHaveLength(2);
      expect(html.match(/name="tools"/g)).toHaveLength(24);
    });
  });
}
