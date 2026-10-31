import React, { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { businessHomeReadFixture } from "./fixtures/business-home-read-state";
const state = vi.hoisted(() => ({
  fixture: null as ReturnType<typeof businessHomeReadFixture> | null,
  userAuth: vi.fn(),
  businessAuth: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireUser: async (...args: unknown[]) => {
    state.userAuth(...args);
    return state.fixture;
  },
}));
vi.mock("@/lib/entitlements", () => ({
  requireBusinessAccess: async (...args: unknown[]) => {
    state.businessAuth(...args);
    return state.fixture;
  },
}));
vi.mock("@/lib/feature-flags", () => ({
  loadFeatureFlags: async () => ({ promotion_requests: true }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("not-found");
  },
}));
vi.mock("../src/app/[locale]/business/actions", () => ({
  confirmRedemption: vi.fn(),
  createOfficialEvent: vi.fn(),
  createVenue: vi.fn(),
  deleteManagedVenue: vi.fn(),
  requestPromotion: vi.fn(),
  reuseEvent: vi.fn(),
  saveLoyaltyProgram: vi.fn(),
  submitVenueClaim: vi.fn(),
}));
import Page from "../src/app/[locale]/business/page";
import { BusinessEventCatalogue } from "../src/components/BusinessEventCatalogue";
import { BusinessEventComposer } from "../src/components/BusinessEventComposer";
import { BusinessHome } from "../src/components/BusinessHome";
import { BusinessGrowthOverview } from "../src/components/BusinessGrowthOverview";
import {
  confirmRedemption,
  createVenue,
  requestPromotion,
  saveLoyaltyProgram,
  submitVenueClaim,
} from "../src/app/[locale]/business/actions";
type Props = {
  children?: ReactNode;
  action?: unknown;
  href?: string;
  events?: number | null | unknown[];
  venues?: Array<{ events: number | null; interactions: number | null }>;
  "data-business-read-error"?: string;
};
function elements(node: ReactNode): React.ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  const element = node as React.ReactElement<Props>;
  return [element, ...elements(element.props.children)];
}
const forms = (tree: ReactNode, action: unknown) =>
  elements(tree).filter(
    (node) => node.type === "form" && node.props.action === action,
  );
const alerts = (tree: ReactNode) =>
  elements(tree).filter((node) => node.props["data-business-read-error"]);
