// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ access: vi.fn(), redirects: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: fixture.access }));
vi.mock("next/navigation", () => ({
  notFound() {
    throw Error("not-found");
  },
  redirect: (url: string) => {
    fixture.redirects(url);
    throw Error("redirect:" + url);
  },
}));
vi.mock("../src/app/[locale]/moderation/actions", () => ({
  moderateItem: vi.fn(),
  reviewRentalCompany: vi.fn(),
  setAutomaticModeration: vi.fn(),
}));
import Page from "../src/app/[locale]/staff/moderation/page";
import {
  parseStaffQueuePage,
  staffQueueForTarget,
  staffModerationHref,
  staffQueueStateLabel,
} from "../src/lib/staff-moderation-queue";
const tables = {
  venues: "venues",
  events: "events",
  offers: "offers",
  community: "event_submissions",
  rentals: "car_rental_companies",
} as const;
function backend({
  failed = false,
  count = 45 as number | null,
  role = "moderator",
} = {}) {
  const calls: Array<{
    table: string;
    select?: unknown[];
    orders: unknown[][];
    range?: number[];
  }> = [];
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === "staff_pending_venue_claims"
        ? [
            {
              id: "claim",
              status: "pending",
              created_at: "2026-10-29T10:00:00Z",
              venues: { name: "Claim venue" },
              total_count: 85,
            },
          ]
        : [],
    error: null,
  }));
  const client = {
    rpc,
    from(table: string) {
      const call = { table, orders: [] } as (typeof calls)[number];
      calls.push(call);
      const result = () =>
        table === "profiles"
          ? { data: { app_role: role }, error: null }
          : table === "automatic_moderation_settings"
            ? { data: { enabled: false }, error: null }
            : {
                data: failed
                  ? [{ id: "stale", name: "Stale failed row" }]
                  : Array.from(
                      {
                        length: Math.max(
                          0,
                          Math.min(20, (count ?? 45) - (call.range?.[0] || 0)),
                        ),
                      },
                      (_, i) => ({
                        id: `fixture-${(call.range?.[0] || 0) + i}`,
                        name: `Venue ${i}`,
                        title_en: `Event ${i}`,
                        title_es: `Evento ${i}`,
                        city: "Fixture",
                        address: "Fixture address",
                        status: "pending",
                        state: "pending",
                        created_at: "2026-10-29T10:00:00Z",
                        submitted_by: "fixture-account",
                      }),
                    ),
                error: failed ? { message: "PRIVATE SQL DETAIL" } : null,
                count: failed ? null : count,
              };
      const q = {
        select: (...args: unknown[]) => {
          call.select = args;
          return q;
        },
        eq: () => q,
        order: (...args: unknown[]) => {
          call.orders.push(args);
          return q;
        },
        range: (a: number, b: number) => {
          call.range = [a, b];
          return q;
        },
        maybeSingle: async () => result(),
        then: (resolve: (x: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return q;
    },
  };
  return { client, calls, rpc };
}
afterEach(cleanup);
beforeEach(() => fixture.redirects.mockReset());
describe("bounded role-gated staff moderation", () => {
  it.each(Object.entries(tables))(
    "bounds %s rows with exact count and deterministic tie order",
    async (queue, table) => {
      const b = backend();
      fixture.access.mockResolvedValue({
        supabase: b.client,
        user: { id: "staff" },
      });
      render(
        await Page({
          params: Promise.resolve({ locale: "en" }),
          searchParams: Promise.resolve({ queue, page: "2" }),
        }),
      );
      const query = b.calls.find((c) => c.table === table)!;
      expect(query.select?.[1]).toEqual({ count: "exact" });
      expect(query.orders).toEqual([
        ["created_at", { ascending: true }],
        ["id", { ascending: true }],
      ]);
      expect(query.range).toEqual([20, 39]);
      expect(
        Object.values(tables).filter((t) => b.calls.some((c) => c.table === t)),
      ).toEqual([table]);
      expect(screen.getByText("Page 2 · 45 pending")).toBeVisible();
      expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
        "href",
        `/en/staff/moderation?queue=${queue}&page=3`,
      );
      expect(
        document.querySelectorAll('input[name="queuePage"][value="2"]'),
      ).toHaveLength(21);
    },
  );
  it.each(["en", "es"])(
    "%s preserves same-page retry and never shows failed stale rows",
    async (locale) => {
      const b = backend({ failed: true });
      fixture.access.mockResolvedValue({
        supabase: b.client,
        user: { id: "staff" },
      });
      render(
        await Page({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ queue: "events", page: "3" }),
        }),
      );
      expect(screen.getByRole("alert")).toBeVisible();
      expect(
        screen.getByRole("link", {
          name: locale === "es" ? "Reintentar" : "Retry",
        }),
      ).toHaveAttribute(
        "href",
        `/${locale}/staff/moderation?queue=events&page=3`,
      );
      expect(screen.queryByText("Stale failed row")).toBeNull();
      expect(screen.queryByText("PRIVATE SQL DETAIL")).toBeNull();
      expect(
        screen.queryByRole("button", {
          name: locale === "es" ? "Aprobar" : "Approve",
        }),
      ).toBeNull();
    },
  );
  it("does not turn an unavailable total into zero", async () => {
    const b = backend({ count: null });
    fixture.access.mockResolvedValue({
      supabase: b.client,
      user: { id: "staff" },
    });
    render(
      await Page({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ queue: "events", page: "2" }),
      }),
    );
    expect(screen.getByText("Page 2 · Total unavailable")).toBeVisible();
    expect(screen.getByRole("link", { name: "Next" })).toBeVisible();
  });
  it("does not link back to itself at the bounded last supported page", async () => {
    const b = backend({ count: 999999 });
    fixture.access.mockResolvedValue({
      supabase: b.client,
      user: { id: "staff" },
    });
    render(
      await Page({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ queue: "events", page: "10001" }),
      }),
    );
    expect(b.calls.find((c) => c.table === "events")?.range).toEqual([
      200000, 200019,
    ]);
    expect(screen.queryByRole("link", { name: "Next" })).toBeNull();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/en/staff/moderation?queue=events&page=10000",
    );
  });
  it("returns an emptied last page to the nearest current page, preserving the outcome", async () => {
    const b = backend({ count: 20 });
    fixture.access.mockResolvedValue({
      supabase: b.client,
      user: { id: "staff" },
    });
    await expect(
      Page({
        params: Promise.resolve({ locale: "es" }),
        searchParams: Promise.resolve({
          queue: "offers",
          page: "2",
          updated: "decision",
        }),
      }),
    ).rejects.toThrow(
      "redirect:/es/staff/moderation?queue=offers&updated=decision",
    );
  });
  it.each(["consumer", "organiser"])(
    "denies %s before queue or settings reads",
    async (role) => {
      const b = backend({ role });
      fixture.access.mockResolvedValue({
        supabase: b.client,
        user: { id: "ordinary" },
      });
      await expect(
        Page({
          params: Promise.resolve({ locale: "en" }),
          searchParams: Promise.resolve({ queue: "events" }),
        }),
      ).rejects.toThrow("not-found");
      expect(b.calls.map((c) => c.table)).toEqual(["profiles"]);
      expect(b.rpc).not.toHaveBeenCalled();
    },
  );
  it("retains the existing claim RPC page size, offset and decision context", async () => {
    const b = backend();
    fixture.access.mockResolvedValue({
      supabase: b.client,
      user: { id: "staff" },
    });
    render(
      await Page({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ queue: "claims", page: "3" }),
      }),
    );
    expect(b.rpc).toHaveBeenCalledWith("staff_pending_venue_claims", {
      p_offset: 40,
    });
    expect(document.querySelector('[name="claimPage"]')).toHaveValue("3");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/en/staff/moderation?queue=claims&page=4",
    );
  });
});
it("bounds page and target context without accepting arbitrary redirects or prototype properties", () => {
  for (const x of ["-1", "1e4", "2.4", "https://evil.test", ["2"], undefined])
    expect(parseStaffQueuePage(x)).toBe(1);
  expect(parseStaffQueuePage("99999")).toBe(10001);
  expect(staffQueueForTarget("submission")).toBe("community");
  expect(staffQueueForTarget("__proto__")).toBe("venues");
  expect(staffModerationHref("en", "events", 2)).toBe(
    "/en/staff/moderation?queue=events&page=2",
  );
  expect(staffQueueStateLabel("pending", "es")).toBe("Pendiente de revisión");
  expect(staffQueueStateLabel("__proto__", "en")).toBe("Status unavailable");
});
