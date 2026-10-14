// @vitest-environment jsdom
import React, { type ComponentProps, type ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  recommend: vi.fn(),
  nearby: vi.fn(),
  discover: vi.fn(),
  requireUser: vi.fn(),
  rpc: vi.fn(),
  review: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
  redirect: mocks.redirect,
}));
vi.mock("next/link", () => ({
  default: ({
    prefetch: _prefetch,
    ...props
  }: ComponentProps<"a"> & { prefetch?: boolean }) => {
    void _prefetch;
    return <a {...props} />;
  },
}));
vi.mock("@/lib/personalisation/server", () => ({
  recommendDiscovery: mocks.recommend,
}));
vi.mock("@/lib/unclaimed-venues", () => ({ nearbyVenuePage: mocks.nearby }));
vi.mock("@/lib/repository", () => ({
  repository: { discover: mocks.discover },
}));
vi.mock("@/lib/pals/server", () => ({ mapPreviewPortrait: async () => null }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/feature-flags", () => ({
  loadFeatureFlags: async () => ({ community_submissions: true }),
}));
vi.mock("@/lib/automatic-moderation", () => ({
  reviewPendingCatalogueItem: mocks.review,
}));
vi.mock("@/components/CityDiscovery", () => ({ CityDiscovery: () => null }));
vi.mock("@/components/DiscoveryIntentSignal", () => ({
  DiscoveryIntentSignal: () => null,
}));
vi.mock("@/components/ProductionMap", () => ({ ProductionMap: () => null }));
vi.mock("@/components/MapResultsDrawer", () => ({
  MapResultsDrawer: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/EventCard", () => ({ EventCard: () => null }));
vi.mock("@/components/SpainAddressAutocomplete", () => ({
  SpainAddressAutocomplete: () => null,
}));
vi.mock("@/components/WorkspaceShell", () => ({
  WorkspaceShell: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("@/components/community/CreatorDirectoryPage", () => ({
  communityCreatorItems: () => [],
}));

import DiscoverPage from "../src/app/[locale]/page";
import MapPage from "../src/app/[locale]/map/page";
import CommunityPage from "../src/app/[locale]/community/page";
import {
  submitCommunityEvent,
  submitReport,
} from "../src/app/[locale]/community/actions";

const targetId = "30000000-0000-4000-8000-000000000001";
const submissionId = "30000000-0000-4000-8000-000000000002";
const reportTarget = `venue:${targetId}`;
const reads: Record<string, unknown[]> = {
  events: [],
  venues: [{ id: targetId, name: "Report target venue" }],
  event_submissions: [],
  reports: [],
  categories: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.recommend.mockResolvedValue({ items: [], requestId: "inert-request" });
  mocks.nearby.mockResolvedValue({ rows: [], total: 0, page: 1 });
  mocks.discover.mockResolvedValue([]);
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "submit_community_event" ? submissionId : null,
    error: null,
  }));
  mocks.requireUser.mockResolvedValue({
    user: { id: "30000000-0000-4000-8000-000000000003" },
    supabase: {
      rpc: mocks.rpc,
      from: (table: string) => {
        const builder = {
          select: () => builder,
          eq: () => builder,
          order: () =>
            Promise.resolve({ data: reads[table] || [], error: null }),
        };
        return builder;
      },
    },
  });
});
afterEach(cleanup);

function pageProps(
  locale: "en" | "es",
  query: Record<string, string | string[] | undefined> = {},
) {
  return {
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(query),
  };
}

describe("public discovery date parity", () => {
  const civilDays = [
    ["2026-01-23", "2026-01-22T23:00:00.000Z", "2026-01-23T22:59:59.999Z", 24],
    ["2026-07-23", "2026-07-22T22:00:00.000Z", "2026-07-23T21:59:59.999Z", 24],
    ["2026-03-29", "2026-03-28T23:00:00.000Z", "2026-03-29T21:59:59.999Z", 23],
    ["2026-10-25", "2026-10-24T22:00:00.000Z", "2026-10-25T22:59:59.999Z", 25],
  ] as const;
  for (const locale of ["en", "es"] as const) {
    it.each(civilDays)(
      "uses the same Madrid bounds for %s in " + locale,
      async (day, from, to, hours) => {
        await DiscoverPage(pageProps(locale, { dateFrom: day, dateTo: day }));
        await MapPage(pageProps(locale, { dateFrom: day, dateTo: day }));
        const discovery = mocks.recommend.mock.calls[0][0].query;
        const map = mocks.recommend.mock.calls[1][0].query;
        expect(map.dateFrom).toEqual(discovery.dateFrom);
        expect(map.dateTo).toEqual(discovery.dateTo);
        expect(map.dateFrom.toISOString()).toBe(from);
        expect(map.dateTo.toISOString()).toBe(to);
        expect(
          (map.dateTo.getTime() - map.dateFrom.getTime() + 1) / 3_600_000,
        ).toBe(hours);
      },
    );
    it.each([
      ["2026-02-30"],
      ["2026-13-01"],
      ["not-a-date"],
      [["2026-01-23", "2026-07-23"]],
    ])("ignores impossible or malformed dates %s in " + locale, async (day) => {
      await DiscoverPage(pageProps(locale, { dateFrom: day, dateTo: day }));
      await MapPage(pageProps(locale, { dateFrom: day, dateTo: day }));
      for (const [request] of mocks.recommend.mock.calls) {
        expect(request.query.dateFrom).toBeUndefined();
        expect(request.query.dateTo).toBeUndefined();
      }
    });
  }
});

describe("truthful homepage venue status", () => {
  it.each(["en", "es"] as const)(
    "keeps claimed and unclaimed rows distinct in %s",
    async (locale) => {
      mocks.nearby.mockResolvedValue({
        total: 2,
        page: 1,
        rows: ["claimed", "unclaimed"].map((claimStatus) => ({
          id: claimStatus,
          name: `${claimStatus} business`,
          slug: `${claimStatus}-business`,
          address: "Synthetic address",
          distanceKm: 1,
          claimStatus,
        })),
      });
      render(await DiscoverPage(pageProps(locale)));
      const claimed = screen.getByText("claimed business").closest("a")!;
      const unclaimed = screen.getByText("unclaimed business").closest("a")!;
      expect(
        within(claimed).getByText(locale === "es" ? "Local" : "Venue"),
      ).toBeInTheDocument();
      expect(
        within(unclaimed).getByText(
          locale === "es" ? "No reclamado" : "Unclaimed",
        ),
      ).toBeInTheDocument();
      expect(claimed).toHaveAttribute(
        "href",
        `/${locale}/venues/claimed-business`,
      );
      expect(unclaimed).toHaveAttribute(
        "href",
        `/${locale}/venues/unclaimed-business`,
      );
      expect(mocks.nearby.mock.calls[0][0]).not.toHaveProperty(
        "unclaimedOnly",
        true,
      );
    },
  );
});

function reportForm(
  locale: string,
  target = reportTarget,
  details = "Incorrect opening information",
) {
  const form = new FormData();
  Object.entries({ locale, target, reason: "incorrect", details }).forEach(
    ([name, value]) => form.set(name, value),
  );
  return form;
}

function suggestionForm(locale: string) {
  const form = new FormData();
  Object.entries({
    locale,
    venueName: "Synthetic venue",
    venueAddress: "Synthetic address, Málaga",
    addressSelection: "selected",
    locality: "Málaga",
    province: "Málaga",
    postalCode: "29001",
    latitude: "36.72",
    longitude: "-4.42",
    addressProviderId: "synthetic-location",
    categoryId: targetId,
    title: "Synthetic community event",
    description: "A synthetic description used only by inert test adapters.",
    startsAt: "2026-11-02T18:00",
    endsAt: "2026-11-02T20:00",
    sourceUrl: "",
  }).forEach(([name, value]) => form.set(name, value));
  return form;
}

async function redirectedQuery(
  action: (form: FormData) => Promise<unknown>,
  form: FormData,
) {
  await expect(action(form)).rejects.toThrow("redirect:");
  return new URL(mocks.redirect.mock.lastCall![0], "https://akipasa.com");
}

describe("community workflow return paths", () => {
  for (const locale of ["en", "es"] as const) {
    it("shows report success in its history in " + locale, async () => {
      const destination = await redirectedQuery(
        submitReport,
        reportForm(locale),
      );
      expect(destination.pathname).toBe(`/${locale}/community`);
      expect(destination.searchParams.get("view")).toBe("reports");
      expect(destination.searchParams.get("created")).toBe("report");
      expect(mocks.rpc).toHaveBeenCalledWith("submit_report", {
        target_type: "venue",
        target_id: targetId,
        reason: "incorrect",
        details: "Incorrect opening information",
      });
      expect(mocks.requireUser).toHaveBeenCalledWith(
        locale,
        `/${locale}/community?view=report&target=${encodeURIComponent(reportTarget)}`,
      );
      render(
        await CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve(
            Object.fromEntries(destination.searchParams),
          ),
        }),
      );
      expect(
        screen.getByText(
          locale === "es"
            ? "Enviado correctamente para revision."
            : "Submitted successfully for review.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          locale === "es" ? "Problemas comunicados" : "Reported problems",
        ),
      ).toBeInTheDocument();
    });
    it(
      "shows suggestion success without dropping moderation in " + locale,
      async () => {
        const destination = await redirectedQuery(
          submitCommunityEvent,
          suggestionForm(locale),
        );
        expect(destination.searchParams.get("view")).toBe("suggestions");
        expect(destination.searchParams.get("created")).toBe("submission");
        expect(mocks.review).toHaveBeenCalledWith({
          targetType: "submission",
          targetId: submissionId,
          requesterId: "30000000-0000-4000-8000-000000000003",
        });
        expect(mocks.requireUser).toHaveBeenCalledWith(
          locale,
          `/${locale}/community?view=suggest`,
        );
        render(
          await CommunityPage({
            params: Promise.resolve({ locale }),
            searchParams: Promise.resolve(
              Object.fromEntries(destination.searchParams),
            ),
          }),
        );
        expect(
          screen.getByText(
            locale === "es"
              ? "Enviado correctamente para revision."
              : "Submitted successfully for review.",
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            locale === "es" ? "Tus eventos propuestos" : "Your proposed events",
          ),
        ).toBeInTheDocument();
      },
    );
    it(
      "retains a valid report target after validation failure in " + locale,
      async () => {
        const destination = await redirectedQuery(
          submitReport,
          reportForm(locale, reportTarget, "short"),
        );
        expect(destination.searchParams.get("view")).toBe("report");
        expect(destination.searchParams.get("target")).toBe(reportTarget);
        expect(destination.searchParams.get("error")).toBe("report");
        expect(mocks.rpc).not.toHaveBeenCalled();
        render(
          await CommunityPage({
            params: Promise.resolve({ locale }),
            searchParams: Promise.resolve(
              Object.fromEntries(destination.searchParams),
            ),
          }),
        );
        expect(
          screen.getByText(
            locale === "es"
              ? "No se pudo enviar. Revisa los datos o si ya mandaste el mismo aviso."
              : "Could not submit. Check the details or whether you already sent the same report.",
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByLabelText(locale === "es" ? "Elemento" : "Item"),
        ).toHaveValue(reportTarget);
      },
    );
    it.each(["rate limit exceeded", "unavailable"])(
      "shows RPC report errors on the form (%s) in " + locale,
      async (message) => {
        mocks.rpc.mockResolvedValue({ data: null, error: { message } });
        const destination = await redirectedQuery(
          submitReport,
          reportForm(locale),
        );
        expect(destination.searchParams.get("view")).toBe("report");
        expect(destination.searchParams.get("target")).toBe(reportTarget);
        expect(destination.searchParams.get("error")).toBe(
          message.includes("rate limit") ? "rate-limit" : "report",
        );
      },
    );
    it("returns invalid suggestions to their form in " + locale, async () => {
      const form = suggestionForm(locale);
      form.set("endsAt", "2026-11-02T17:00");
      const destination = await redirectedQuery(submitCommunityEvent, form);
      expect(destination.searchParams.get("view")).toBe("suggest");
      expect(destination.searchParams.get("error")).toBe("submission");
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
    it.each(["rate limit exceeded", "unavailable"])(
      "returns suggestion RPC errors to their form (%s) in " + locale,
      async (message) => {
        mocks.rpc.mockResolvedValue({ data: null, error: { message } });
        const destination = await redirectedQuery(
          submitCommunityEvent,
          suggestionForm(locale),
        );
        expect(destination.searchParams.get("view")).toBe("suggest");
        expect(destination.searchParams.get("error")).toBe(
          message.includes("rate limit") ? "rate-limit" : "submission",
        );
        expect(mocks.review).not.toHaveBeenCalled();
      },
    );
    it(
      "preserves the selected page and report target through the auth guard in " +
        locale,
      async () => {
        await CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ target: reportTarget }),
        });
        expect(mocks.requireUser).toHaveBeenCalledWith(
          locale,
          `/${locale}/community?view=report&target=${encodeURIComponent(reportTarget)}`,
        );
        await CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ view: "suggest" }),
        });
        expect(mocks.requireUser).toHaveBeenLastCalledWith(
          locale,
          `/${locale}/community?view=suggest`,
        );
      },
    );
    it.each([
      `venue:${targetId}:extra`,
      "https://example.invalid",
      "venue:not-a-uuid",
      `profile:${targetId}`,
    ])(
      "does not copy invalid report targets %s into return paths in " + locale,
      async (target) => {
        const destination = await redirectedQuery(
          submitReport,
          reportForm(locale, target),
        );
        expect(destination.searchParams.has("target")).toBe(false);
        if (!target.endsWith(":extra"))
          expect(mocks.rpc).not.toHaveBeenCalled();
        await CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ view: "report", target }),
        });
        expect(mocks.requireUser).toHaveBeenLastCalledWith(
          locale,
          `/${locale}/community?view=report`,
        );
      },
    );
    it(
      "retains default community creator navigation in " + locale,
      async () => {
        await expect(
          CommunityPage({
            params: Promise.resolve({ locale }),
            searchParams: Promise.resolve({}),
          }),
        ).rejects.toThrow(`redirect:/${locale}/community/creators`);
        expect(mocks.requireUser).not.toHaveBeenCalled();
      },
    );
  }
});