async function page(
  locale: string,
  view: string,
  failure = "",
  options = {},
  query = {},
) {
  state.fixture = businessHomeReadFixture({ failure, ...options });
  return Page({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve({
      view,
      compose: "1",
      venueId: "11111111-1111-4111-8111-111111111111",
      injected: "discard",
      ...query,
    }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
});
describe.each(["en", "es"])(
  "%s business independent read boundaries",
  (locale) => {
    it("withholds programme creation on failed reads while retaining healthy redemptions", async () => {
      const tree = await page(locale, "loyalty", "loyalty_programs");
      expect(forms(tree, saveLoyaltyProgram)).toHaveLength(0);
      expect(forms(tree, confirmRedemption)).toHaveLength(1);
      expect(
        alerts(tree).map((n) => n.props["data-business-read-error"]),
      ).toContain("loyalty");
    });
    it("retains programme management when only redemption reads fail", async () => {
      const tree = await page(locale, "loyalty", "reward_redemptions");
      expect(forms(tree, saveLoyaltyProgram)).toHaveLength(1);
      expect(forms(tree, confirmRedemption)).toHaveLength(0);
      expect(alerts(tree)).toHaveLength(1);
    });
    it("does not present unknown membership as permission to create another venue", async () => {
      const tree = await page(locale, "venues", "venue_members");
      expect(forms(tree, createVenue)).toHaveLength(0);
      expect(alerts(tree)).toHaveLength(1);
    });
    it.each(["categories", "venue_media", "signed-media", "signed-media-item"])(
      "withholds dependent event composer on %s failure",
      async (failure) => {
        const tree = await page(locale, "events", failure);
        expect(
          elements(tree).filter((n) => n.type === BusinessEventComposer),
        ).toHaveLength(0);
        expect(alerts(tree).length).toBeGreaterThan(0);
      },
    );
    it("does not display a false empty event catalogue and preserves healthy catalogue on setup failure", async () => {
      const unknown = await page(
        locale,
        "events",
        "managed-events",
        {},
        { compose: "0" },
      );
      expect(
        elements(unknown).filter(
          (node) => node.type === BusinessEventCatalogue,
        ),
      ).toHaveLength(0);
      expect(
        elements(unknown).filter((node) => node.type === BusinessEventComposer),
      ).toHaveLength(1);
      const healthy = await page(
        locale,
        "events",
        "categories",
        {},
        { compose: "0" },
      );
      expect(
        elements(healthy).find((node) => node.type === BusinessEventCatalogue)!
          .props.events,
      ).toHaveLength(1);
      expect(
        elements(healthy).filter((node) => node.type === BusinessEventComposer),
      ).toHaveLength(0);
    });

    it("keeps failed event totals unknown without hiding healthy analytics or promotion history", async () => {
      const tree = await page(locale, "growth", "managed-events");
      const growth = elements(tree).find(
        (n) => n.type === BusinessGrowthOverview,
      )!;
      expect(growth.props.events).toBeNull();
      expect(growth.props.venues![0].events).toBeNull();
      expect(growth.props.venues![0].interactions).toBe(7);
      expect(forms(tree, requestPromotion)).toHaveLength(1);
    });
    it("hides failed promotion form while preserving healthy growth metrics", async () => {
      const tree = await page(locale, "growth", "promotion_requests");
      expect(forms(tree, requestPromotion)).toHaveLength(0);
      expect(
        elements(tree).find((n) => n.type === BusinessGrowthOverview)!.props
          .events,
      ).toBe(1);
    });
    it("hides failed claims history and duplicate submission without changing claims authorization", async () => {
      const tree = await page(locale, "claims", "venue_claims");
      expect(forms(tree, submitVenueClaim)).toHaveLength(0);
      expect(state.userAuth).toHaveBeenCalledOnce();
      expect(state.businessAuth).not.toHaveBeenCalled();
      expect(alerts(tree)).toHaveLength(1);
    });
    it.each(["profiles", "venues"])(
      "keeps known managed rows and ordinary composer usable when %s lookup is unavailable",
      async (failure) => {
        const home = await page(locale, "venues", failure, { staff: true });
        const props = elements(home).find((node) => node.type === BusinessHome)!
          .props as unknown as { readError: boolean; places: unknown[] };
        expect(props.readError).toBe(true);
        expect(props.places).toHaveLength(1);
        const events = await page(locale, "events", failure, { staff: true });
        expect(
          elements(events).filter(
            (node) => node.type === BusinessEventComposer,
          ),
        ).toHaveLength(1);
        expect(
          alerts(events).some(
            (node) => node.props["data-business-read-error"] === "editorial",
          ),
        ).toBe(true);
      },
    );

    it("fails closed for an errored privileged profile even if a stale administrator row accompanies it", async () => {
      const tree = await page(locale, "venues", "profiles-partial", {
        staff: true,
      });
      expect(state.fixture!.calls.some(([table]) => table === "venues")).toBe(
        false,
      );
      expect(
        alerts(tree).some(
          (node) => node.props["data-business-read-error"] === "editorial",
        ),
      ).toBe(true);
      const props = elements(tree).find((node) => node.type === BusinessHome)!
        .props as unknown as { readError: boolean; places: unknown[] };
      expect(props.readError).toBe(true);
      expect(props.places).toHaveLength(1);
    });

    it("keeps successful empty results editable and zero metrics known", async () => {
      const tree = await page(locale, "loyalty", "", { empty: true });
      expect(forms(tree, saveLoyaltyProgram)).toHaveLength(1);
      expect(alerts(tree)).toHaveLength(0);
      const growth = await page(locale, "growth", "", { empty: true });
      expect(
        elements(growth).find((n) => n.type === BusinessGrowthOverview)!.props
          .events,
      ).toBe(0);
    });
    it("retains only intended view/composer/venue context in localized retry links", async () => {
      const tree = await page(locale, "events", "categories");
      const notice = alerts(tree)[0];
      const link = elements(notice).find((n) => n.props.href)!;
      expect(link.props.href).toBe(
        `/${locale}/business?view=events&compose=1&venueId=11111111-1111-4111-8111-111111111111`,
      );
      expect(
        elements(notice)
          .flatMap((node) =>
            React.Children.toArray(node.props.children).filter(
              (child) => typeof child === "string",
            ),
          )
          .join(" "),
      ).not.toContain("Private database failure");
      expect(state.businessAuth).toHaveBeenCalledOnce();
      expect(state.fixture!.calls).toContainEqual([
        "venue_members",
        "eq",
        "profile_id",
        "fixture-manager",
      ]);
    });
  },
);
it("formats unavailable growth totals as unknown while preserving actual zero", () => {
  for (const locale of ["en", "es"] as const)
    for (const events of [null, 0]) {
      const tree = BusinessGrowthOverview({
        locale,
        events,
        venues: [{ id: "venue", name: "Venue", events, interactions: 7 }],
      });
      expect(
        elements(tree)
          .filter((n) => n.type === "strong")
          .map((n) => n.props.children),
      ).toContain(events === null ? "—" : 0);
    }
});

it("keeps aggregate interactions unknown with incomplete venues, preserving known per-venue analytics", () => {
  const tree = BusinessGrowthOverview({
    locale: "en",
    events: null,
    venuesUnavailable: true,
    venues: [
      { id: "known", name: "Known venue", events: null, interactions: 7 },
    ],
  });
  const strong = elements(tree)
    .filter((node) => node.type === "strong")
    .map((node) => node.props.children);
  expect(strong.filter((value) => value === "—")).toHaveLength(3);
  const strings = elements(tree)
    .flatMap((node) =>
      React.Children.toArray(node.props.children).filter(
        (child) => typeof child === "string",
      ),
    )
    .join(" ");
  expect(strings).toContain("7 recorded interactions");
});
