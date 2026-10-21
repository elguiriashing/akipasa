import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TOOL_KEYS } from "../src/lib/operations-billing/operations-contract.mjs";
import {
  OPERATION_TOOL_LABELS,
  operationToolLabel,
} from "../src/lib/operations-billing/tool-labels";
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("../src/app/[locale]/account/subscription/operations-actions", () => ({
  configureOperationsInitial: vi.fn(),
  startOperationsCheckout: vi.fn(),
}));
import Page from "../src/app/[locale]/account/subscription/operations/page";
import { requireUser } from "@/lib/auth";
async function render(
  locale: "en" | "es",
  migration: unknown = null,
  error: unknown = null,
  scheduled: unknown = null,
  workspace: string | null = "private-owner",
) {
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === "crm_operations_initial_state"
        ? {
            initial_open: true,
            tools: ["crm", "tasks", "calendar", "employees"],
          }
        : name === "crm_operations_migration_status"
          ? migration
          : name === "crm_operations_scheduled_change"
            ? scheduled
            : null,
    error: name === "crm_operations_migration_status" ? error : null,
  }));
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    order: () => query,
    limit: async () => ({
      data: [{ id: "private-owner", name: "Private location" }],
      error: null,
    }),
  };
  vi.mocked(requireUser).mockResolvedValue({
    user: { id: "owner" },
    supabase: { from: () => query, rpc },
  } as never);
  return renderToStaticMarkup(
    await Page({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve(workspace === null ? {} : { workspace }),
    }),
  );
}
describe("owner operations renewal status and canonical tool labels", () => {
  it.each(["en", "es"] as const)(
    "has all twelve canonical friendly labels in %s",
    async (locale) => {
      expect(Object.keys(OPERATION_TOOL_LABELS[locale]).sort()).toEqual(
        [...TOOL_KEYS].sort(),
      );
      const html = await render(locale);
      for (const tool of TOOL_KEYS) {
        expect(operationToolLabel(tool, locale)).toBeTruthy();
        expect(html).toContain(
          operationToolLabel(tool, locale).replaceAll("&", "&amp;"),
        );
        expect(html).toContain(`value="${tool}"`);
      }
    },
  );
  it.each(["en", "es"] as const)(
    "shows verified schedule without claiming current paid activation in %s",
    async (locale) => {
      const html = await render(locale, {
        tier: "basico",
        effective_at: "2027-09-29T23:43:00Z",
        state: "scheduled",
      });
      expect(html).toContain('data-migration-status="scheduled"');
      expect(html).toContain("Standard");
      expect(html).toContain(
        locale === "es"
          ? "solo tras confirmar el pago de renovación"
          : "only after confirmed renewal payment",
      );
      expect(html).not.toContain("sub_sched_");
    },
  );
  it.each([
    null,
    { state: "queued", tier: "basico" },
    { state: "prepared", tier: "basico" },
    { state: "blocked", tier: "basico" },
  ])("does not advertise unconfirmed migration %j", async (status) => {
    expect(await render("en", status)).not.toContain("data-migration-status");
  });
  it("preserves ordinary scheduled downgrade alongside migration status", async () => {
    const html = await render("en", null, null, {
      tier: "standard",
      effective_at: "2027-09-29T23:43:00Z",
      state: "scheduled",
    });
    expect(html).toContain("Confirmed change at renewal:");
    expect(html).toContain("standard");
    expect(html).not.toContain("data-migration-status");
  });
  it("shows the sole owned location without requiring a workspace query", async () => {
    const html = await render(
      "en",
      {
        tier: "basico",
        effective_at: "2027-09-29T23:43:00Z",
        state: "scheduled",
      },
      null,
      null,
      null,
    );
    expect(html).toContain('data-migration-status="scheduled"');
  });
  it("does not turn RPC failure into confirmed migration", async () => {
    expect(
      await render(
        "es",
        { state: "scheduled", tier: "basico" },
        { message: "unavailable" },
      ),
    ).not.toContain("data-migration-status");
  });
});
